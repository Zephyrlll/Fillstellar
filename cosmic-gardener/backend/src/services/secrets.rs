use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;
use std::time::Duration;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecretsConfig {
    pub provider: SecretsProvider,
    pub aws_region: String,
    pub parameter_store_prefix: String,
    pub secrets_manager_prefix: String,
    pub cache_ttl_seconds: u64,
    pub refresh_interval_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum SecretsProvider {
    Environment,
    AwsParameterStore,
    AwsSecretsManager,
    Mixed,
}

impl Default for SecretsConfig {
    fn default() -> Self {
        Self {
            provider: SecretsProvider::Environment,
            aws_region: "us-east-1".to_string(),
            parameter_store_prefix: "/cosmic-gardener/".to_string(),
            secrets_manager_prefix: "cosmic-gardener/".to_string(),
            cache_ttl_seconds: 3600,
            refresh_interval_seconds: 300,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecretValue {
    pub value: String,
    pub version: Option<String>,
    pub last_updated: chrono::DateTime<chrono::Utc>,
    pub tags: HashMap<String, String>,
}

pub struct SecretsManager {
    config: SecretsConfig,
    cache: tokio::sync::RwLock<HashMap<String, SecretValue>>,
    last_refresh: tokio::sync::RwLock<chrono::DateTime<chrono::Utc>>,
}

impl SecretsManager {
    pub fn new(config: SecretsConfig) -> Self {
        Self {
            config,
            cache: tokio::sync::RwLock::new(HashMap::new()),
            last_refresh: tokio::sync::RwLock::new(chrono::Utc::now()),
        }
    }

    /// Get a secret value by key
    pub async fn get_secret(&self, key: &str) -> Result<String> {
        // Check cache first
        if let Some(cached_value) = self.get_cached_secret(key).await {
            return Ok(cached_value.value);
        }

        // Fetch from provider
        let secret_value = match self.config.provider {
            SecretsProvider::Environment => self.get_from_environment(key).await?,
            SecretsProvider::AwsParameterStore => self.get_from_parameter_store(key).await?,
            SecretsProvider::AwsSecretsManager => self.get_from_secrets_manager(key).await?,
            SecretsProvider::Mixed => self.get_from_mixed_sources(key).await?,
        };

        // Cache the result
        self.cache_secret(key, secret_value.clone()).await;

        Ok(secret_value.value)
    }

    /// Get a secret with a default value if not found
    pub async fn get_secret_or_default(&self, key: &str, default: &str) -> String {
        match self.get_secret(key).await {
            Ok(value) => value,
            Err(_) => {
                tracing::warn!("Secret '{}' not found, using default value", key);
                default.to_string()
            }
        }
    }

    /// Get multiple secrets at once
    pub async fn get_secrets(&self, keys: &[&str]) -> Result<HashMap<String, String>> {
        let mut results = HashMap::new();
        
        for key in keys {
            match self.get_secret(key).await {
                Ok(value) => {
                    results.insert(key.to_string(), value);
                }
                Err(e) => {
                    tracing::error!("Failed to get secret '{}': {}", key, e);
                    return Err(e);
                }
            }
        }
        
        Ok(results)
    }

    /// Refresh all cached secrets
    pub async fn refresh_secrets(&self) -> Result<()> {
        let now = chrono::Utc::now();
        let last_refresh = *self.last_refresh.read().await;
        
        if now.signed_duration_since(last_refresh).num_seconds() 
            < self.config.refresh_interval_seconds as i64 {
            return Ok(());
        }

        tracing::info!("Refreshing secrets cache...");
        
        // Clear cache
        self.cache.write().await.clear();
        
        // Update last refresh time
        *self.last_refresh.write().await = now;
        
        tracing::info!("Secrets cache refreshed successfully");
        
        Ok(())
    }

    /// Validate all required secrets are available
    pub async fn validate_secrets(&self, required_secrets: &[&str]) -> Result<()> {
        let mut missing_secrets = Vec::new();
        
        for secret in required_secrets {
            match self.get_secret(secret).await {
                Ok(_) => {}
                Err(_) => missing_secrets.push(*secret),
            }
        }
        
        if !missing_secrets.is_empty() {
            return Err(anyhow::anyhow!(
                "Missing required secrets: {:?}",
                missing_secrets
            ));
        }
        
        Ok(())
    }

    async fn get_cached_secret(&self, key: &str) -> Option<SecretValue> {
        let cache = self.cache.read().await;
        if let Some(secret) = cache.get(key) {
            let age = chrono::Utc::now().signed_duration_since(secret.last_updated);
            if age.num_seconds() < self.config.cache_ttl_seconds as i64 {
                return Some(secret.clone());
            }
        }
        None
    }

    async fn cache_secret(&self, key: &str, secret: SecretValue) {
        let mut cache = self.cache.write().await;
        cache.insert(key.to_string(), secret);
    }

    async fn get_from_environment(&self, key: &str) -> Result<SecretValue> {
        let value = env::var(key)
            .with_context(|| format!("Environment variable '{}' not found", key))?;
        
        Ok(SecretValue {
            value,
            version: None,
            last_updated: chrono::Utc::now(),
            tags: HashMap::new(),
        })
    }

    async fn get_from_parameter_store(&self, key: &str) -> Result<SecretValue> {
        #[cfg(feature = "aws")]
        {
            use aws_config::meta::region::RegionProviderChain;
            use aws_sdk_ssm::Client;
            
            let region_provider = RegionProviderChain::default_provider()
                .or_else(self.config.aws_region.clone());
            let aws_config = aws_config::from_env()
                .region(region_provider)
                .load()
                .await;
            let ssm_client = Client::new(&aws_config);
            
            let parameter_name = format!("{}{}", self.config.parameter_store_prefix, key);
            
            let response = ssm_client
                .get_parameter()
                .name(&parameter_name)
                .with_decryption(true)
                .send()
                .await
                .with_context(|| format!("Failed to get parameter '{}'", parameter_name))?;
            
            let parameter = response.parameter()
                .ok_or_else(|| anyhow::anyhow!("Parameter '{}' not found", parameter_name))?;
            
            let value = parameter.value()
                .ok_or_else(|| anyhow::anyhow!("Parameter '{}' has no value", parameter_name))?;
            
            Ok(SecretValue {
                value: value.to_string(),
                version: parameter.version().map(|v| v.to_string()),
                last_updated: chrono::Utc::now(),
                tags: HashMap::new(),
            })
        }
        
        #[cfg(not(feature = "aws"))]
        {
            // Fallback to environment variable
            self.get_from_environment(key).await
        }
    }

    async fn get_from_secrets_manager(&self, key: &str) -> Result<SecretValue> {
        #[cfg(feature = "aws")]
        {
            use aws_config::meta::region::RegionProviderChain;
            use aws_sdk_secretsmanager::Client;
            
            let region_provider = RegionProviderChain::default_provider()
                .or_else(self.config.aws_region.clone());
            let aws_config = aws_config::from_env()
                .region(region_provider)
                .load()
                .await;
            let secrets_client = Client::new(&aws_config);
            
            let secret_id = format!("{}{}", self.config.secrets_manager_prefix, key);
            
            let response = secrets_client
                .get_secret_value()
                .secret_id(&secret_id)
                .send()
                .await
                .with_context(|| format!("Failed to get secret '{}'", secret_id))?;
            
            let secret_string = response.secret_string()
                .ok_or_else(|| anyhow::anyhow!("Secret '{}' has no string value", secret_id))?;
            
            Ok(SecretValue {
                value: secret_string.to_string(),
                version: response.version_id().map(|v| v.to_string()),
                last_updated: chrono::Utc::now(),
                tags: HashMap::new(),
            })
        }
        
        #[cfg(not(feature = "aws"))]
        {
            // Fallback to environment variable
            self.get_from_environment(key).await
        }
    }

    async fn get_from_mixed_sources(&self, key: &str) -> Result<SecretValue> {
        // Try environment first
        if let Ok(value) = self.get_from_environment(key).await {
            return Ok(value);
        }
        
        // Try parameter store
        if let Ok(value) = self.get_from_parameter_store(key).await {
            return Ok(value);
        }
        
        // Try secrets manager
        self.get_from_secrets_manager(key).await
    }
}

/// Environment variable validation
pub struct EnvValidator {
    required_vars: Vec<String>,
    optional_vars: Vec<(String, String)>, // (key, default_value)
}

impl EnvValidator {
    pub fn new() -> Self {
        Self {
            required_vars: Vec::new(),
            optional_vars: Vec::new(),
        }
    }

    pub fn require(mut self, var: &str) -> Self {
        self.required_vars.push(var.to_string());
        self
    }

    pub fn optional(mut self, var: &str, default: &str) -> Self {
        self.optional_vars.push((var.to_string(), default.to_string()));
        self
    }

    pub fn validate(&self) -> Result<()> {
        let mut missing_vars = Vec::new();
        
        for var in &self.required_vars {
            if env::var(var).is_err() {
                missing_vars.push(var.clone());
            }
        }
        
        if !missing_vars.is_empty() {
            return Err(anyhow::anyhow!(
                "Missing required environment variables: {:?}",
                missing_vars
            ));
        }
        
        // Set default values for optional variables
        for (var, default_value) in &self.optional_vars {
            if env::var(var).is_err() {
                env::set_var(var, default_value);
                tracing::info!("Set default value for {}: {}", var, default_value);
            }
        }
        
        Ok(())
    }
}

/// Secure configuration loader
pub struct SecureConfigLoader {
    secrets_manager: SecretsManager,
    env_validator: EnvValidator,
}

impl SecureConfigLoader {
    pub fn new(secrets_config: SecretsConfig) -> Self {
        Self {
            secrets_manager: SecretsManager::new(secrets_config),
            env_validator: EnvValidator::new(),
        }
    }

    pub fn require_secret(mut self, key: &str) -> Self {
        self.env_validator = self.env_validator.require(key);
        self
    }

    pub fn optional_secret(mut self, key: &str, default: &str) -> Self {
        self.env_validator = self.env_validator.optional(key, default);
        self
    }

    pub async fn load_configuration(&self) -> Result<HashMap<String, String>> {
        // Validate environment variables
        self.env_validator.validate()?;
        
        // Get all required secrets
        let required_keys = self.env_validator.required_vars.iter()
            .map(|s| s.as_str())
            .collect::<Vec<_>>();
        
        let secrets = self.secrets_manager.get_secrets(&required_keys).await?;
        
        // Validate all secrets are available
        self.secrets_manager.validate_secrets(&required_keys).await?;
        
        tracing::info!("Secure configuration loaded successfully");
        
        Ok(secrets)
    }

    pub async fn refresh_configuration(&self) -> Result<()> {
        self.secrets_manager.refresh_secrets().await
    }
}

/// Production-ready configuration loading
pub async fn load_production_config() -> Result<HashMap<String, String>> {
    let secrets_config = SecretsConfig {
        provider: SecretsProvider::Mixed,
        aws_region: env::var("AWS_REGION").unwrap_or_else(|_| "us-east-1".to_string()),
        parameter_store_prefix: "/cosmic-gardener/".to_string(),
        secrets_manager_prefix: "cosmic-gardener/".to_string(),
        cache_ttl_seconds: 3600,
        refresh_interval_seconds: 300,
    };

    let loader = SecureConfigLoader::new(secrets_config)
        .require_secret("DATABASE_URL")
        .require_secret("JWT_SECRET")
        .require_secret("REDIS_URL")
        .optional_secret("LOG_LEVEL", "info")
        .optional_secret("METRICS_ENABLED", "true")
        .optional_secret("CACHE_ENABLED", "true");

    loader.load_configuration().await
}

/// Development configuration loading
pub async fn load_development_config() -> Result<HashMap<String, String>> {
    let secrets_config = SecretsConfig {
        provider: SecretsProvider::Environment,
        aws_region: "us-east-1".to_string(),
        parameter_store_prefix: "/cosmic-gardener/dev/".to_string(),
        secrets_manager_prefix: "cosmic-gardener/dev/".to_string(),
        cache_ttl_seconds: 300,
        refresh_interval_seconds: 60,
    };

    let loader = SecureConfigLoader::new(secrets_config)
        .require_secret("DATABASE_URL")
        .optional_secret("JWT_SECRET", "development-jwt-secret-key-32-chars-long")
        .optional_secret("REDIS_URL", "redis://localhost:6379")
        .optional_secret("LOG_LEVEL", "debug")
        .optional_secret("METRICS_ENABLED", "true")
        .optional_secret("CACHE_ENABLED", "true");

    loader.load_configuration().await
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    #[tokio::test]
    async fn test_environment_secrets_manager() {
        env::set_var("TEST_SECRET", "test_value");
        
        let config = SecretsConfig {
            provider: SecretsProvider::Environment,
            ..Default::default()
        };
        
        let manager = SecretsManager::new(config);
        let result = manager.get_secret("TEST_SECRET").await;
        
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "test_value");
        
        env::remove_var("TEST_SECRET");
    }

    #[tokio::test]
    async fn test_secret_caching() {
        env::set_var("CACHE_TEST", "cached_value");
        
        let config = SecretsConfig {
            provider: SecretsProvider::Environment,
            cache_ttl_seconds: 60,
            ..Default::default()
        };
        
        let manager = SecretsManager::new(config);
        
        // First call should cache the value
        let result1 = manager.get_secret("CACHE_TEST").await.unwrap();
        assert_eq!(result1, "cached_value");
        
        // Second call should use cache
        let result2 = manager.get_secret("CACHE_TEST").await.unwrap();
        assert_eq!(result2, "cached_value");
        
        env::remove_var("CACHE_TEST");
    }

    #[tokio::test]
    async fn test_env_validator() {
        env::set_var("REQUIRED_VAR", "required_value");
        
        let validator = EnvValidator::new()
            .require("REQUIRED_VAR")
            .optional("OPTIONAL_VAR", "default_value");
        
        let result = validator.validate();
        assert!(result.is_ok());
        
        assert_eq!(env::var("REQUIRED_VAR").unwrap(), "required_value");
        assert_eq!(env::var("OPTIONAL_VAR").unwrap(), "default_value");
        
        env::remove_var("REQUIRED_VAR");
        env::remove_var("OPTIONAL_VAR");
    }
}