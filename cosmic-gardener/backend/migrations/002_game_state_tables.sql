-- Migration: Game State Tables for Server-Side Logic
-- Version: 002
-- Description: Create tables for game state persistence with differential saves

-- ゲームスナップショットテーブル
CREATE TABLE IF NOT EXISTS game_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    tick BIGINT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 圧縮データ
    data BYTEA NOT NULL,
    compression_type VARCHAR(50) NOT NULL DEFAULT 'Zstd',
    serialization_format VARCHAR(50) NOT NULL DEFAULT 'MessagePack',
    
    -- サイズ情報
    original_size INTEGER NOT NULL,
    compressed_size INTEGER NOT NULL,
    
    -- 整合性チェック
    checksum BIGINT NOT NULL,
    
    -- インデックス制約
    UNIQUE(player_id, tick),
    
    -- 外部キー
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 差分データテーブル
CREATE TABLE IF NOT EXISTS game_deltas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    from_tick BIGINT NOT NULL,
    to_tick BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 差分データ
    data BYTEA NOT NULL,
    compression_type VARCHAR(50) NOT NULL DEFAULT 'Zstd',
    serialization_format VARCHAR(50) NOT NULL DEFAULT 'MessagePack',
    
    -- サイズ情報
    original_size INTEGER NOT NULL,
    compressed_size INTEGER NOT NULL,
    
    -- 制約
    CHECK (to_tick > from_tick),
    
    -- 外部キー
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 天体データテーブル（検索用）
CREATE TABLE IF NOT EXISTS celestial_bodies (
    id UUID PRIMARY KEY,
    player_id UUID NOT NULL,
    body_type VARCHAR(50) NOT NULL,
    
    -- 物理データ
    position_x BIGINT NOT NULL,
    position_y BIGINT NOT NULL,
    position_z BIGINT NOT NULL,
    velocity_x BIGINT NOT NULL DEFAULT 0,
    velocity_y BIGINT NOT NULL DEFAULT 0,
    velocity_z BIGINT NOT NULL DEFAULT 0,
    mass BIGINT NOT NULL,
    radius BIGINT NOT NULL,
    
    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- リーダーボードテーブル
CREATE TABLE IF NOT EXISTS game_leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    
    -- スコア情報
    total_score BIGINT NOT NULL DEFAULT 0,
    cosmic_dust BIGINT NOT NULL DEFAULT 0,
    energy BIGINT NOT NULL DEFAULT 0,
    organic_matter BIGINT NOT NULL DEFAULT 0,
    biomass BIGINT NOT NULL DEFAULT 0,
    dark_matter BIGINT NOT NULL DEFAULT 0,
    thought_points BIGINT NOT NULL DEFAULT 0,
    
    -- 統計情報
    celestial_bodies_count INTEGER NOT NULL DEFAULT 0,
    stars_created INTEGER NOT NULL DEFAULT 0,
    planets_created INTEGER NOT NULL DEFAULT 0,
    life_forms_evolved INTEGER NOT NULL DEFAULT 0,
    
    -- 時間情報
    play_time_seconds BIGINT NOT NULL DEFAULT 0,
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 外部キー
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- アップグレードレベルテーブル
CREATE TABLE IF NOT EXISTS player_upgrades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    upgrade_type VARCHAR(50) NOT NULL,
    level INTEGER NOT NULL DEFAULT 0,
    
    -- 時間情報
    last_upgraded TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 制約
    UNIQUE(player_id, upgrade_type),
    CHECK (level >= 0),
    
    -- 外部キー
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 実績テーブル
CREATE TABLE IF NOT EXISTS player_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    achievement_id VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 制約
    UNIQUE(player_id, achievement_id),
    
    -- 外部キー
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- プレイヤー統計テーブル
CREATE TABLE IF NOT EXISTS player_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    
    -- 作成統計
    asteroids_created INTEGER NOT NULL DEFAULT 0,
    comets_created INTEGER NOT NULL DEFAULT 0,
    moons_created INTEGER NOT NULL DEFAULT 0,
    dwarf_planets_created INTEGER NOT NULL DEFAULT 0,
    planets_created INTEGER NOT NULL DEFAULT 0,
    stars_created INTEGER NOT NULL DEFAULT 0,
    black_holes_created INTEGER NOT NULL DEFAULT 0,
    
    -- 生命統計
    microbial_life_spawned INTEGER NOT NULL DEFAULT 0,
    plant_life_evolved INTEGER NOT NULL DEFAULT 0,
    animal_life_evolved INTEGER NOT NULL DEFAULT 0,
    intelligent_life_evolved INTEGER NOT NULL DEFAULT 0,
    
    -- リソース統計
    total_dust_collected BIGINT NOT NULL DEFAULT 0,
    total_energy_generated BIGINT NOT NULL DEFAULT 0,
    total_organic_matter_produced BIGINT NOT NULL DEFAULT 0,
    total_biomass_created BIGINT NOT NULL DEFAULT 0,
    total_dark_matter_collected BIGINT NOT NULL DEFAULT 0,
    total_thought_points_generated BIGINT NOT NULL DEFAULT 0,
    
    -- 時間統計
    total_play_time_seconds BIGINT NOT NULL DEFAULT 0,
    sessions_count INTEGER NOT NULL DEFAULT 0,
    last_session_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 更新時間
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- 制約
    UNIQUE(player_id),
    
    -- 外部キー
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_game_snapshots_player_tick ON game_snapshots(player_id, tick DESC);
CREATE INDEX IF NOT EXISTS idx_game_snapshots_timestamp ON game_snapshots(timestamp);
CREATE INDEX IF NOT EXISTS idx_game_deltas_player_ticks ON game_deltas(player_id, from_tick, to_tick);
CREATE INDEX IF NOT EXISTS idx_game_deltas_timestamp ON game_deltas(timestamp);
CREATE INDEX IF NOT EXISTS idx_celestial_bodies_player ON celestial_bodies(player_id);
CREATE INDEX IF NOT EXISTS idx_celestial_bodies_type ON celestial_bodies(body_type);
CREATE INDEX IF NOT EXISTS idx_celestial_bodies_position ON celestial_bodies(position_x, position_y, position_z);
CREATE INDEX IF NOT EXISTS idx_leaderboards_score ON game_leaderboards(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_dust ON game_leaderboards(cosmic_dust DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboards_energy ON game_leaderboards(energy DESC);
CREATE INDEX IF NOT EXISTS idx_player_upgrades_player_type ON player_upgrades(player_id, upgrade_type);
CREATE INDEX IF NOT EXISTS idx_player_achievements_player ON player_achievements(player_id);
CREATE INDEX IF NOT EXISTS idx_player_statistics_player ON player_statistics(player_id);

-- 空間インデックス（PostGIS使用時）
-- CREATE INDEX IF NOT EXISTS idx_celestial_bodies_spatial ON celestial_bodies USING GIST(ST_Point(position_x, position_y));

-- パーティション設定（必要に応じて）
-- ALTER TABLE game_snapshots PARTITION BY RANGE (timestamp);
-- ALTER TABLE game_deltas PARTITION BY RANGE (timestamp);

-- 自動削除トリガー（古いデータのクリーンアップ）
CREATE OR REPLACE FUNCTION cleanup_old_snapshots() RETURNS TRIGGER AS $$
BEGIN
    -- 30日以上古いスナップショットを削除
    DELETE FROM game_snapshots 
    WHERE timestamp < NOW() - INTERVAL '30 days'
    AND player_id = NEW.player_id;
    
    -- プレイヤーごとに最新の10個のスナップショットを保持
    DELETE FROM game_snapshots 
    WHERE player_id = NEW.player_id 
    AND tick NOT IN (
        SELECT tick FROM game_snapshots 
        WHERE player_id = NEW.player_id 
        ORDER BY tick DESC 
        LIMIT 10
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_snapshots
    AFTER INSERT ON game_snapshots
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_snapshots();

-- 差分データの自動削除
CREATE OR REPLACE FUNCTION cleanup_old_deltas() RETURNS TRIGGER AS $$
BEGIN
    -- 7日以上古い差分データを削除
    DELETE FROM game_deltas 
    WHERE timestamp < NOW() - INTERVAL '7 days'
    AND player_id = NEW.player_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_deltas
    AFTER INSERT ON game_deltas
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_old_deltas();

-- 統計情報の更新トリガー
CREATE OR REPLACE FUNCTION update_player_statistics() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- 天体作成時の統計更新
        INSERT INTO player_statistics (player_id) 
        VALUES (NEW.player_id)
        ON CONFLICT (player_id) DO NOTHING;
        
        -- 天体タイプに応じた統計更新
        CASE NEW.body_type
            WHEN 'Asteroid' THEN
                UPDATE player_statistics 
                SET asteroids_created = asteroids_created + 1,
                    updated_at = NOW()
                WHERE player_id = NEW.player_id;
            WHEN 'Comet' THEN
                UPDATE player_statistics 
                SET comets_created = comets_created + 1,
                    updated_at = NOW()
                WHERE player_id = NEW.player_id;
            WHEN 'Moon' THEN
                UPDATE player_statistics 
                SET moons_created = moons_created + 1,
                    updated_at = NOW()
                WHERE player_id = NEW.player_id;
            WHEN 'DwarfPlanet' THEN
                UPDATE player_statistics 
                SET dwarf_planets_created = dwarf_planets_created + 1,
                    updated_at = NOW()
                WHERE player_id = NEW.player_id;
            WHEN 'Planet' THEN
                UPDATE player_statistics 
                SET planets_created = planets_created + 1,
                    updated_at = NOW()
                WHERE player_id = NEW.player_id;
            WHEN 'Star' THEN
                UPDATE player_statistics 
                SET stars_created = stars_created + 1,
                    updated_at = NOW()
                WHERE player_id = NEW.player_id;
            WHEN 'BlackHole' THEN
                UPDATE player_statistics 
                SET black_holes_created = black_holes_created + 1,
                    updated_at = NOW()
                WHERE player_id = NEW.player_id;
        END CASE;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_statistics
    AFTER INSERT OR UPDATE ON celestial_bodies
    FOR EACH ROW
    EXECUTE FUNCTION update_player_statistics();

-- リーダーボードの更新関数
CREATE OR REPLACE FUNCTION update_leaderboard(p_player_id UUID, p_resources JSONB) RETURNS VOID AS $$
BEGIN
    INSERT INTO game_leaderboards (
        player_id, 
        cosmic_dust, 
        energy, 
        organic_matter, 
        biomass, 
        dark_matter, 
        thought_points,
        total_score,
        celestial_bodies_count,
        last_activity
    ) VALUES (
        p_player_id,
        (p_resources->>'cosmic_dust')::BIGINT,
        (p_resources->>'energy')::BIGINT,
        (p_resources->>'organic_matter')::BIGINT,
        (p_resources->>'biomass')::BIGINT,
        (p_resources->>'dark_matter')::BIGINT,
        (p_resources->>'thought_points')::BIGINT,
        -- 総スコア計算
        (p_resources->>'cosmic_dust')::BIGINT + 
        (p_resources->>'energy')::BIGINT * 2 +
        (p_resources->>'organic_matter')::BIGINT * 5 +
        (p_resources->>'biomass')::BIGINT * 10 +
        (p_resources->>'dark_matter')::BIGINT * 50 +
        (p_resources->>'thought_points')::BIGINT * 100,
        -- 天体数
        (SELECT COUNT(*) FROM celestial_bodies WHERE player_id = p_player_id),
        NOW()
    )
    ON CONFLICT (player_id) DO UPDATE SET
        cosmic_dust = EXCLUDED.cosmic_dust,
        energy = EXCLUDED.energy,
        organic_matter = EXCLUDED.organic_matter,
        biomass = EXCLUDED.biomass,
        dark_matter = EXCLUDED.dark_matter,
        thought_points = EXCLUDED.thought_points,
        total_score = EXCLUDED.total_score,
        celestial_bodies_count = EXCLUDED.celestial_bodies_count,
        last_activity = NOW();
END;
$$ LANGUAGE plpgsql;

-- バックアップ用ビュー
CREATE VIEW game_state_backup AS
SELECT 
    s.player_id,
    s.tick,
    s.timestamp,
    s.data,
    s.compression_type,
    s.serialization_format,
    s.checksum,
    u.username,
    u.email,
    COUNT(cb.id) as celestial_bodies_count,
    l.total_score
FROM game_snapshots s
JOIN users u ON s.player_id = u.id
LEFT JOIN celestial_bodies cb ON s.player_id = cb.player_id
LEFT JOIN game_leaderboards l ON s.player_id = l.player_id
GROUP BY s.player_id, s.tick, s.timestamp, s.data, s.compression_type, 
         s.serialization_format, s.checksum, u.username, u.email, l.total_score
ORDER BY s.timestamp DESC;

-- 性能分析用ビュー
CREATE VIEW performance_analytics AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as snapshots_per_hour,
    AVG(compressed_size) as avg_compressed_size,
    AVG(original_size) as avg_original_size,
    AVG(compressed_size::float / original_size::float) as avg_compression_ratio
FROM game_snapshots
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

-- 権限設定
GRANT SELECT, INSERT, UPDATE, DELETE ON game_snapshots TO cosmic_gardener_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_deltas TO cosmic_gardener_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON celestial_bodies TO cosmic_gardener_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON game_leaderboards TO cosmic_gardener_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON player_upgrades TO cosmic_gardener_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON player_achievements TO cosmic_gardener_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON player_statistics TO cosmic_gardener_app;
GRANT SELECT ON game_state_backup TO cosmic_gardener_app;
GRANT SELECT ON performance_analytics TO cosmic_gardener_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO cosmic_gardener_app;