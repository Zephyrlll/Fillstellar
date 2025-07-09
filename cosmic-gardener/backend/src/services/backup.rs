use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use tokio::process::Command;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupConfig {
    pub enabled: bool,
    pub backup_directory: String,
    pub retention_days: u32,
    pub interval_hours: u32,
    pub compression_enabled: bool,
    pub encryption_enabled: bool,
    pub s3_config: Option<S3Config>,
    pub notification_config: Option<NotificationConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct S3Config {
    pub bucket: String,
    pub region: String,
    pub prefix: String,
    pub access_key_id: Option<String>,
    pub secret_access_key: Option<String>,
    pub endpoint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NotificationConfig {
    pub slack_webhook: Option<String>,
    pub email_recipients: Vec<String>,
    pub sns_topic_arn: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupMetadata {
    pub id: Uuid,
    pub backup_type: BackupType,
    pub created_at: DateTime<Utc>,
    pub file_path: String,
    pub file_size: u64,
    pub checksum: String,
    pub compression_type: Option<String>,
    pub encryption_enabled: bool,
    pub environment: String,
    pub version: String,
    pub tags: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum BackupType {
    Database,
    Application,
    Configuration,
    Logs,
    Full,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreRequest {
    pub backup_id: Uuid,
    pub restore_type: RestoreType,
    pub target_environment: String,
    pub validate_before_restore: bool,
    pub create_pre_restore_backup: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum RestoreType {
    Complete,
    DatabaseOnly,
    ConfigurationOnly,
    Selective(Vec<String>),
}

pub struct BackupService {
    config: BackupConfig,
    metadata_store: Arc<tokio::sync::RwLock<HashMap<Uuid, BackupMetadata>>>,
}

impl BackupService {
    pub fn new(config: BackupConfig) -> Self {
        Self {
            config,
            metadata_store: Arc::new(tokio::sync::RwLock::new(HashMap::new())),
        }
    }

    /// Create a full backup
    pub async fn create_full_backup(&self) -> Result<BackupMetadata> {
        if !self.config.enabled {
            return Err(anyhow::anyhow!("Backup service is disabled"));
        }

        let backup_id = Uuid::new_v4();
        let timestamp = Utc::now();
        let backup_name = format!(
            "full_backup_{}_{}",
            timestamp.format("%Y%m%d_%H%M%S"),
            backup_id
        );

        tracing::info!("Starting full backup: {}", backup_name);

        // Create backup directory
        let backup_dir = PathBuf::from(&self.config.backup_directory)
            .join(&backup_name);
        fs::create_dir_all(&backup_dir).await?;

        // Backup database
        let db_backup_path = self.backup_database(&backup_dir).await?;
        
        // Backup application files
        let app_backup_path = self.backup_application_files(&backup_dir).await?;
        
        // Backup configuration
        let config_backup_path = self.backup_configuration(&backup_dir).await?;
        
        // Backup logs
        let logs_backup_path = self.backup_logs(&backup_dir).await?;

        // Create manifest file
        let manifest = self.create_backup_manifest(&backup_dir, &[
            db_backup_path,
            app_backup_path,
            config_backup_path,
            logs_backup_path,
        ]).await?;

        // Compress backup if enabled
        let final_backup_path = if self.config.compression_enabled {
            self.compress_backup(&backup_dir).await?
        } else {
            backup_dir
        };

        // Calculate checksum
        let checksum = self.calculate_checksum(&final_backup_path).await?;
        
        // Get file size
        let file_size = self.get_backup_size(&final_backup_path).await?;

        // Create metadata
        let metadata = BackupMetadata {
            id: backup_id,
            backup_type: BackupType::Full,
            created_at: timestamp,
            file_path: final_backup_path.to_string_lossy().to_string(),
            file_size,
            checksum,
            compression_type: if self.config.compression_enabled {
                Some("gzip".to_string())
            } else {
                None
            },
            encryption_enabled: self.config.encryption_enabled,
            environment: std::env::var("ENVIRONMENT").unwrap_or_else(|_| "unknown".to_string()),
            version: env!("CARGO_PKG_VERSION").to_string(),
            tags: HashMap::new(),
        };

        // Store metadata
        self.metadata_store.write().await.insert(backup_id, metadata.clone());

        // Upload to S3 if configured
        if let Some(s3_config) = &self.config.s3_config {
            self.upload_to_s3(&final_backup_path, s3_config, &metadata).await?;
        }

        // Send notification
        self.send_backup_notification(&metadata, "Full backup completed successfully").await?;

        tracing::info!("Full backup completed: {}", backup_name);
        Ok(metadata)
    }

    /// Create a database backup
    pub async fn create_database_backup(&self) -> Result<BackupMetadata> {
        let backup_id = Uuid::new_v4();
        let timestamp = Utc::now();
        let backup_name = format!(
            "db_backup_{}_{}",
            timestamp.format("%Y%m%d_%H%M%S"),
            backup_id
        );

        tracing::info!("Starting database backup: {}", backup_name);

        let backup_dir = PathBuf::from(&self.config.backup_directory)
            .join(&backup_name);
        fs::create_dir_all(&backup_dir).await?;

        let db_backup_path = self.backup_database(&backup_dir).await?;
        
        let final_backup_path = if self.config.compression_enabled {
            self.compress_file(&db_backup_path).await?
        } else {
            db_backup_path
        };

        let checksum = self.calculate_checksum(&final_backup_path).await?;
        let file_size = self.get_backup_size(&final_backup_path).await?;

        let metadata = BackupMetadata {
            id: backup_id,
            backup_type: BackupType::Database,
            created_at: timestamp,
            file_path: final_backup_path.to_string_lossy().to_string(),
            file_size,
            checksum,
            compression_type: if self.config.compression_enabled {
                Some("gzip".to_string())
            } else {
                None
            },
            encryption_enabled: self.config.encryption_enabled,
            environment: std::env::var("ENVIRONMENT").unwrap_or_else(|_| "unknown".to_string()),
            version: env!("CARGO_PKG_VERSION").to_string(),
            tags: HashMap::new(),
        };

        self.metadata_store.write().await.insert(backup_id, metadata.clone());

        tracing::info!("Database backup completed: {}", backup_name);
        Ok(metadata)
    }

    /// Restore from backup
    pub async fn restore_from_backup(&self, request: RestoreRequest) -> Result<()> {
        let metadata_store = self.metadata_store.read().await;
        let metadata = metadata_store.get(&request.backup_id)
            .ok_or_else(|| anyhow::anyhow!("Backup not found: {}", request.backup_id))?;

        tracing::info!("Starting restore from backup: {}", request.backup_id);

        // Create pre-restore backup if requested
        if request.create_pre_restore_backup {
            tracing::info!("Creating pre-restore backup...");
            self.create_full_backup().await?;
        }

        // Validate backup before restore
        if request.validate_before_restore {
            self.validate_backup(metadata).await?;
        }

        // Extract backup if compressed
        let backup_path = PathBuf::from(&metadata.file_path);
        let extracted_path = if metadata.compression_type.is_some() {
            self.decompress_backup(&backup_path).await?
        } else {
            backup_path
        };

        // Perform restore based on type
        match request.restore_type {
            RestoreType::Complete => {
                self.restore_complete(&extracted_path).await?;
            }
            RestoreType::DatabaseOnly => {
                self.restore_database(&extracted_path).await?;
            }
            RestoreType::ConfigurationOnly => {
                self.restore_configuration(&extracted_path).await?;
            }
            RestoreType::Selective(components) => {
                self.restore_selective(&extracted_path, &components).await?;
            }
        }

        // Send notification
        self.send_restore_notification(&request, "Restore completed successfully").await?;

        tracing::info!("Restore completed successfully: {}", request.backup_id);
        Ok(())
    }

    /// List available backups
    pub async fn list_backups(&self) -> Vec<BackupMetadata> {
        let metadata_store = self.metadata_store.read().await;
        let mut backups: Vec<BackupMetadata> = metadata_store.values().cloned().collect();
        backups.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        backups
    }

    /// Delete old backups based on retention policy
    pub async fn cleanup_old_backups(&self) -> Result<()> {
        let cutoff_date = Utc::now() - chrono::Duration::days(self.config.retention_days as i64);
        let metadata_store = self.metadata_store.read().await;
        let mut to_delete = Vec::new();

        for (id, metadata) in metadata_store.iter() {
            if metadata.created_at < cutoff_date {
                to_delete.push(*id);
            }
        }

        drop(metadata_store);

        for backup_id in to_delete {
            self.delete_backup(backup_id).await?;
        }

        Ok(())
    }

    /// Delete a specific backup
    pub async fn delete_backup(&self, backup_id: Uuid) -> Result<()> {
        let mut metadata_store = self.metadata_store.write().await;
        let metadata = metadata_store.remove(&backup_id)
            .ok_or_else(|| anyhow::anyhow!("Backup not found: {}", backup_id))?;

        // Delete local file
        let backup_path = PathBuf::from(&metadata.file_path);
        if backup_path.exists() {
            if backup_path.is_dir() {
                fs::remove_dir_all(&backup_path).await?;
            } else {
                fs::remove_file(&backup_path).await?;
            }
        }

        // Delete from S3 if configured
        if let Some(s3_config) = &self.config.s3_config {
            self.delete_from_s3(s3_config, &metadata).await?;
        }

        tracing::info!("Backup deleted: {}", backup_id);
        Ok(())
    }

    /// Validate backup integrity
    pub async fn validate_backup(&self, metadata: &BackupMetadata) -> Result<()> {
        let backup_path = PathBuf::from(&metadata.file_path);
        
        // Check if file exists
        if !backup_path.exists() {
            return Err(anyhow::anyhow!("Backup file not found: {}", metadata.file_path));
        }

        // Verify checksum
        let current_checksum = self.calculate_checksum(&backup_path).await?;
        if current_checksum != metadata.checksum {
            return Err(anyhow::anyhow!("Backup checksum mismatch"));
        }

        // Additional validation based on backup type
        match metadata.backup_type {
            BackupType::Database => {
                self.validate_database_backup(&backup_path).await?;
            }
            BackupType::Full => {
                self.validate_full_backup(&backup_path).await?;
            }
            _ => {}
        }

        Ok(())
    }

    // Private helper methods

    async fn backup_database(&self, backup_dir: &Path) -> Result<PathBuf> {
        let db_backup_path = backup_dir.join("database.sql");
        let database_url = std::env::var("DATABASE_URL")
            .context("DATABASE_URL environment variable not set")?;

        // Extract database name from URL
        let url_parts: Vec<&str> = database_url.split('/').collect();
        let db_name = url_parts.last().unwrap_or("cosmic_gardener");

        // Create database dump
        let output = Command::new("pg_dump")
            .arg(&database_url)
            .arg("--no-password")
            .arg("--verbose")
            .arg("--format=custom")
            .arg("--file")
            .arg(&db_backup_path)
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!(
                "Database backup failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        Ok(db_backup_path)
    }

    async fn backup_application_files(&self, backup_dir: &Path) -> Result<PathBuf> {
        let app_backup_path = backup_dir.join("application.tar");
        
        // List of application files to backup
        let app_files = vec![
            "/app/config",
            "/app/logs",
            "/app/data",
        ];

        let output = Command::new("tar")
            .arg("-czf")
            .arg(&app_backup_path)
            .args(&app_files)
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!(
                "Application backup failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        Ok(app_backup_path)
    }

    async fn backup_configuration(&self, backup_dir: &Path) -> Result<PathBuf> {
        let config_backup_path = backup_dir.join("configuration.tar");
        
        let config_files = vec![
            "/app/config",
            "/etc/nginx/sites-available/cosmic-gardener",
            "/opt/cosmic-gardener/.env",
        ];

        let output = Command::new("tar")
            .arg("-czf")
            .arg(&config_backup_path)
            .args(&config_files)
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!(
                "Configuration backup failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        Ok(config_backup_path)
    }

    async fn backup_logs(&self, backup_dir: &Path) -> Result<PathBuf> {
        let logs_backup_path = backup_dir.join("logs.tar");
        
        let output = Command::new("tar")
            .arg("-czf")
            .arg(&logs_backup_path)
            .arg("/app/logs")
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!(
                "Logs backup failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        Ok(logs_backup_path)
    }

    async fn create_backup_manifest(&self, backup_dir: &Path, files: &[PathBuf]) -> Result<PathBuf> {
        let manifest_path = backup_dir.join("manifest.json");
        
        let manifest = serde_json::json!({
            "backup_id": Uuid::new_v4(),
            "created_at": Utc::now(),
            "files": files.iter().map(|f| f.to_string_lossy().to_string()).collect::<Vec<_>>(),
            "environment": std::env::var("ENVIRONMENT").unwrap_or_else(|_| "unknown".to_string()),
            "version": env!("CARGO_PKG_VERSION")
        });

        fs::write(&manifest_path, serde_json::to_string_pretty(&manifest)?).await?;
        Ok(manifest_path)
    }

    async fn compress_backup(&self, backup_dir: &Path) -> Result<PathBuf> {
        let compressed_path = backup_dir.with_extension("tar.gz");
        
        let output = Command::new("tar")
            .arg("-czf")
            .arg(&compressed_path)
            .arg("-C")
            .arg(backup_dir.parent().unwrap())
            .arg(backup_dir.file_name().unwrap())
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!(
                "Backup compression failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        // Remove original directory
        fs::remove_dir_all(backup_dir).await?;

        Ok(compressed_path)
    }

    async fn compress_file(&self, file_path: &Path) -> Result<PathBuf> {
        let compressed_path = file_path.with_extension("gz");
        
        let output = Command::new("gzip")
            .arg("-c")
            .arg(file_path)
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("File compression failed"));
        }

        fs::write(&compressed_path, &output.stdout).await?;
        Ok(compressed_path)
    }

    async fn decompress_backup(&self, backup_path: &Path) -> Result<PathBuf> {
        let extracted_dir = backup_path.with_extension("");
        
        let output = Command::new("tar")
            .arg("-xzf")
            .arg(backup_path)
            .arg("-C")
            .arg(extracted_dir.parent().unwrap())
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("Backup decompression failed"));
        }

        Ok(extracted_dir)
    }

    async fn calculate_checksum(&self, path: &Path) -> Result<String> {
        let output = Command::new("sha256sum")
            .arg(path)
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("Checksum calculation failed"));
        }

        let checksum_output = String::from_utf8(output.stdout)?;
        let checksum = checksum_output.split_whitespace().next().unwrap_or("");
        Ok(checksum.to_string())
    }

    async fn get_backup_size(&self, path: &Path) -> Result<u64> {
        let metadata = fs::metadata(path).await?;
        Ok(metadata.len())
    }

    async fn upload_to_s3(&self, backup_path: &Path, s3_config: &S3Config, metadata: &BackupMetadata) -> Result<()> {
        // S3 upload implementation would go here
        // For now, just log the action
        tracing::info!("Uploading backup to S3: {}/{}", s3_config.bucket, s3_config.prefix);
        Ok(())
    }

    async fn delete_from_s3(&self, s3_config: &S3Config, metadata: &BackupMetadata) -> Result<()> {
        // S3 delete implementation would go here
        tracing::info!("Deleting backup from S3: {}", metadata.id);
        Ok(())
    }

    async fn restore_complete(&self, backup_path: &Path) -> Result<()> {
        self.restore_database(backup_path).await?;
        self.restore_configuration(backup_path).await?;
        Ok(())
    }

    async fn restore_database(&self, backup_path: &Path) -> Result<()> {
        let db_backup_path = backup_path.join("database.sql");
        let database_url = std::env::var("DATABASE_URL")
            .context("DATABASE_URL environment variable not set")?;

        let output = Command::new("pg_restore")
            .arg("--clean")
            .arg("--if-exists")
            .arg("--verbose")
            .arg("--dbname")
            .arg(&database_url)
            .arg(&db_backup_path)
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!(
                "Database restore failed: {}",
                String::from_utf8_lossy(&output.stderr)
            ));
        }

        Ok(())
    }

    async fn restore_configuration(&self, backup_path: &Path) -> Result<()> {
        let config_backup_path = backup_path.join("configuration.tar");
        
        let output = Command::new("tar")
            .arg("-xzf")
            .arg(&config_backup_path)
            .arg("-C")
            .arg("/")
            .output()
            .await?;

        if !output.status.success() {
            return Err(anyhow::anyhow!("Configuration restore failed"));
        }

        Ok(())
    }

    async fn restore_selective(&self, backup_path: &Path, components: &[String]) -> Result<()> {
        for component in components {
            match component.as_str() {
                "database" => self.restore_database(backup_path).await?,
                "configuration" => self.restore_configuration(backup_path).await?,
                _ => {
                    tracing::warn!("Unknown component for selective restore: {}", component);
                }
            }
        }
        Ok(())
    }

    async fn validate_database_backup(&self, backup_path: &Path) -> Result<()> {
        // Validate database backup file
        let db_backup_path = backup_path.join("database.sql");
        if !db_backup_path.exists() {
            return Err(anyhow::anyhow!("Database backup file not found"));
        }
        Ok(())
    }

    async fn validate_full_backup(&self, backup_path: &Path) -> Result<()> {
        // Validate full backup structure
        let manifest_path = backup_path.join("manifest.json");
        if !manifest_path.exists() {
            return Err(anyhow::anyhow!("Backup manifest not found"));
        }
        Ok(())
    }

    async fn send_backup_notification(&self, metadata: &BackupMetadata, message: &str) -> Result<()> {
        if let Some(notification_config) = &self.config.notification_config {
            if let Some(webhook) = &notification_config.slack_webhook {
                let payload = serde_json::json!({
                    "text": message,
                    "attachments": [{
                        "color": "good",
                        "fields": [
                            {"title": "Backup ID", "value": metadata.id.to_string(), "short": true},
                            {"title": "Type", "value": format!("{:?}", metadata.backup_type), "short": true},
                            {"title": "Size", "value": format!("{} bytes", metadata.file_size), "short": true},
                            {"title": "Environment", "value": &metadata.environment, "short": true}
                        ]
                    }]
                });

                let client = reqwest::Client::new();
                client.post(webhook)
                    .json(&payload)
                    .send()
                    .await?;
            }
        }
        Ok(())
    }

    async fn send_restore_notification(&self, request: &RestoreRequest, message: &str) -> Result<()> {
        if let Some(notification_config) = &self.config.notification_config {
            if let Some(webhook) = &notification_config.slack_webhook {
                let payload = serde_json::json!({
                    "text": message,
                    "attachments": [{
                        "color": "warning",
                        "fields": [
                            {"title": "Backup ID", "value": request.backup_id.to_string(), "short": true},
                            {"title": "Restore Type", "value": format!("{:?}", request.restore_type), "short": true},
                            {"title": "Target Environment", "value": &request.target_environment, "short": true}
                        ]
                    }]
                });

                let client = reqwest::Client::new();
                client.post(webhook)
                    .json(&payload)
                    .send()
                    .await?;
            }
        }
        Ok(())
    }
}

impl Default for BackupConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            backup_directory: "/opt/cosmic-gardener/backups".to_string(),
            retention_days: 7,
            interval_hours: 6,
            compression_enabled: true,
            encryption_enabled: false,
            s3_config: None,
            notification_config: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_backup_service_creation() {
        let config = BackupConfig::default();
        let service = BackupService::new(config);
        
        let backups = service.list_backups().await;
        assert!(backups.is_empty());
    }

    #[tokio::test]
    async fn test_backup_metadata() {
        let metadata = BackupMetadata {
            id: Uuid::new_v4(),
            backup_type: BackupType::Database,
            created_at: Utc::now(),
            file_path: "/tmp/test.sql".to_string(),
            file_size: 1024,
            checksum: "abc123".to_string(),
            compression_type: Some("gzip".to_string()),
            encryption_enabled: false,
            environment: "test".to_string(),
            version: "1.0.0".to_string(),
            tags: HashMap::new(),
        };

        assert_eq!(metadata.file_size, 1024);
        assert_eq!(metadata.environment, "test");
    }
}