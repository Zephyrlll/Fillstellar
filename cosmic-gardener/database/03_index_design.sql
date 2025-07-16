-- Cosmic Gardener インデックス設計
-- 
-- 設計方針:
-- - 頻繁なクエリパターンに最適化
-- - 空間検索用の特殊インデックス
-- - 部分インデックスによるストレージ効率化
-- - カバリングインデックスでI/O削減

-- =====================================================
-- 1. プレイヤー関連インデックス
-- =====================================================

-- ログイン処理の高速化
CREATE INDEX idx_players_email_active 
    ON players(email) 
    WHERE is_active = true;

CREATE INDEX idx_players_username_active 
    ON players(username) 
    WHERE is_active = true;

-- セッション検証の高速化
CREATE INDEX idx_player_sessions_token_active 
    ON player_sessions(session_token) 
    WHERE is_active = true;

CREATE INDEX idx_player_sessions_player_id_active 
    ON player_sessions(player_id, started_at DESC) 
    WHERE is_active = true;

-- チート検出用インデックス
CREATE INDEX idx_player_sessions_suspicious 
    ON player_sessions(player_id, suspicious_activity_score) 
    WHERE suspicious_activity_score > 0.5;

-- 統計情報の高速集計
CREATE INDEX idx_player_statistics_rankings 
    ON player_statistics(
        total_celestial_bodies_created DESC,
        highest_civilization_level DESC,
        total_play_time_seconds DESC
    );

-- =====================================================
-- 2. セーブデータ関連インデックス
-- =====================================================

-- アクティブセーブの高速検索
CREATE INDEX idx_game_saves_player_active 
    ON game_saves(player_id, updated_at DESC) 
    WHERE is_active = true;

-- セーブスロットの一意性保証（すでにUNIQUE制約で対応）
-- 追加インデックスは不要

-- リソース検索の最適化
CREATE INDEX idx_save_resources_save_type 
    ON save_resources(save_id, resource_type_id)
    INCLUDE (amount, generation_rate);

-- 研究進捗の検索
CREATE INDEX idx_save_research_incomplete 
    ON save_research(save_id) 
    WHERE is_completed = false;

CREATE INDEX idx_save_research_completed 
    ON save_research(save_id, completed_at DESC) 
    WHERE is_completed = true;

-- =====================================================
-- 3. 天体関連インデックス（最重要）
-- =====================================================

-- 空間検索用GiSTインデックス（PostGIS）
CREATE INDEX idx_celestial_bodies_position 
    ON celestial_bodies 
    USING GIST (position);

CREATE INDEX idx_celestial_bodies_velocity 
    ON celestial_bodies 
    USING GIST (velocity);

-- セーブごとの天体検索
CREATE INDEX idx_celestial_bodies_save_type 
    ON celestial_bodies(save_id, body_type)
    WHERE is_destroyed = false;

-- 親子関係の階層検索
CREATE INDEX idx_celestial_bodies_parent 
    ON celestial_bodies(parent_id, body_type)
    WHERE parent_id IS NOT NULL AND is_destroyed = false;

-- 質量による範囲検索（重力計算用）
CREATE INDEX idx_celestial_bodies_mass_active 
    ON celestial_bodies(save_id, mass DESC)
    WHERE is_destroyed = false;

-- 天体関係の双方向検索
CREATE INDEX idx_celestial_body_relations_body1 
    ON celestial_body_relations(body1_id, relation_type);

CREATE INDEX idx_celestial_body_relations_body2 
    ON celestial_body_relations(body2_id, relation_type);

-- イベント履歴の時系列検索
CREATE INDEX idx_celestial_body_events_time 
    ON celestial_body_events(celestial_body_id, occurred_at DESC);

CREATE INDEX idx_celestial_body_events_type 
    ON celestial_body_events(event_type, occurred_at DESC);

-- =====================================================
-- 4. 生命関連インデックス
-- =====================================================

-- 生命体の検索
CREATE INDEX idx_life_forms_stage 
    ON life_forms(life_stage, evolution_progress)
    WHERE life_stage != 'none';

CREATE INDEX idx_life_forms_intelligence 
    ON life_forms(intelligence_level DESC, technology_level DESC)
    WHERE intelligence_level > 0;

-- 進化履歴の追跡
CREATE INDEX idx_life_evolution_history_form 
    ON life_evolution_history(life_form_id, evolved_at DESC);

-- =====================================================
-- 5. イベントログインデックス
-- =====================================================

-- プレイヤーごとのイベント検索
CREATE INDEX idx_event_logs_player_time 
    ON event_logs(player_id, server_timestamp DESC)
    WHERE player_id IS NOT NULL;

-- イベントタイプ別検索
CREATE INDEX idx_event_logs_type_severity 
    ON event_logs(event_type, severity, server_timestamp DESC);

-- エラーログの高速検索
CREATE INDEX idx_event_logs_errors 
    ON event_logs(severity, server_timestamp DESC)
    WHERE severity IN ('error', 'critical');

-- JSONB内の特定フィールド検索（GINインデックス）
CREATE INDEX idx_event_logs_data 
    ON event_logs 
    USING GIN (event_data);

-- =====================================================
-- 6. マスターデータインデックス
-- =====================================================

-- コードによる検索（すでにUNIQUE制約で対応）
-- 追加インデックスは最小限に

-- ソート順の最適化
CREATE INDEX idx_resource_types_sort 
    ON resource_types(sort_order, id);

CREATE INDEX idx_research_types_sort 
    ON research_types(sort_order, id);

CREATE INDEX idx_achievement_types_sort 
    ON achievement_types(sort_order, id)
    WHERE hidden = false;

-- プレイヤー実績の検索
CREATE INDEX idx_player_achievements_player 
    ON player_achievements(player_id, unlocked_at DESC);

-- =====================================================
-- 7. 複合インデックス（高度な最適化）
-- =====================================================

-- セーブデータのメタ情報付き検索
CREATE INDEX idx_game_saves_with_metadata 
    ON game_saves(player_id, updated_at DESC)
    INCLUDE (save_name, celestial_body_count, play_time_seconds)
    WHERE is_active = true;

-- 天体の詳細情報付き空間検索
CREATE INDEX idx_celestial_bodies_spatial_details 
    ON celestial_bodies(save_id, body_type)
    INCLUDE (name, mass, radius, level)
    WHERE is_destroyed = false;

-- =====================================================
-- 8. 部分インデックス（ストレージ効率化）
-- =====================================================

-- アクティブプレイヤーのみ
CREATE INDEX idx_players_premium_active 
    ON players(is_premium, last_login_at DESC)
    WHERE is_active = true AND is_premium = true;

-- 進化した生命体のみ
CREATE INDEX idx_life_forms_evolved 
    ON life_forms(celestial_body_id, life_stage, intelligence_level DESC)
    WHERE life_stage NOT IN ('none', 'microbial');

-- =====================================================
-- 9. 関数インデックス
-- =====================================================

-- メールアドレスの大文字小文字を無視した検索
CREATE INDEX idx_players_email_lower 
    ON players(LOWER(email));

-- JSONB内の特定フィールドへの高速アクセス
CREATE INDEX idx_save_resources_cosmic_dust 
    ON save_resources(save_id, (amount))
    WHERE resource_type_id = 1; -- Cosmic Dust

-- =====================================================
-- 10. 統計情報の更新
-- =====================================================

-- 定期的な統計情報更新のためのコマンド
-- これらは定期メンテナンスで実行する

-- ANALYZE players;
-- ANALYZE game_saves;
-- ANALYZE celestial_bodies;
-- ANALYZE event_logs;

-- =====================================================
-- インデックスメンテナンス用ビュー
-- =====================================================

-- インデックス使用状況の監視
CREATE VIEW index_usage_stats AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 未使用インデックスの検出
CREATE VIEW unused_indexes AS
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelid NOT IN (
    SELECT conindid FROM pg_constraint WHERE contype IN ('p', 'u')
);

-- インデックスの断片化状況
CREATE VIEW index_bloat AS
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    ROUND(100 * (pg_relation_size(indexrelid) - pg_relation_size(indexrelid, 'fsm')) / 
          NULLIF(pg_relation_size(indexrelid), 0), 2) AS bloat_percent
FROM pg_stat_user_indexes
WHERE pg_relation_size(indexrelid) > 1024 * 1024 -- 1MB以上
ORDER BY pg_relation_size(indexrelid) DESC;