-- ===============================================
-- Development Test Data Seeds
-- ===============================================

-- 開発用テストプレイヤー
INSERT INTO players (id, username, email, password_hash, display_name, is_active, created_at) VALUES
('01234567-89ab-cdef-0123-456789abcdef', 'dev_player', 'dev@cosmic-gardener.com', '$2b$12$LQv3c1yqBwEHFVd8x8fYUOCKZV8XjH4DzMcfFFJ7OB/MQGz8NXzjy', 'Development Player', true, NOW()),
('11234567-89ab-cdef-0123-456789abcdef', 'test_user1', 'test1@cosmic-gardener.com', '$2b$12$LQv3c1yqBwEHFVd8x8fYUOCKZV8XjH4DzMcfFFJ7OB/MQGz8NXzjy', 'Test User 1', true, NOW()),
('21234567-89ab-cdef-0123-456789abcdef', 'test_user2', 'test2@cosmic-gardener.com', '$2b$12$LQv3c1yqBwEHFVd8x8fYUOCKZV8XjH4DzMcfFFJ7OB/MQGz8NXzjy', 'Test User 2', true, NOW());

-- 開発用プレイヤー統計
INSERT INTO player_statistics (player_id, total_play_time_seconds, total_celestial_bodies_created, total_resources_collected, total_research_completed, highest_civilization_level, achievements_unlocked) VALUES
('01234567-89ab-cdef-0123-456789abcdef', 7200, 25, '{"cosmic_dust": 50000, "energy": 25000, "organic_matter": 10000}', 5, 3, 8),
('11234567-89ab-cdef-0123-456789abcdef', 3600, 10, '{"cosmic_dust": 10000, "energy": 5000}', 2, 1, 3),
('21234567-89ab-cdef-0123-456789abcdef', 1800, 5, '{"cosmic_dust": 5000, "energy": 2500}', 1, 0, 1);

-- 開発用ゲームセーブ
INSERT INTO game_saves (id, player_id, save_name, save_slot, is_active, game_version, play_time_seconds, created_at, updated_at) VALUES
('a1234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', 'Development Galaxy', 1, true, '1.0.0', 7200, NOW(), NOW()),
('b1234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', 'Test Solar System', 2, false, '1.0.0', 3600, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('c1234567-89ab-cdef-0123-456789abcdef', '11234567-89ab-cdef-0123-456789abcdef', 'Beginner Save', 1, true, '1.0.0', 3600, NOW(), NOW());

-- セーブメタデータ
INSERT INTO save_metadata (save_id, celestial_body_count, total_mass, universe_age_seconds, highest_tech_level, statistics_summary) VALUES
('a1234567-89ab-cdef-0123-456789abcdef', 25, 5.972e24, 7200, 3, '{"stars": 3, "planets": 15, "moons": 7, "life_bearing_worlds": 8}'),
('b1234567-89ab-cdef-0123-456789abcdef', 8, 1.989e30, 3600, 2, '{"stars": 1, "planets": 5, "moons": 2, "life_bearing_worlds": 2}'),
('c1234567-89ab-cdef-0123-456789abcdef', 5, 1.989e30, 3600, 1, '{"stars": 1, "planets": 3, "moons": 1, "life_bearing_worlds": 1}');

-- 開発用セーブのリソース
INSERT INTO save_resources (save_id, resource_type_id, amount, generation_rate) VALUES
-- Development Galaxy (豊富なリソース)
('a1234567-89ab-cdef-0123-456789abcdef', 1, 100000.0, 150.5),  -- Cosmic Dust
('a1234567-89ab-cdef-0123-456789abcdef', 2, 50000.0, 85.2),    -- Energy
('a1234567-89ab-cdef-0123-456789abcdef', 3, 25000.0, 45.8),    -- Organic Matter
('a1234567-89ab-cdef-0123-456789abcdef', 4, 12000.0, 25.3),    -- Biomass
('a1234567-89ab-cdef-0123-456789abcdef', 5, 5000.0, 12.7),     -- Dark Matter
('a1234567-89ab-cdef-0123-456789abcdef', 6, 2500.0, 8.4),      -- Thought Points

-- Test Solar System (中程度のリソース)
('b1234567-89ab-cdef-0123-456789abcdef', 1, 20000.0, 50.0),
('b1234567-89ab-cdef-0123-456789abcdef', 2, 10000.0, 25.0),
('b1234567-89ab-cdef-0123-456789abcdef', 3, 5000.0, 12.0),
('b1234567-89ab-cdef-0123-456789abcdef', 4, 2000.0, 5.0),

-- Beginner Save (基本的なリソース)
('c1234567-89ab-cdef-0123-456789abcdef', 1, 5000.0, 15.0),
('c1234567-89ab-cdef-0123-456789abcdef', 2, 2500.0, 8.0),
('c1234567-89ab-cdef-0123-456789abcdef', 3, 1000.0, 3.0);

-- 開発用研究進捗
INSERT INTO save_research (save_id, research_type_id, is_completed, progress_percentage, completed_at) VALUES
-- Development Galaxy (進んだ研究)
('a1234567-89ab-cdef-0123-456789abcdef', 1, true, 100.0, NOW() - INTERVAL '2 hours'),
('a1234567-89ab-cdef-0123-456789abcdef', 2, true, 100.0, NOW() - INTERVAL '1.5 hours'),
('a1234567-89ab-cdef-0123-456789abcdef', 3, true, 100.0, NOW() - INTERVAL '1 hour'),
('a1234567-89ab-cdef-0123-456789abcdef', 4, true, 100.0, NOW() - INTERVAL '30 minutes'),
('a1234567-89ab-cdef-0123-456789abcdef', 5, false, 75.0, NULL),

-- Test Solar System (基礎研究)
('b1234567-89ab-cdef-0123-456789abcdef', 1, true, 100.0, NOW() - INTERVAL '1 hour'),
('b1234567-89ab-cdef-0123-456789abcdef', 2, false, 60.0, NULL),

-- Beginner Save (初期段階)
('c1234567-89ab-cdef-0123-456789abcdef', 1, false, 25.0, NULL);

-- 開発用天体データ
INSERT INTO celestial_bodies (id, save_id, parent_id, body_type, name, position, velocity, mass, radius, temperature, level, experience_points, created_at, updated_at) VALUES
-- Development Galaxy の天体
-- 中心星
('f1234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', NULL, 'star', 'Helios Prime', 'SRID=4326;POINTZ(0 0 0)', 'SRID=4326;POINTZ(0 0 0)', 1.989e30, 696340000, 5778, 5, 50000, NOW() - INTERVAL '2 hours', NOW()),

-- 惑星群
('f2234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 'f1234567-89ab-cdef-0123-456789abcdef', 'planet', 'Terra Nova', 'SRID=4326;POINTZ(149597870700 0 0)', 'SRID=4326;POINTZ(0 29780 0)', 5.972e24, 6371000, 288, 3, 15000, NOW() - INTERVAL '1.8 hours', NOW()),
('f3234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 'f1234567-89ab-cdef-0123-456789abcdef', 'planet', 'Aquarius', 'SRID=4326;POINTZ(227939366000 0 0)', 'SRID=4326;POINTZ(0 24077 0)', 6.39e23, 3389500, 210, 2, 8000, NOW() - INTERVAL '1.5 hours', NOW()),
('f4234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 'f1234567-89ab-cdef-0123-456789abcdef', 'planet', 'Gaia', 'SRID=4326;POINTZ(778299000000 0 0)', 'SRID=4326;POINTZ(0 13070 0)', 1.898e27, 69911000, 165, 4, 25000, NOW() - INTERVAL '1.2 hours', NOW()),

-- 衛星
('f5234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 'f2234567-89ab-cdef-0123-456789abcdef', 'moon', 'Luna', 'SRID=4326;POINTZ(149598254700 0 0)', 'SRID=4326;POINTZ(0 30802 0)', 7.342e22, 1737400, 250, 2, 5000, NOW() - INTERVAL '1 hour', NOW()),
('f6234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 'f4234567-89ab-cdef-0123-456789abcdef', 'moon', 'Europa', 'SRID=4326;POINTZ(778969800000 0 0)', 'SRID=4326;POINTZ(0 13740 0)', 4.8e22, 1560800, 102, 3, 12000, NOW() - INTERVAL '45 minutes', NOW()),

-- 小天体
('f7234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', NULL, 'asteroid', 'Ceres Alpha', 'SRID=4326;POINTZ(413690250000 0 0)', 'SRID=4326;POINTZ(0 17882 0)', 9.39e20, 473000, 168, 1, 1000, NOW() - INTERVAL '30 minutes', NOW()),

-- Test Solar System の天体（より小規模）
('g1234567-89ab-cdef-0123-456789abcdef', 'b1234567-89ab-cdef-0123-456789abcdef', NULL, 'star', 'Sol Minor', 'SRID=4326;POINTZ(0 0 0)', 'SRID=4326;POINTZ(0 0 0)', 1.5e30, 650000000, 5500, 2, 8000, NOW() - INTERVAL '1 hour', NOW()),
('g2234567-89ab-cdef-0123-456789abcdef', 'b1234567-89ab-cdef-0123-456789abcdef', 'g1234567-89ab-cdef-0123-456789abcdef', 'planet', 'Test World', 'SRID=4326;POINTZ(150000000000 0 0)', 'SRID=4326;POINTZ(0 30000 0)', 4e24, 6000000, 280, 2, 5000, NOW() - INTERVAL '45 minutes', NOW()),

-- Beginner Save の天体（最小構成）
('h1234567-89ab-cdef-0123-456789abcdef', 'c1234567-89ab-cdef-0123-456789abcdef', NULL, 'star', 'First Star', 'SRID=4326;POINTZ(0 0 0)', 'SRID=4326;POINTZ(0 0 0)', 1e30, 600000000, 5000, 1, 1000, NOW() - INTERVAL '30 minutes', NOW());

-- 開発用生命体データ
INSERT INTO life_forms (id, celestial_body_id, life_stage, population, evolution_progress, intelligence_level, technology_level, created_at, evolved_at) VALUES
('l1234567-89ab-cdef-0123-456789abcdef', 'f2234567-89ab-cdef-0123-456789abcdef', 'intelligent', 8500000000, 95.0, 8, 6, NOW() - INTERVAL '1 hour', NOW() - INTERVAL '30 minutes'),
('l2234567-89ab-cdef-0123-456789abcdef', 'f3234567-89ab-cdef-0123-456789abcdef', 'animal', 1200000, 60.0, 3, 0, NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '20 minutes'),
('l3234567-89ab-cdef-0123-456789abcdef', 'f6234567-89ab-cdef-0123-456789abcdef', 'microbial', 500000000000, 30.0, 0, 0, NOW() - INTERVAL '30 minutes', NULL),
('l4234567-89ab-cdef-0123-456789abcdef', 'g2234567-89ab-cdef-0123-456789abcdef', 'plant', 45000000, 40.0, 1, 0, NOW() - INTERVAL '20 minutes', NOW() - INTERVAL '10 minutes');

-- 生命進化履歴
INSERT INTO life_evolution_history (id, life_form_id, from_stage, to_stage, evolution_trigger, evolved_at, snapshot_data) VALUES
('e1234567-89ab-cdef-0123-456789abcdef', 'l1234567-89ab-cdef-0123-456789abcdef', 'animal', 'intelligent', 'environmental_pressure', NOW() - INTERVAL '30 minutes', '{"population_before": 2000000, "trigger_events": ["climate_change", "resource_scarcity"]}'),
('e2234567-89ab-cdef-0123-456789abcdef', 'l2234567-89ab-cdef-0123-456789abcdef', 'plant', 'animal', 'predation_evolution', NOW() - INTERVAL '20 minutes', '{"population_before": 800000, "new_traits": ["mobility", "sensory_organs"]}'),
('e3234567-89ab-cdef-0123-456789abcdef', 'l4234567-89ab-cdef-0123-456789abcdef', 'microbial', 'plant', 'photosynthesis_development', NOW() - INTERVAL '10 minutes', '{"population_before": 50000000000, "energy_source": "stellar_radiation"}}');

-- プレイヤー実績
INSERT INTO player_achievements (player_id, achievement_type_id, unlocked_at, progress_data) VALUES
('01234567-89ab-cdef-0123-456789abcdef', 1, NOW() - INTERVAL '2 hours', '{}'),
('01234567-89ab-cdef-0123-456789abcdef', 2, NOW() - INTERVAL '1 hour', '{}'),
('01234567-89ab-cdef-0123-456789abcdef', 4, NOW() - INTERVAL '1 hour', '{}'),
('01234567-89ab-cdef-0123-456789abcdef', 7, NOW() - INTERVAL '30 minutes', '{"total_collected": {"cosmic_dust": 100000, "energy": 50000}}'),
('11234567-89ab-cdef-0123-456789abcdef', 1, NOW() - INTERVAL '1 hour', '{}'),
('11234567-89ab-cdef-0123-456789abcdef', 4, NOW() - INTERVAL '30 minutes', '{}'),
('21234567-89ab-cdef-0123-456789abcdef', 1, NOW() - INTERVAL '30 minutes', '{}');

-- 開発用イベントログ（サンプル）
INSERT INTO event_logs (id, player_id, save_id, event_type, event_category, severity, event_data, server_timestamp) VALUES
(gen_random_uuid(), '01234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 'celestial_body_created', 'game_action', 'info', '{"body_type": "star", "name": "Helios Prime", "mass": 1.989e30}', NOW() - INTERVAL '2 hours'),
(gen_random_uuid(), '01234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 'life_evolved', 'evolution', 'info', '{"celestial_body": "Terra Nova", "from_stage": "animal", "to_stage": "intelligent"}', NOW() - INTERVAL '30 minutes'),
(gen_random_uuid(), '01234567-89ab-cdef-0123-456789abcdef', 'a1234567-89ab-cdef-0123-456789abcdef', 'research_completed', 'research', 'info', '{"research_id": 4, "research_name": "gravitational_engineering"}', NOW() - INTERVAL '30 minutes'),
(gen_random_uuid(), '11234567-89ab-cdef-0123-456789abcdef', 'c1234567-89ab-cdef-0123-456789abcdef', 'player_login', 'system', 'info', '{"ip_address": "127.0.0.1", "user_agent": "Development Browser"}', NOW() - INTERVAL '1 hour');

-- 天体関係データ（軌道関係など）
INSERT INTO celestial_body_relations (id, body1_id, body2_id, relation_type, orbital_period, orbital_eccentricity, influence_strength) VALUES
('r1234567-89ab-cdef-0123-456789abcdef', 'f2234567-89ab-cdef-0123-456789abcdef', 'f1234567-89ab-cdef-0123-456789abcdef', 'orbit', 31557600, 0.0167, 1.0),
('r2234567-89ab-cdef-0123-456789abcdef', 'f3234567-89ab-cdef-0123-456789abcdef', 'f1234567-89ab-cdef-0123-456789abcdef', 'orbit', 59354294, 0.0934, 0.8),
('r3234567-89ab-cdef-0123-456789abcdef', 'f4234567-89ab-cdef-0123-456789abcdef', 'f1234567-89ab-cdef-0123-456789abcdef', 'orbit', 374335776, 0.0489, 0.6),
('r4234567-89ab-cdef-0123-456789abcdef', 'f5234567-89ab-cdef-0123-456789abcdef', 'f2234567-89ab-cdef-0123-456789abcdef', 'orbit', 2360592, 0.0549, 0.3),
('r5234567-89ab-cdef-0123-456789abcdef', 'f6234567-89ab-cdef-0123-456789abcdef', 'f4234567-89ab-cdef-0123-456789abcdef', 'orbit', 306822, 0.009, 0.2);

-- セッションデータ（開発用）
INSERT INTO player_sessions (id, player_id, session_token, ip_address, user_agent, started_at, is_active, actions_count) VALUES
('s1234567-89ab-cdef-0123-456789abcdef', '01234567-89ab-cdef-0123-456789abcdef', 'dev_session_token_123456', '127.0.0.1', 'Development Browser 1.0', NOW() - INTERVAL '30 minutes', true, 145),
('s2234567-89ab-cdef-0123-456789abcdef', '11234567-89ab-cdef-0123-456789abcdef', 'test_session_token_789012', '127.0.0.1', 'Test Browser 1.0', NOW() - INTERVAL '1 hour', false, 67);

COMMIT;