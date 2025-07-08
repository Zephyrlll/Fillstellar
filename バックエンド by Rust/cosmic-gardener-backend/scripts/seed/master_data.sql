-- ===============================================
-- Cosmic Gardener Master Data Seeds
-- ===============================================

-- リソース種別マスタ
INSERT INTO resource_types (id, code, name, description, icon_url, color_hex, sort_order) VALUES
(1, 'cosmic_dust', 'コズミックダスト', '宇宙に漂う基本的な物質。全ての天体の基礎となる。', '/icons/cosmic_dust.png', '#8B4513', 1),
(2, 'energy', 'エネルギー', '星の核融合や重力から生成される動力源。', '/icons/energy.png', '#FFD700', 2),
(3, 'organic_matter', '有機物質', '生命の基礎となる炭素ベースの化合物。', '/icons/organic_matter.png', '#228B22', 3),
(4, 'biomass', 'バイオマス', '生命活動によって生成される生物由来の物質。', '/icons/biomass.png', '#32CD32', 4),
(5, 'dark_matter', 'ダークマター', '目に見えない謎の物質。高度な技術で操作可能。', '/icons/dark_matter.png', '#4B0082', 5),
(6, 'thought_points', '思考ポイント', '知的生命体の思考活動から生まれる高次エネルギー。', '/icons/thought_points.png', '#FF69B4', 6);

-- 研究種別マスタ
INSERT INTO research_types (id, code, name, description, category, cost_resources, duration_seconds, prerequisites, unlocks, sort_order) VALUES
-- 基礎研究
(1, 'stellar_formation', '恒星形成学', 'ガスと塵から恒星を作る技術を研究する。', 'basic', '{"cosmic_dust": 1000, "energy": 500}', 300, '[]', '{"celestial_bodies": ["star"]}', 1),
(2, 'planetary_science', '惑星科学', '惑星形成と軌道力学について学ぶ。', 'basic', '{"cosmic_dust": 2000, "energy": 1000}', 600, '[1]', '{"celestial_bodies": ["planet"]}', 2),
(3, 'astrobiology', '宇宙生物学', '宇宙環境での生命誕生について研究する。', 'biology', '{"organic_matter": 1500, "energy": 800}', 900, '[2]', '{"life_stages": ["microbial"]}', 3),

-- 中級研究
(4, 'gravitational_engineering', '重力工学', '重力場を人工的に操作する技術。', 'advanced', '{"energy": 5000, "dark_matter": 100}', 1800, '[1, 2]', '{"celestial_bodies": ["black_hole"], "abilities": ["gravity_control"]}', 4),
(5, 'quantum_biology', '量子生物学', '量子効果を利用した生命進化の促進。', 'biology', '{"organic_matter": 3000, "thought_points": 500}', 2400, '[3]', '{"life_stages": ["plant"], "abilities": ["evolution_boost"]}', 5),
(6, 'consciousness_theory', '意識理論', '知的生命体の意識について研究する。', 'consciousness', '{"biomass": 2000, "thought_points": 1000}', 3600, '[5]', '{"life_stages": ["intelligent"], "abilities": ["thought_generation"]}', 6),

-- 高度研究
(7, 'dark_matter_manipulation', 'ダークマター操作', 'ダークマターを自在に操る技術。', 'dark_tech', '{"dark_matter": 1000, "thought_points": 2000}', 7200, '[4, 6]', '{"abilities": ["dark_matter_generation", "space_expansion"]}', 7),
(8, 'galactic_engineering', '銀河工学', '銀河規模の構造を設計・構築する技術。', 'megastructure', '{"energy": 50000, "dark_matter": 5000, "thought_points": 10000}', 14400, '[7]', '{"abilities": ["galactic_construction"], "structures": ["dyson_sphere"]}', 8),
(9, 'dimensional_physics', '次元物理学', '異次元へのアクセスと操作技術。', 'transcendence', '{"dark_matter": 10000, "thought_points": 50000}', 28800, '[8]', '{"abilities": ["dimensional_travel"], "victory_conditions": ["transcendence"]}', 9);

-- 実績種別マスタ
INSERT INTO achievement_types (id, code, name, description, category, points, icon_url, conditions, sort_order) VALUES
-- 天体作成実績
(1, 'first_star', '最初の星', '初めて恒星を作成した。', 'creation', 10, '/icons/achievements/first_star.png', '{"create_celestial_body": {"type": "star", "count": 1}}', 1),
(2, 'planet_builder', '惑星建築家', '10個の惑星を作成した。', 'creation', 25, '/icons/achievements/planet_builder.png', '{"create_celestial_body": {"type": "planet", "count": 10}}', 2),
(3, 'solar_system', '太陽系', '1つの恒星の周りに5個の惑星を配置した。', 'creation', 50, '/icons/achievements/solar_system.png', '{"solar_system": {"star_count": 1, "planet_count": 5}}', 3),

-- 生命進化実績
(4, 'genesis', '創世記', '初めて生命を誕生させた。', 'evolution', 20, '/icons/achievements/genesis.png', '{"life_evolution": {"stage": "microbial", "count": 1}}', 4),
(5, 'garden_of_life', '生命の庭', '100個の惑星で生命を育成した。', 'evolution', 100, '/icons/achievements/garden_of_life.png', '{"life_planets": {"count": 100}}', 5),
(6, 'sapient_species', '知的種族', '知的生命体を5種族育成した。', 'evolution', 200, '/icons/achievements/sapient_species.png', '{"intelligent_life": {"count": 5}}', 6),

-- 資源収集実績
(7, 'cosmic_collector', '宇宙の収集家', '各種リソースを大量に収集した。', 'resources', 30, '/icons/achievements/cosmic_collector.png', '{"total_resources": {"cosmic_dust": 1000000, "energy": 500000}}', 7),
(8, 'dark_matter_adept', 'ダークマター習得者', 'ダークマターを1000単位収集した。', 'resources', 75, '/icons/achievements/dark_matter_adept.png', '{"collect_resource": {"type": "dark_matter", "amount": 1000}}', 8),

-- 研究実績
(9, 'researcher', '研究者', '全ての基礎研究を完了した。', 'research', 40, '/icons/achievements/researcher.png', '{"complete_research": {"category": "basic", "all": true}}', 9),
(10, 'cosmic_genius', '宇宙の天才', '全ての研究を完了した。', 'research', 500, '/icons/achievements/cosmic_genius.png', '{"complete_research": {"all": true}}', 10),

-- 特別実績
(11, 'black_hole_creator', 'ブラックホール創造主', 'ブラックホールを作成した。', 'special', 150, '/icons/achievements/black_hole_creator.png', '{"create_celestial_body": {"type": "black_hole", "count": 1}}', 11),
(12, 'galactic_architect', '銀河の建築家', '1000個以上の天体を持つ銀河を作成した。', 'special', 300, '/icons/achievements/galactic_architect.png', '{"total_celestial_bodies": {"count": 1000}}', 12),
(13, 'consciousness_awakener', '意識の覚醒者', '思考ポイントを100万ポイント生成した。', 'special', 250, '/icons/achievements/consciousness_awakener.png', '{"generate_resource": {"type": "thought_points", "amount": 1000000}}', 13),

-- 隠し実績
(14, 'speed_of_light', '光速突破', 'ゲーム開始から1時間以内に恒星を作成した。', 'hidden', 100, '/icons/achievements/speed_of_light.png', '{"time_limit": {"action": "create_star", "seconds": 3600}}', 14),
(15, 'minimalist', 'ミニマリスト', '天体数5個以下で知的生命体を誕生させた。', 'hidden', 150, '/icons/achievements/minimalist.png', '{"constraint": {"max_celestial_bodies": 5, "achieve": "intelligent_life"}}', 15),
(16, 'big_bang', 'ビッグバン', '同時に10個の恒星を作成した。', 'hidden', 200, '/icons/achievements/big_bang.png', '{"simultaneous_creation": {"type": "star", "count": 10, "time_window": 60}}', 16);

-- デフォルト設定値
INSERT INTO resource_types (id, code, name, description, icon_url, color_hex, unlock_requirements, sort_order) VALUES
(7, 'quantum_energy', '量子エネルギー', '量子効果から生成される高純度エネルギー。', '/icons/quantum_energy.png', '#00FFFF', '{"research": ["quantum_biology"]}', 7),
(8, 'exotic_matter', 'エキゾチック物質', '通常の物理法則を超越した特殊な物質。', '/icons/exotic_matter.png', '#FF1493', '{"research": ["dimensional_physics"]}', 8);

-- 初期プレイヤー用の基本リソース設定
-- これらは新規プレイヤー作成時に自動で付与される