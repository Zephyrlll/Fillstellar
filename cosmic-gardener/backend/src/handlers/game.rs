use actix_web::{web, HttpResponse};
use chrono::Utc;
use sqlx::PgPool;
use validator::Validate;

use crate::error::{AppError, Result};
use crate::models::{
    GameSave, GameStatistics, SaveGameRequest, GameStateResponse,
    StatisticsResponse, AuthenticatedUser, Achievement,
};

pub async fn get_game_state(
    pool: web::Data<PgPool>,
    user: web::ReqData<AuthenticatedUser>,
    query: web::Query<GameStateQuery>,
) -> Result<HttpResponse> {
    let save_name = query.save_name.as_deref().unwrap_or("default");

    let game_save = sqlx::query_as!(
        GameSave,
        "SELECT * FROM game_saves WHERE user_id = $1 AND save_name = $2",
        user.id,
        save_name
    )
    .fetch_optional(pool.get_ref())
    .await?;

    match game_save {
        Some(save) => Ok(HttpResponse::Ok().json(GameStateResponse::from(save))),
        None => {
            // デフォルトのゲーム状態を返す
            let default_state = serde_json::json!({
                "version": "1.6-accumulator",
                "resources": {
                    "cosmicDust": 100,
                    "energy": 0,
                    "organicMatter": 0,
                    "biomass": 0,
                    "darkMatter": 0,
                    "thoughtPoints": 0
                },
                "celestialBodies": [],
                "research": {
                    "unlockedTechnologies": []
                },
                "statistics": {
                    "totalDustCollected": 0,
                    "totalStarsCreated": 0,
                    "totalPlanetsCreated": 0
                }
            });

            Ok(HttpResponse::Ok().json(GameStateResponse {
                save_name: save_name.to_string(),
                game_data: default_state,
                version: "1.6-accumulator".to_string(),
                last_saved: Utc::now(),
            }))
        }
    }
}

pub async fn save_game_state(
    pool: web::Data<PgPool>,
    user: web::ReqData<AuthenticatedUser>,
    save_data: web::Json<SaveGameRequest>,
) -> Result<HttpResponse> {
    // バリデーション
    save_data.validate()?;

    let save_name = save_data.save_name.as_deref().unwrap_or("default");

    // ゲーム状態の保存（UPSERT）
    let game_save = sqlx::query_as!(
        GameSave,
        r#"
        INSERT INTO game_saves (user_id, save_name, game_data, version, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, save_name)
        DO UPDATE SET 
            game_data = EXCLUDED.game_data,
            version = EXCLUDED.version,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, user_id, save_name, game_data, version, created_at, updated_at
        "#,
        user.id,
        save_name,
        save_data.game_data,
        save_data.version
    )
    .fetch_one(pool.get_ref())
    .await?;

    // 統計の更新（ゲームデータから抽出）
    if let Some(stats) = save_data.game_data.get("statistics") {
        update_statistics(&pool, user.id, stats).await?;
    }

    Ok(HttpResponse::Ok().json(GameStateResponse::from(game_save)))
}

pub async fn get_statistics(
    pool: web::Data<PgPool>,
    user: web::ReqData<AuthenticatedUser>,
) -> Result<HttpResponse> {
    let statistics = sqlx::query_as!(
        GameStatistics,
        "SELECT * FROM game_statistics WHERE user_id = $1",
        user.id
    )
    .fetch_optional(pool.get_ref())
    .await?;

    match statistics {
        Some(stats) => Ok(HttpResponse::Ok().json(StatisticsResponse::from(stats))),
        None => {
            // 統計データが存在しない場合は初期化
            let new_stats = sqlx::query_as!(
                GameStatistics,
                r#"
                INSERT INTO game_statistics (user_id)
                VALUES ($1)
                RETURNING id, user_id, total_play_time, total_dust_collected, 
                         total_stars_created, total_planets_created, highest_energy,
                         achievements, created_at, updated_at
                "#,
                user.id
            )
            .fetch_one(pool.get_ref())
            .await?;

            Ok(HttpResponse::Ok().json(StatisticsResponse::from(new_stats)))
        }
    }
}

pub async fn get_leaderboard(
    pool: web::Data<PgPool>,
    query: web::Query<LeaderboardQuery>,
) -> Result<HttpResponse> {
    let limit = query.limit.unwrap_or(10).min(100); // 最大100件
    let metric = query.metric.as_deref().unwrap_or("total_dust_collected");

    let leaderboard = match metric {
        "total_dust_collected" => {
            sqlx::query!(
                r#"
                SELECT u.username, gs.total_dust_collected as score
                FROM game_statistics gs
                JOIN users u ON gs.user_id = u.id
                WHERE u.is_active = true
                ORDER BY gs.total_dust_collected DESC
                LIMIT $1
                "#,
                limit as i64
            )
            .fetch_all(pool.get_ref())
            .await?
        }
        "total_stars_created" => {
            sqlx::query!(
                r#"
                SELECT u.username, gs.total_stars_created::bigint as score
                FROM game_statistics gs
                JOIN users u ON gs.user_id = u.id
                WHERE u.is_active = true
                ORDER BY gs.total_stars_created DESC
                LIMIT $1
                "#,
                limit as i64
            )
            .fetch_all(pool.get_ref())
            .await?
        }
        "highest_energy" => {
            sqlx::query!(
                r#"
                SELECT u.username, gs.highest_energy as score
                FROM game_statistics gs
                JOIN users u ON gs.user_id = u.id
                WHERE u.is_active = true
                ORDER BY gs.highest_energy DESC
                LIMIT $1
                "#,
                limit as i64
            )
            .fetch_all(pool.get_ref())
            .await?
        }
        _ => return Err(AppError::BadRequest("Invalid metric".to_string())),
    };

    let leaderboard_data: Vec<serde_json::Value> = leaderboard
        .into_iter()
        .enumerate()
        .map(|(index, record)| {
            serde_json::json!({
                "rank": index + 1,
                "username": record.username,
                "score": record.score.unwrap_or(0)
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "metric": metric,
        "leaderboard": leaderboard_data
    })))
}

// ヘルパー関数
async fn update_statistics(
    pool: &PgPool,
    user_id: uuid::Uuid,
    stats_data: &serde_json::Value,
) -> Result<()> {
    let total_dust = stats_data
        .get("totalDustCollected")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    
    let total_stars = stats_data
        .get("totalStarsCreated")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    
    let total_planets = stats_data
        .get("totalPlanetsCreated")
        .and_then(|v| v.as_i64())
        .unwrap_or(0) as i32;
    
    let play_time = stats_data
        .get("totalPlayTime")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);
    
    let highest_energy = stats_data
        .get("highestEnergy")
        .and_then(|v| v.as_i64())
        .unwrap_or(0);

    sqlx::query!(
        r#"
        UPDATE game_statistics 
        SET total_dust_collected = GREATEST(total_dust_collected, $1),
            total_stars_created = GREATEST(total_stars_created, $2),
            total_planets_created = GREATEST(total_planets_created, $3),
            total_play_time = GREATEST(total_play_time, $4),
            highest_energy = GREATEST(highest_energy, $5),
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $6
        "#,
        total_dust,
        total_stars,
        total_planets,
        play_time,
        highest_energy,
        user_id
    )
    .execute(pool)
    .await?;

    Ok(())
}

// クエリパラメータ用の構造体
use serde::Deserialize;

#[derive(Deserialize)]
pub struct GameStateQuery {
    pub save_name: Option<String>,
}

#[derive(Deserialize)]
pub struct LeaderboardQuery {
    pub metric: Option<String>,
    pub limit: Option<i32>,
}