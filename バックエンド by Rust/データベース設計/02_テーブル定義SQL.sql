-- Cosmic Gardener Database Schema
-- PostgreSQL 15+ with PostGIS extension required
-- 
-- 設計方針:
-- - UUID v7 を主キーに採用（時系列ソート可能）
-- - JSONB型で柔軟なデータ構造
-- - PostGISで3D空間データを管理
-- - パーティショニング対応設計

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Custom Types
CREATE TYPE celestial_body_type AS ENUM (
    'black_hole',
    'star',
    'planet',
    'moon',
    'asteroid',
    'comet',
    'dust_cloud'
);

CREATE TYPE life_stage AS ENUM (
    'none',
    'microbial',
    'plant',
    'animal',
    'intelligent'
);

CREATE TYPE event_severity AS ENUM (
    'trace',
    'debug',
    'info',
    'warning',
    'error',
    'critical'
);

-- =====================================================
-- 1. プレイヤー関連テーブル
-- =====================================================

-- プレイヤー基本情報
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    is_premium BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス用
    CONSTRAINT username_length CHECK (char_length(username) >= 3),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- プレイヤーセッション管理
CREATE TABLE player_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- チート検出用メトリクス
    actions_count INTEGER DEFAULT 0,
    suspicious_activity_score FLOAT DEFAULT 0.0,
    
    CONSTRAINT active_session_check CHECK (
        (is_active = true AND ended_at IS NULL) OR
        (is_active = false AND ended_at IS NOT NULL)
    )
);

-- プレイヤー統計情報
CREATE TABLE player_statistics (
    player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
    total_play_time_seconds BIGINT DEFAULT 0,
    total_celestial_bodies_created INTEGER DEFAULT 0,
    total_resources_collected JSONB DEFAULT '{}',
    total_research_completed INTEGER DEFAULT 0,
    highest_civilization_level INTEGER DEFAULT 0,
    largest_galaxy_size INTEGER DEFAULT 0,
    achievements_unlocked INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- パフォーマンスメトリクス
    average_fps FLOAT,
    average_tick_time_ms FLOAT
);

-- =====================================================
-- 2. セーブデータ関連テーブル
-- =====================================================

-- ゲームセーブ
CREATE TABLE game_saves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    save_name VARCHAR(100) NOT NULL,
    save_slot INTEGER NOT NULL CHECK (save_slot BETWEEN 1 AND 10),
    is_autosave BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    game_version VARCHAR(20) NOT NULL,
    play_time_seconds BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 圧縮されたゲーム状態（大きなデータ用）
    compressed_state BYTEA,
    compression_algorithm VARCHAR(20) DEFAULT 'zstd',
    
    UNIQUE(player_id, save_slot)
);

-- セーブメタデータ
CREATE TABLE save_metadata (
    save_id UUID PRIMARY KEY REFERENCES game_saves(id) ON DELETE CASCADE,
    celestial_body_count INTEGER DEFAULT 0,
    total_mass DOUBLE PRECISION DEFAULT 0,
    universe_age_seconds BIGINT DEFAULT 0,
    highest_tech_level INTEGER DEFAULT 0,
    
    -- スナップショット用サムネイル
    thumbnail_url VARCHAR(500),
    
    -- 統計サマリー
    statistics_summary JSONB DEFAULT '{}'
);

-- 保存されたリソース
CREATE TABLE save_resources (
    save_id UUID NOT NULL REFERENCES game_saves(id) ON DELETE CASCADE,
    resource_type_id INTEGER NOT NULL,
    amount NUMERIC(30, 6) DEFAULT 0,
    generation_rate NUMERIC(20, 6) DEFAULT 0,
    
    PRIMARY KEY (save_id, resource_type_id)
);

-- 保存された研究進捗
CREATE TABLE save_research (
    save_id UUID NOT NULL REFERENCES game_saves(id) ON DELETE CASCADE,
    research_type_id INTEGER NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    progress_percentage FLOAT DEFAULT 0.0 CHECK (progress_percentage BETWEEN 0 AND 100),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    PRIMARY KEY (save_id, research_type_id)
);

-- =====================================================
-- 3. 天体関連テーブル
-- =====================================================

-- 天体基本情報（大量データ対応）
CREATE TABLE celestial_bodies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    save_id UUID NOT NULL REFERENCES game_saves(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES celestial_bodies(id) ON DELETE CASCADE,
    body_type celestial_body_type NOT NULL,
    name VARCHAR(100),
    
    -- 3D位置情報（PostGIS）
    position GEOMETRY(PointZ, 4326) NOT NULL,
    velocity GEOMETRY(PointZ, 4326) NOT NULL,
    
    -- 物理パラメータ
    mass DOUBLE PRECISION NOT NULL CHECK (mass > 0),
    radius DOUBLE PRECISION NOT NULL CHECK (radius > 0),
    temperature DOUBLE PRECISION,
    rotation_speed DOUBLE PRECISION DEFAULT 0,
    
    -- ゲーム固有パラメータ
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    is_destroyed BOOLEAN DEFAULT false,
    
    -- メタデータ
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- カスタムプロパティ（拡張用）
    custom_properties JSONB DEFAULT '{}'
);

-- 天体間の関係（軌道、重力相互作用など）
CREATE TABLE celestial_body_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    body1_id UUID NOT NULL REFERENCES celestial_bodies(id) ON DELETE CASCADE,
    body2_id UUID NOT NULL REFERENCES celestial_bodies(id) ON DELETE CASCADE,
    relation_type VARCHAR(50) NOT NULL, -- 'orbit', 'gravitational_influence', etc.
    
    -- 関係の詳細パラメータ
    orbital_period DOUBLE PRECISION,
    orbital_eccentricity DOUBLE PRECISION,
    influence_strength DOUBLE PRECISION,
    
    CONSTRAINT different_bodies CHECK (body1_id != body2_id),
    UNIQUE(body1_id, body2_id, relation_type)
);

-- 天体イベント履歴
CREATE TABLE celestial_body_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    celestial_body_id UUID NOT NULL REFERENCES celestial_bodies(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 4. 生命関連テーブル
-- =====================================================

-- 生命体情報
CREATE TABLE life_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    celestial_body_id UUID NOT NULL REFERENCES celestial_bodies(id) ON DELETE CASCADE,
    life_stage life_stage NOT NULL DEFAULT 'none',
    population BIGINT DEFAULT 0,
    evolution_progress FLOAT DEFAULT 0.0 CHECK (evolution_progress BETWEEN 0 AND 100),
    
    -- 生命の特性
    intelligence_level INTEGER DEFAULT 0,
    technology_level INTEGER DEFAULT 0,
    culture_traits JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    evolved_at TIMESTAMPTZ,
    
    UNIQUE(celestial_body_id)
);

-- 生命進化履歴
CREATE TABLE life_evolution_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    life_form_id UUID NOT NULL REFERENCES life_forms(id) ON DELETE CASCADE,
    from_stage life_stage NOT NULL,
    to_stage life_stage NOT NULL,
    evolution_trigger VARCHAR(100),
    evolved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 進化時のスナップショット
    snapshot_data JSONB DEFAULT '{}'
);

-- =====================================================
-- 5. イベントログ（パーティション対応）
-- =====================================================

-- イベントログ親テーブル
CREATE TABLE event_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    player_id UUID REFERENCES players(id) ON DELETE SET NULL,
    save_id UUID REFERENCES game_saves(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL,
    severity event_severity DEFAULT 'info',
    
    -- イベント詳細
    event_data JSONB DEFAULT '{}',
    client_timestamp TIMESTAMPTZ,
    server_timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- パフォーマンス追跡
    processing_time_ms INTEGER,
    
    PRIMARY KEY (id, server_timestamp)
) PARTITION BY RANGE (server_timestamp);

-- 月次パーティション作成例
CREATE TABLE event_logs_2024_01 PARTITION OF event_logs
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- =====================================================
-- 6. マスターデータ
-- =====================================================

-- リソース種別マスタ
CREATE TABLE resource_types (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    color_hex VARCHAR(7),
    unlock_requirements JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0
);

-- 研究種別マスタ
CREATE TABLE research_types (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    cost_resources JSONB DEFAULT '{}',
    duration_seconds INTEGER DEFAULT 0,
    prerequisites INTEGER[] DEFAULT '{}',
    unlocks JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0
);

-- 実績種別マスタ
CREATE TABLE achievement_types (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    points INTEGER DEFAULT 0,
    icon_url VARCHAR(500),
    hidden BOOLEAN DEFAULT false,
    conditions JSONB DEFAULT '{}',
    sort_order INTEGER DEFAULT 0
);

-- プレイヤー実績
CREATE TABLE player_achievements (
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    achievement_type_id INTEGER NOT NULL REFERENCES achievement_types(id),
    unlocked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    progress_data JSONB DEFAULT '{}',
    
    PRIMARY KEY (player_id, achievement_type_id)
);

-- =====================================================
-- トリガー関数
-- =====================================================

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルにトリガーを適用
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_game_saves_updated_at BEFORE UPDATE ON game_saves
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_celestial_bodies_updated_at BEFORE UPDATE ON celestial_bodies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- イベントログパーティション自動作成関数
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    start_date date;
    end_date date;
    partition_name text;
BEGIN
    start_date := date_trunc('month', CURRENT_DATE);
    end_date := start_date + interval '1 month';
    partition_name := 'event_logs_' || to_char(start_date, 'YYYY_MM');
    
    -- パーティションが存在しない場合のみ作成
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = partition_name
    ) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF event_logs FOR VALUES FROM (%L) TO (%L)',
            partition_name, start_date, end_date
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 統計情報集計用マテリアライズドビュー
CREATE MATERIALIZED VIEW player_rankings AS
SELECT 
    p.id,
    p.display_name,
    ps.total_celestial_bodies_created,
    ps.highest_civilization_level,
    ps.total_play_time_seconds,
    COUNT(DISTINCT pa.achievement_type_id) as achievements_count,
    ROW_NUMBER() OVER (ORDER BY ps.total_celestial_bodies_created DESC) as celestial_rank,
    ROW_NUMBER() OVER (ORDER BY ps.highest_civilization_level DESC) as civilization_rank
FROM players p
JOIN player_statistics ps ON p.id = ps.player_id
LEFT JOIN player_achievements pa ON p.id = pa.player_id
WHERE p.is_active = true
GROUP BY p.id, p.display_name, ps.total_celestial_bodies_created, 
         ps.highest_civilization_level, ps.total_play_time_seconds;

-- マテリアライズドビューのインデックス
CREATE INDEX idx_player_rankings_celestial ON player_rankings(celestial_rank);
CREATE INDEX idx_player_rankings_civilization ON player_rankings(civilization_rank);