use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use validator::Validate;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameSave {
    pub id: Uuid,
    pub user_id: Uuid,
    pub save_name: String,
    pub game_data: serde_json::Value,
    pub version: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Validate)]
pub struct SaveGameRequest {
    #[validate(length(
        min = 1,
        max = 100,
        message = "Save name must be between 1 and 100 characters"
    ))]
    pub save_name: Option<String>,
    
    pub game_data: serde_json::Value,
    
    #[validate(length(
        min = 1,
        max = 20,
        message = "Version must be between 1 and 20 characters"
    ))]
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameStateResponse {
    pub save_name: String,
    pub game_data: serde_json::Value,
    pub version: String,
    pub last_saved: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GameStatistics {
    pub id: Uuid,
    pub user_id: Uuid,
    pub total_play_time: i64,
    pub total_dust_collected: i64,
    pub total_stars_created: i32,
    pub total_planets_created: i32,
    pub highest_energy: i64,
    pub achievements: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StatisticsResponse {
    pub total_play_time: i64,
    pub total_dust_collected: i64,
    pub total_stars_created: i32,
    pub total_planets_created: i32,
    pub highest_energy: i64,
    pub achievements: Vec<Achievement>,
    pub last_updated: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Achievement {
    pub id: String,
    pub name: String,
    pub description: String,
    pub unlocked_at: Option<DateTime<Utc>>,
    pub progress: Option<f64>,
}

impl From<GameStatistics> for StatisticsResponse {
    fn from(stats: GameStatistics) -> Self {
        let achievements: Vec<Achievement> = serde_json::from_value(stats.achievements)
            .unwrap_or_default();
        
        Self {
            total_play_time: stats.total_play_time,
            total_dust_collected: stats.total_dust_collected,
            total_stars_created: stats.total_stars_created,
            total_planets_created: stats.total_planets_created,
            highest_energy: stats.highest_energy,
            achievements,
            last_updated: stats.updated_at,
        }
    }
}

impl From<GameSave> for GameStateResponse {
    fn from(save: GameSave) -> Self {
        Self {
            save_name: save.save_name,
            game_data: save.game_data,
            version: save.version,
            last_saved: save.updated_at,
        }
    }
}