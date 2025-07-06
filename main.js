import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- 基本設定 -----------------------------------------------------------------
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 3000, 8000); // フォグの距離を調整

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.position.z = 5000; // カメラの初期位置を調整

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// --- ポストプロセッシング -----------------------------------------------------
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 0.6, 0.6); // strength, radius, threshold を調整
composer.addPass(bloomPass);

// --- カメラコントロール -------------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 10;
controls.maxDistance = 20000; // 最大距離を延長
controls.enablePan = false; // WASD移動と競合するため無効化

// --- 光源 ---------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0x606060);
scene.add(ambientLight);

// --- グローバル変数 & 物理定数 ------------------------------------------------
const starGeometry = new THREE.SphereGeometry(1, 32, 32);
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

let focusedStar = null;

// WASD移動用変数
const keys = { w: false, a: false, s: false, d: false };
const moveSpeed = 200; // 移動速度を調整
const GALAXY_BOUNDARY = 15000; // 銀河の境界
const RESTORING_FORCE_FACTOR = 0.001; // 復元力の係数

let uiUpdateTimer = 0; // UI更新用タイマー
const uiUpdateInterval = 0.1; // 0.1秒ごとにUIを更新

// Galaxy map debouncing
let galaxyMapUpdateTimer = 0;
const galaxyMapUpdateInterval = 0.2; // Update galaxy map every 0.2 seconds (slower than UI)
let previousGalaxyMapState = {
    starCount: -1,
    isMapVisible: false,
    blackHolePosition: null,
    mapSize: -1
};

// Event listener management
let eventListenersSetup = false;

// UI dirty checking - previous values cache
const previousUIValues = {
    gameYear: -1,
    cosmicDust: -1,
    dustRate: -1,
    energy: -1,
    organicMatter: -1,
    biomass: -1,
    darkMatter: -1,
    thoughtPoints: -1,
    starCount: -1,
    thoughtSpeedMps: -1,
    lightSpeedPercent: -1,
    dustUpgradeLevel: -1,
    dustUpgradeCost: -1,
    darkMatterConverterLevel: -1,
    darkMatterConverterCost: -1,
    totalPopulation: -1,
    researchStates: {},
    unlockedBodies: {}
};

// Object pool for THREE.Vector3 instances to reduce garbage collection
const vector3Pool = {
    pool: [],
    get() {
        if (this.pool.length > 0) {
            return this.pool.pop().set(0, 0, 0);
        }
        return new THREE.Vector3();
    },
    release(vector) {
        if (vector && this.pool.length < 50) { // Limit pool size
            this.pool.push(vector);
        }
    }
};

// THREE.js resource disposal utility with object pooling
function disposeThreeObject(object) {
    if (!object) return;
    
    // Dispose of children first
    if (object.children) {
        object.children.forEach(child => disposeThreeObject(child));
    }
    
    // Try to return geometry to pool first, then dispose
    if (object.geometry && typeof object.geometry.dispose === 'function') {
        // Check if it's a sphere geometry that can be pooled
        if (object.geometry.type === 'SphereGeometry' && object.userData.originalRadius) {
            celestialObjectPools.releaseSphereGeometry(object.geometry, object.userData.originalRadius);
        } else {
            object.geometry.dispose();
        }
    }
    
    // Try to return material to pool first, then dispose
    if (object.material) {
        if (Array.isArray(object.material)) {
            object.material.forEach(material => {
                if (material && typeof material.dispose === 'function') {
                    // Dispose textures first
                    ['map', 'normalMap', 'bumpMap', 'emissiveMap', 'specularMap'].forEach(textureProperty => {
                        if (material[textureProperty] && typeof material[textureProperty].dispose === 'function') {
                            material[textureProperty].dispose();
                        }
                    });
                    
                    // Try to return to pool or dispose
                    if (object.userData.materialType) {
                        celestialObjectPools.releaseMaterial(material, object.userData.materialType);
                    } else {
                        material.dispose();
                    }
                }
            });
        } else {
            if (typeof object.material.dispose === 'function') {
                // Dispose textures first
                ['map', 'normalMap', 'bumpMap', 'emissiveMap', 'specularMap'].forEach(textureProperty => {
                    if (object.material[textureProperty] && typeof object.material[textureProperty].dispose === 'function') {
                        object.material[textureProperty].dispose();
                    }
                });
                
                // Try to return to pool or dispose
                if (object.userData.materialType) {
                    celestialObjectPools.releaseMaterial(object.material, object.userData.materialType);
                } else {
                    object.material.dispose();
                }
            }
        }
    }
}

// Safely remove and dispose THREE.js objects from scene
function removeAndDispose(object) {
    if (object && object.parent) {
        object.parent.remove(object);
    }
    disposeThreeObject(object);
}

// Spatial partitioning system for physics optimization
class SpatialGrid {
    constructor(worldSize, cellSize) {
        this.worldSize = worldSize;
        this.cellSize = cellSize;
        this.gridSize = Math.ceil(worldSize / cellSize);
        this.grid = new Map();
    }

    clear() {
        this.grid.clear();
    }

    getKey(x, y, z) {
        const halfWorld = mathCache.halfWorldSize;
        const gx = Math.floor((x + halfWorld) / this.cellSize);
        const gy = Math.floor((y + halfWorld) / this.cellSize);
        const gz = Math.floor((z + halfWorld) / this.cellSize);
        return `${gx},${gy},${gz}`;
    }

    insert(object) {
        const key = this.getKey(object.position.x, object.position.y, object.position.z);
        if (!this.grid.has(key)) {
            this.grid.set(key, []);
        }
        this.grid.get(key).push(object);
    }

    getNearbyObjects(object, searchRadius = 1) {
        const nearby = [];
        const cellRadius = Math.ceil(searchRadius / this.cellSize);
        
        const halfWorld = mathCache.halfWorldSize;
        const centerX = Math.floor((object.position.x + halfWorld) / this.cellSize);
        const centerY = Math.floor((object.position.y + halfWorld) / this.cellSize);
        const centerZ = Math.floor((object.position.z + halfWorld) / this.cellSize);

        for (let dx = -cellRadius; dx <= cellRadius; dx++) {
            for (let dy = -cellRadius; dy <= cellRadius; dy++) {
                for (let dz = -cellRadius; dz <= cellRadius; dz++) {
                    const key = `${centerX + dx},${centerY + dy},${centerZ + dz}`;
                    if (this.grid.has(key)) {
                        nearby.push(...this.grid.get(key));
                    }
                }
            }
        }
        return nearby;
    }
}

// Initialize spatial grid for collision detection
const spatialGrid = new SpatialGrid(GALAXY_BOUNDARY * 2, 1000);

// Object pools for celestial body creation
const celestialObjectPools = {
    // Geometry pools
    sphereGeometries: {
        small: [], // radius <= 5
        medium: [], // radius 5-20
        large: [] // radius > 20
    },
    
    // Material pools by type
    materials: {
        star: [],
        planet: [],
        asteroid: [],
        blackHole: [],
        atmosphere: [],
        lifeAura: []
    },
    
    // Mesh pools
    meshes: {
        celestialBody: [],
        atmosphere: [],
        ring: []
    },

    // Get pooled sphere geometry
    getSphereGeometry(radius) {
        let pool;
        if (radius <= 5) pool = this.sphereGeometries.small;
        else if (radius <= 20) pool = this.sphereGeometries.medium;
        else pool = this.sphereGeometries.large;
        
        if (pool.length > 0) {
            return pool.pop();
        }
        return starGeometry.clone(); // Fallback to cloning
    },
    
    // Release sphere geometry back to pool
    releaseSphereGeometry(geometry, radius) {
        let pool;
        if (radius <= 5) pool = this.sphereGeometries.small;
        else if (radius <= 20) pool = this.sphereGeometries.medium;
        else pool = this.sphereGeometries.large;
        
        if (pool.length < 20) { // Limit pool size
            pool.push(geometry);
        } else {
            geometry.dispose(); // Dispose if pool is full
        }
    },
    
    // Get pooled material
    getMaterial(type, properties = {}) {
        const pool = this.materials[type] || [];
        let material;
        
        if (pool.length > 0) {
            material = pool.pop();
            // Update material properties
            Object.assign(material, properties);
            return material;
        }
        
        // Create new material if pool is empty
        switch (type) {
            case 'star':
                return new THREE.MeshStandardMaterial({ 
                    emissive: new THREE.Color(0xff4444), 
                    emissiveIntensity: 0.3, 
                    ...properties 
                });
            case 'planet':
                return new THREE.MeshStandardMaterial({ 
                    roughness: 0.8, 
                    metalness: 0.2, 
                    ...properties 
                });
            case 'lifeAura':
                return new THREE.MeshBasicMaterial({
                    color: 0x00ff00,
                    transparent: true,
                    opacity: 0.15,
                    blending: THREE.AdditiveBlending,
                    ...properties
                });
            default:
                return new THREE.MeshStandardMaterial(properties);
        }
    },
    
    // Release material back to pool
    releaseMaterial(material, type) {
        const pool = this.materials[type] || [];
        if (pool.length < 10) { // Limit pool size
            pool.push(material);
        } else {
            material.dispose();
        }
    },
    
    // Clean up all pools
    dispose() {
        Object.values(this.sphereGeometries).forEach(pool => {
            pool.forEach(geometry => geometry.dispose());
            pool.length = 0;
        });
        Object.values(this.materials).forEach(pool => {
            pool.forEach(material => material.dispose());
            pool.length = 0;
        });
        Object.values(this.meshes).forEach(pool => {
            pool.forEach(mesh => {
                if (mesh.geometry) mesh.geometry.dispose();
                if (mesh.material) mesh.material.dispose();
            });
            pool.length = 0;
        });
    }
};

// Cache for expensive mathematical calculations
const mathCache = {
    // Upgrade cost cache
    dustUpgradeCost: { level: -1, cost: 0 },
    converterCost: { level: -1, cost: 0 },
    
    // Thought speed cache
    thoughtSpeed: { points: -1, speed: 0 },
    
    // Physics constants cache - will be initialized after gameState is defined
    softeningFactorSq: 0,
    halfWorldSize: (GALAXY_BOUNDARY * 2) / 2,
    
    // Initialize physics constants after gameState is available
    init() {
        this.softeningFactorSq = gameState.physics.softeningFactor * gameState.physics.softeningFactor;
    },
    
    // Clear cache when physics constants change
    updatePhysicsConstants() {
        this.softeningFactorSq = gameState.physics.softeningFactor * gameState.physics.softeningFactor;
    },
    
    // Get cached upgrade cost
    getDustUpgradeCost() {
        if (this.dustUpgradeCost.level !== gameState.dustUpgradeLevel) {
            this.dustUpgradeCost.cost = Math.floor(gameState.dustUpgradeBaseCost * Math.pow(1.5, gameState.dustUpgradeLevel));
            this.dustUpgradeCost.level = gameState.dustUpgradeLevel;
        }
        return this.dustUpgradeCost.cost;
    },
    
    // Get cached converter cost
    getConverterCost() {
        if (this.converterCost.level !== gameState.darkMatterConverterLevel) {
            this.converterCost.cost = Math.floor(gameState.darkMatterConverterBaseCost * Math.pow(2, gameState.darkMatterConverterLevel));
            this.converterCost.level = gameState.darkMatterConverterLevel;
        }
        return this.converterCost.cost;
    },
    
    // Get cached thought speed
    getThoughtSpeed() {
        if (this.thoughtSpeed.points !== gameState.thoughtPoints) {
            const baseSpeed = 1.1;
            this.thoughtSpeed.speed = Math.pow(baseSpeed, gameState.thoughtPoints) - 1;
            this.thoughtSpeed.points = gameState.thoughtPoints;
        }
        return this.thoughtSpeed.speed;
    }
};

// --- ゲーム状態管理 -----------------------------------------------------------
const gameState = {
    gameYear: 0,
    cosmicDust: 150000, // 初期値を多めに
    energy: 0,   // 初期値を多めに
    stars: [], // すべての天体オブジクトをここに格納
    lastTick: Date.now(),
    dustUpgradeLevel: 0,
    dustUpgradeBaseCost: 100,
    darkMatter: 0, // 初期値を多めに
    darkMatterConverterLevel: 0,
    darkMatterConverterBaseCost: 500,
    organicMatter: 0,
    biomass: 0,
    thoughtPoints: 0,
    resourceAccumulators: {
        cosmicDust: 0,
        energy: 0,
        organicMatter: 0,
        biomass: 0,
        thoughtPoints: 0
    },
    thoughtSpeedMps: 0, // 思考速度(m/s)を追加
    cosmicActivity: 0,
    physics: {
        G: 100,
        softeningFactor: 20,
        simulationSpeed: 1,
        timeStep: 1 / 120,
        accumulator: 0,
        dragFactor: 0.01
    },
    researchEnhancedDust: false,
    researchAdvancedEnergy: false,
    unlockedCelestialBodies: {
        asteroid: true,
        comet: true,
        moon: false,
        dwarfPlanet: false,
        planet: false,
        star: true
    },
    researchStar: false,
    graphicsQuality: 'medium',
    currentUnitSystem: 'astronomical',
    unlockedTimeMultipliers: { '2x': false, '5x': false, '10x': false },
    currentTimeMultiplier: '1x',
    timeMultiplierCosts: { '2x': 500, '5x': 2000, '10x': 5000 },
    isMapVisible: true,
    saveVersion: '1.6-accumulator', // セーブデータのバージョン
    timelineLog: [], // 時系列ログエントリを格納
    maxLogEntries: 100, // ログの最大保持数
    statistics: {
        resources: {
            cosmicDust: { total: 0, perSecond: 0, perHour: 0, history: [] },
            energy: { total: 0, perSecond: 0, perHour: 0, history: [] },
            organicMatter: { total: 0, perSecond: 0, perHour: 0, history: [] },
            biomass: { total: 0, perSecond: 0, perHour: 0, history: [] },
            darkMatter: { total: 0, perSecond: 0, perHour: 0, history: [] },
            thoughtPoints: { total: 0, perSecond: 0, perHour: 0, history: [] }
        },
        cosmic: {
            starCount: { current: 0, history: [] },
            planetCount: { current: 0, history: [] },
            cosmicActivity: { current: 0, history: [] },
            totalPopulation: { current: 0, history: [] }
        },
        lastUpdate: Date.now(),
        maxHistoryPoints: 60 // 1分間のデータを保持
    }
};

// Initialize mathCache after gameState is defined
mathCache.init();

// --- 時系列ログシステム -------------------------------------------------------
function addTimelineLog(message, type = 'event') {
    const logEntry = {
        id: Date.now() + Math.random(),
        year: Math.floor(gameState.gameYear),
        message: message,
        type: type,
        timestamp: Date.now()
    };
    
    // 新しいログエントリを先頭に追加
    gameState.timelineLog.unshift(logEntry);
    
    // 最大保持数を超えた場合、古いエントリを削除
    if (gameState.timelineLog.length > gameState.maxLogEntries) {
        gameState.timelineLog = gameState.timelineLog.slice(0, gameState.maxLogEntries);
    }
    
    // UIを更新
    updateTimelineLogDisplay();
}

function updateTimelineLogDisplay() {
    const logContainer = document.getElementById('timeline-log-entries');
    if (!logContainer) return;
    
    // 既存のエントリをクリア
    logContainer.innerHTML = '';
    
    // ログエントリを表示
    gameState.timelineLog.forEach(entry => {
        const logElement = document.createElement('div');
        logElement.className = 'timeline-log-entry';
        logElement.innerHTML = `
            <span class="log-year">${entry.year}年</span>
            <span class="log-message">${entry.message}</span>
        `;
        logContainer.appendChild(logElement);
    });
    
    // 最新のログエントリが見えるように、自動スクロールを一番上に
    const logContent = document.getElementById('timeline-log-content');
    if (logContent) {
        logContent.scrollTop = 0;
    }
}

function clearTimelineLog() {
    gameState.timelineLog = [];
    updateTimelineLogDisplay();
}

// --- 統計システム -------------------------------------------------------
function updateStatistics() {
    const now = Date.now();
    const deltaTime = (now - gameState.statistics.lastUpdate) / 1000; // 秒単位
    
    if (deltaTime < 1) return; // 1秒未満の場合は更新しない
    
    // リソース統計を更新
    const resources = ['cosmicDust', 'energy', 'organicMatter', 'biomass', 'darkMatter', 'thoughtPoints'];
    resources.forEach(resource => {
        const current = gameState[resource] || 0;
        const stats = gameState.statistics.resources[resource];
        
        // 前回の値がない場合は初期化
        if (stats.total === 0) stats.total = current;
        
        // 増加量を計算
        const gained = current - stats.total;
        if (gained > 0) {
            stats.total = current;
            stats.perSecond = gained / deltaTime;
            stats.perHour = stats.perSecond * 3600;
        } else {
            // 減少または変化なしの場合、レートを徐々に減衰
            stats.perSecond = Math.max(0, stats.perSecond * 0.95);
            stats.perHour = stats.perSecond * 3600;
        }
        
        // 履歴に追加
        stats.history.push({
            time: now,
            value: current,
            rate: stats.perSecond
        });
        
        // 古い履歴を削除
        if (stats.history.length > gameState.statistics.maxHistoryPoints) {
            stats.history.shift();
        }
    });
    
    // 宇宙統計を更新
    const starCount = gameState.stars.filter(s => s.userData.type === 'star').length;
    const planetCount = gameState.stars.filter(s => 
        ['planet', 'dwarfPlanet', 'moon', 'asteroid', 'comet'].includes(s.userData.type)
    ).length;
    const cosmicActivity = gameState.cosmicActivity || 0;
    const totalPopulation = gameState.cachedTotalPopulation || 0;
    
    const cosmicStats = [
        { key: 'starCount', value: starCount },
        { key: 'planetCount', value: planetCount },
        { key: 'cosmicActivity', value: cosmicActivity },
        { key: 'totalPopulation', value: totalPopulation }
    ];
    
    cosmicStats.forEach(({ key, value }) => {
        const stats = gameState.statistics.cosmic[key];
        stats.current = value;
        
        stats.history.push({
            time: now,
            value: value
        });
        
        if (stats.history.length > gameState.statistics.maxHistoryPoints) {
            stats.history.shift();
        }
    });
    
    gameState.statistics.lastUpdate = now;
    updateStatisticsDisplay();
}

function updateStatisticsDisplay() {
    updateResourceStatistics();
    updateCosmicStatistics();
    updateStatisticsChart();
}

function updateResourceStatistics() {
    const container = document.getElementById('resource-stats-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    const resourceNames = {
        cosmicDust: '宇宙の塵',
        energy: 'エネルギー',
        organicMatter: '有機物',
        biomass: 'バイオマス',
        darkMatter: 'ダークマター',
        thoughtPoints: '思考ポイント'
    };
    
    Object.entries(gameState.statistics.resources).forEach(([key, stats]) => {
        const item = document.createElement('div');
        item.className = 'stat-item';
        
        const formatNumber = (num) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return num.toFixed(1);
        };
        
        item.innerHTML = `
            <span class="stat-name">${resourceNames[key]}</span>
            <div class="stat-values">
                <span class="stat-value">累計: ${formatNumber(stats.total)}</span>
                <span class="stat-value">/秒: ${formatNumber(stats.perSecond)}</span>
                <span class="stat-value">/時: ${formatNumber(stats.perHour)}</span>
            </div>
        `;
        
        container.appendChild(item);
    });
}

function updateCosmicStatistics() {
    const container = document.getElementById('cosmic-stats-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    const cosmicNames = {
        starCount: '恒星数',
        planetCount: '天体数',
        cosmicActivity: '活発度',
        totalPopulation: '総人口'
    };
    
    Object.entries(gameState.statistics.cosmic).forEach(([key, stats]) => {
        const item = document.createElement('div');
        item.className = 'stat-item';
        
        const formatNumber = (num) => {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
            return Math.floor(num).toLocaleString();
        };
        
        item.innerHTML = `
            <span class="stat-name">${cosmicNames[key]}</span>
            <div class="stat-values">
                <span class="stat-value">現在: ${formatNumber(stats.current)}</span>
            </div>
        `;
        
        container.appendChild(item);
    });
}

let currentChart = 'resources';

function updateStatisticsChart() {
    const canvas = document.getElementById('statistics-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    const height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
    
    if (currentChart === 'resources') {
        drawResourceChart(ctx, canvas.offsetWidth, canvas.offsetHeight);
    } else {
        drawCosmicChart(ctx, canvas.offsetWidth, canvas.offsetHeight);
    }
}

function drawResourceChart(ctx, width, height) {
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // 主要なリソースのみ表示（データがあるもの）
    const resources = ['cosmicDust', 'energy', 'darkMatter'];
    const colors = ['#FFD700', '#00FFFF', '#FF69B4'];
    
    resources.forEach((resource, index) => {
        const stats = gameState.statistics.resources[resource];
        if (!stats.history.length) return;
        
        const maxValue = Math.max(...stats.history.map(h => h.value));
        if (maxValue === 0) return;
        
        ctx.strokeStyle = colors[index];
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        stats.history.forEach((point, i) => {
            const x = padding + (i / (stats.history.length - 1)) * chartWidth;
            const y = padding + chartHeight - (point.value / maxValue) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    });
    
    // 軸とラベル
    ctx.strokeStyle = '#FFB700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
}

function drawCosmicChart(ctx, width, height) {
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const metrics = ['starCount', 'planetCount', 'totalPopulation'];
    const colors = ['#FFD700', '#00FFFF', '#FF69B4'];
    
    metrics.forEach((metric, index) => {
        const stats = gameState.statistics.cosmic[metric];
        if (!stats.history.length) return;
        
        const maxValue = Math.max(...stats.history.map(h => h.value));
        if (maxValue === 0) return;
        
        ctx.strokeStyle = colors[index];
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        stats.history.forEach((point, i) => {
            const x = padding + (i / (stats.history.length - 1)) * chartWidth;
            const y = padding + chartHeight - (point.value / maxValue) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
    });
    
    // 軸とラベル
    ctx.strokeStyle = '#FFB700';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
}

function switchChart(chartType) {
    currentChart = chartType;
    
    // タブの表示を更新
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-chart="${chartType}"]`).classList.add('active');
    
    updateStatisticsChart();
}

// --- UI要素の取得 ----------------------------------------------------
const ui = {
    gameYear: document.getElementById('gameYear'),
    thoughtSpeedMps: document.getElementById('thoughtSpeedMps'), // 変更
    lightSpeedPercent: document.getElementById('lightSpeedPercent'), // 追加
    cosmicDust: document.getElementById('resource-cosmicDust'),
    dustRate: document.getElementById('dustRate'),
    energy: document.getElementById('resource-energy'),
    organicMatter: document.getElementById('resource-organicMatter'),
    biomass: document.getElementById('resource-biomass'),
    darkMatter: document.getElementById('resource-darkMatter'),
    thoughtPoints: document.getElementById('resource-thoughtPoints'),
    starCount: document.getElementById('starCount'),
    dustUpgradeLevel: document.getElementById('dustUpgradeLevel'),
    dustUpgradeCost: document.getElementById('dustUpgradeCost'),
    upgradeDustButton: document.getElementById('upgradeDustButton'),
    darkMatterConverterLevel: document.getElementById('darkMatterConverterLevel'),
    darkMatterConverterCost: document.getElementById('darkMatterConverterCost'),
    upgradeDarkMatterConverterButton: document.getElementById('upgradeDarkMatterConverterButton'),
    focusedStarName: document.getElementById('focused-star-name'),
    starParameters: document.getElementById('star-parameters'),
    planetParameters: document.getElementById('planet-parameters'),
    focusedStarAge: document.getElementById('focused-star-age'),
    focusedStarTemp: document.getElementById('focused-star-temp'),
    focusedStarMass: document.getElementById('focused-star-mass'),
    focusedStarLifespan: document.getElementById('focused-star-lifespan'),
    focusedStarSpeed: document.getElementById('focused-star-speed'),
    focusedPlanetType: document.getElementById('focused-planet-type'),
    focusedPlanetMass: document.getElementById('focused-planet-mass'),
    focusedPlanetRadius: document.getElementById('focused-planet-radius'),
    focusedPlanetAtmosphere: document.getElementById('focused-planet-atmosphere'),
    focusedPlanetWater: document.getElementById('focused-planet-water'),
    focusedPlanetHabitability: document.getElementById('focused-planet-habitability'),
    focusedPlanetHasLife: document.getElementById('focused-planet-hasLife'),
    focusedPlanetLifeStage: document.getElementById('focused-planet-lifeStage'),
    focusedPlanetPopulation: document.getElementById('focused-planet-population'),
    focusedPlanetGeology: document.getElementById('focusedPlanetGeology'), // 追加
    focusedPlanetGeologyRow: document.getElementById('focused-planet-geology-row'), // 追加
    focusedPlanetSpeed: document.getElementById('focused-planet-speed'),
    researchEnhancedDustStatus: document.getElementById('researchEnhancedDustStatus'),
    researchAdvancedEnergyStatus: document.getElementById('researchAdvancedEnergyStatus'),
    researchMoonStatus: document.getElementById('researchMoonStatus'),
    researchDwarfPlanetStatus: document.getElementById('researchDwarfPlanetStatus'),
    researchPlanetStatus: document.getElementById('researchPlanetStatus'),
    researchStarStatus: document.getElementById('researchStarStatus'),
    researchStarCost: document.getElementById('researchStarCost'),
    researchEnhancedDustButton: document.getElementById('researchEnhancedDustButton'),
    researchAdvancedEnergyButton: document.getElementById('researchAdvancedEnergyButton'),
    researchMoonButton: document.getElementById('researchMoonButton'),
    researchDwarfPlanetButton: document.getElementById('researchDwarfPlanetButton'),
    researchPlanetButton: document.getElementById('researchPlanetButton'),
    researchStarButton: document.getElementById('researchStarButton'),
    timeMultiplier2xCost: document.getElementById('timeMultiplier2xCost'),
    timeMultiplier2xStatus: document.getElementById('timeMultiplier2xStatus'),
    timeMultiplier2xButton: document.getElementById('timeMultiplier2xButton'),
    timeMultiplier5xCost: document.getElementById('timeMultiplier5xCost'),
    timeMultiplier5xStatus: document.getElementById('timeMultiplier5xStatus'),
    timeMultiplier5xButton: document.getElementById('timeMultiplier5xButton'),
    timeMultiplier10xCost: document.getElementById('timeMultiplier10xCost'),
    timeMultiplier10xStatus: document.getElementById('timeMultiplier10xStatus'),
    timeMultiplier10xButton: document.getElementById('timeMultiplier10xButton'),
    timeMultiplierSelect: document.getElementById('timeMultiplierSelect'),
    createAsteroidButton: document.getElementById('createAsteroidButton'),
    createCometButton: document.getElementById('createCometButton'),
    createMoonButton: document.getElementById('createMoonButton'),
    createDwarfPlanetButton: document.getElementById('createDwarfPlanetButton'),
    createPlanetButton: document.getElementById('createPlanetButton'),
    createStarButton: document.getElementById('createStarButton'),
    asteroidCostDisplay: document.getElementById('asteroidCostDisplay'),
    cometCostDisplay: document.getElementById('cometCostDisplay'),
    moonCostDisplay: document.getElementById('moonCostDisplay'),
    dwarfPlanetCostDisplay: document.getElementById('dwarfPlanetCostDisplay'),
    planetCostDisplay: document.getElementById('planetCostDisplay'),
    starCostDisplay: document.getElementById('starCostDisplay'),
    overlayCosmicDust: document.getElementById('overlayCosmicDust'),
    overlayEnergy: document.getElementById('overlayEnergy'),
    overlayStarCount: document.getElementById('overlayStarCount'),
    overlayThoughtPoints: document.getElementById('overlayThoughtPoints'),
    overlayCosmicActivity: document.getElementById('overlayCosmicActivity'),
    overlayPopulation: document.getElementById('overlayPopulation'),
    uiArea: document.getElementById('ui-area'),
    gameScreen: document.getElementById('game-screen'),
    researchScreen: document.getElementById('research-screen'),
    optionsScreen: document.getElementById('options-screen'),
    gameTabButton: document.getElementById('gameTabButton'),
    researchTabButton: document.getElementById('researchTabButton'),
    optionsTabButton: document.getElementById('optionsTabButton'),
    closeOptionsButton: document.getElementById('closeOptionsButton'),
    graphicsQualitySelect: document.getElementById('graphicsQualitySelect'),
    unitSystemSelect: document.getElementById('unitSystemSelect'),
    resetGameButton: document.getElementById('resetGameButton'),
    addCosmicDustButton: document.getElementById('addCosmicDustButton'),
    addEnergyButton: document.getElementById('addEnergyButton'),
    addDarkMatterButton: document.getElementById('addDarkMatterButton'),
    starManagementTabButton: document.getElementById('starManagementTabButton'),
    starManagementScreen: document.getElementById('star-management-screen'),
    starListContainer: document.getElementById('star-list-container'),
    messageOverlay: document.getElementById('message-overlay'),
    messageText: document.getElementById('message-text'),
    gravitySlider: document.getElementById('gravitySlider'),
    gravityValue: document.getElementById('gravityValue'),
    simulationSpeedSlider: document.getElementById('simulationSpeedSlider'),
    simulationSpeedValue: document.getElementById('simulationSpeedValue'),
    dragSlider: document.getElementById('dragSlider'),
    dragValue: document.getElementById('dragValue'),
    addAllResourcesButton: document.getElementById('addAllResourcesButton'),
    galaxyMapContainer: document.getElementById('galaxy-map-container'),
    
    // Cache frequently queried elements
    starActionsDropdowns: null,
    collapsibleHeaders: null
};

// --- 関数 (ここから) ---------------------------------------------------------

function createStar() {
    const starTypes = [
        { type: 'red', tempMin: 2400, tempMax: 3700, massMin: 0.08, massMax: 0.45 },
        { type: 'orange', tempMin: 3700, tempMax: 5200, massMin: 0.45, massMax: 0.8 },
        { type: 'yellow', tempMin: 5200, tempMax: 6000, massMin: 0.8, massMax: 1.04 },
        { type: 'white', tempMin: 6000, tempMax: 7500, massMin: 1.04, massMax: 1.4 },
        { type: 'blue', tempMin: 7500, tempMax: 30000, massMin: 1.4, massMax: 16 }
    ];
    const selectedType = starTypes[Math.floor(Math.random() * starTypes.length)];
    const age = Math.random() * 500;
    const temperature = Math.floor(Math.random() * (selectedType.tempMax - selectedType.tempMin + 1)) + selectedType.tempMin;
    const mass = Math.random() * (selectedType.massMax - selectedType.massMin) + selectedType.massMin;
    const starData = {
        age: age.toFixed(2),
        temperature: temperature,
        mass: mass.toFixed(2),
        spectralType: selectedType.type
    };
    starData.lifespan = calculateStarLifespan(starData);
    return starData;
}

function calculateStarLifespan(starData) {
    if (starData.mass < 0.1) return 1000;
    if (starData.mass < 0.5) return 500;
    if (starData.mass < 1.0) return 200;
    if (starData.mass < 2.0) return 50;
    if (starData.mass < 5.0) return 10;
    return 5;
}

function createPlanet(parentStar) {
    const parentMass = parentStar.userData.mass;
    // 親の質量に応じて、惑星の質量を決定
    const mass = parentMass * (Math.random() * 0.005 + 0.0001);

    const radius = Math.cbrt(mass);
    const temperature = Math.floor(Math.random() * 300) - 150; // 温度範囲を調整
    const atmosphere = Math.random();
    const water = Math.random();

    let planetType = (mass < parentMass * 0.01) ? 'rocky' : 'gas_giant'; // 親との比較でガス惑星化を決定
    let subType = 'unknown';
    let geologicalActivity = 0; // ガス惑星では活動は0

    if (planetType === 'rocky') {
        geologicalActivity = Math.random(); // 岩石惑星にランダムな活動レベルを設定
        if (water > 0.7 && temperature > -50 && temperature < 50) {
            subType = 'ocean_world';
        } else if (temperature < -50) {
            subType = 'ice_world';
            geologicalActivity *= 0.2; // 氷雪惑星は活動が鈍い
        } else if (water < 0.1 && temperature > 0) {
            subType = 'desert_world';
        } else {
            subType = 'terran';
        }
    } else { // gas_giant
        subType = (temperature > 0) ? 'jupiter_like' : 'neptune_like';
    }

    const planetData = {
        mass: mass.toFixed(5), // 精度を上げる
        radius: radius.toFixed(5),
        planetType: planetType,
        subType: subType,
        temperature: temperature,
        atmosphere: atmosphere.toFixed(2),
        water: water.toFixed(2),
        geologicalActivity: geologicalActivity.toFixed(2)
    };
    planetData.habitability = calculateHabitability(planetData);
    return planetData;
}

function calculateHabitability(planetData) {
    let score = 0;
    const temp = parseFloat(planetData.temperature);
    if (temp >= 0 && temp <= 40) score += 40;
    else if (temp > -50 && temp < 90) score += 20;
    const atm = parseFloat(planetData.atmosphere);
    if (atm >= 0.5 && atm <= 0.8) score += 30;
    else if (atm > 0.2 && atm < 1.0) score += 15;
    const water = parseFloat(planetData.water);
    score += water * 30;
    return Math.min(100, Math.max(0, Math.floor(score)));
}

function checkLifeSpawn(planetObject) {
    // 条件: 岩石惑星、生命なし、サブタイプが地球型or海洋惑星、居住可能性が70以上
    if (planetObject.userData.type !== 'planet' || 
        planetObject.userData.hasLife || 
        planetObject.userData.planetType !== 'rocky' ||
        (planetObject.userData.subType !== 'terran' && planetObject.userData.subType !== 'ocean_world') ||
        planetObject.userData.habitability < 70) { 
        return;
    }

    const spawnChance = (planetObject.userData.habitability / 100) * 0.0001; // 確率を調整
    if (Math.random() < spawnChance) {
        planetObject.userData.hasLife = true;
        planetObject.userData.lifeStage = 'microbial';
        planetObject.userData.population = 10;

        // 生命のオーラを追加 - use object pooling
        const auraMaterial = celestialObjectPools.getMaterial('lifeAura');
        const radius = planetObject.children[0].scale.x; // 本体メッシュの半径を取得
        const auraGeometry = celestialObjectPools.getSphereGeometry(radius * 1.1);
        const auraSphere = new THREE.Mesh(auraGeometry, auraMaterial);
        auraSphere.scale.set(radius * 1.1, radius * 1.1, radius * 1.1);
        auraSphere.name = 'life_aura';
        auraSphere.userData.originalRadius = radius * 1.1;
        auraSphere.userData.materialType = 'lifeAura';
        planetObject.add(auraSphere);

        showMessage(`${planetObject.userData.name} に生命が誕生しました！`);
    }
}

function evolveLife(planetObject) {
    if (!planetObject.userData.hasLife) return;
    const currentStage = planetObject.userData.lifeStage;
    const ageInYears = gameState.gameYear - planetObject.userData.creationYear;
    let nextStage = null;
    switch (currentStage) {
        case 'microbial': if (ageInYears >= 50) nextStage = 'plant'; break;
        case 'plant': if (ageInYears >= 100) nextStage = 'animal'; break;
        case 'animal': if (ageInYears >= 200) nextStage = 'intelligent'; break;
    }
    if (nextStage) {
        planetObject.userData.lifeStage = nextStage;
        showMessage(`${planetObject.userData.name} の生命が ${nextStage} に進化しました！`);

        if (nextStage === 'intelligent') {
            // 都市の光をテクスチャに描画
            const planetMesh = planetObject.children[0];
            if (planetMesh && planetMesh.material && planetMesh.material.map) {
                const texture = planetMesh.material.map;
                const canvas = texture.image;
                const context = canvas.getContext('2d');
                
                // 暗い部分に光を追加
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                    if (brightness < 80 && Math.random() < 0.1) { // 暗い領域にランダムで光を配置
                        data[i] = 255; // R
                        data[i + 1] = 220; // G
                        data[i + 2] = 180; // B
                    }
                }
                context.putImageData(imageData, 0, 0);
                texture.needsUpdate = true;
            }
        }
    }
}

// --- Helper: リアルな惑星テクスチャと法線マップを生成 ---
const createRealisticPlanetMaps = (subType, water, atmosphere) => {
    const width = 512, height = 256;
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = width; normalCanvas.height = height;
    const normalContext = normalCanvas.getContext('2d');

    let baseColor, landColor, oceanColor;

    switch (subType) {
        case 'jupiter_like':
            baseColor = new THREE.Color(0xD2B48C); // Tan
            for (let y = 0; y < height; y++) {
                const bandFactor = Math.sin(y / (height / (Math.random() * 12 + 6))) * 0.5 + 0.5;
                const c = baseColor.clone().offsetHSL(0, bandFactor * 0.2 - 0.1, bandFactor * 0.1 - 0.05);
                context.fillStyle = c.getStyle();
                context.fillRect(0, y, width, 1);
            }
            break;
        case 'neptune_like':
            baseColor = new THREE.Color(0x4169E1); // RoyalBlue
            for (let y = 0; y < height; y++) {
                const bandFactor = Math.sin(y / (height / (Math.random() * 8 + 4))) * 0.5 + 0.5;
                const c = baseColor.clone().offsetHSL(0, 0, bandFactor * 0.3 - 0.15);
                context.fillStyle = c.getStyle();
                context.fillRect(0, y, width, 1);
            }
            break;
        case 'ocean_world':
            oceanColor = new THREE.Color(0x1e90ff); // DodgerBlue
            landColor = new THREE.Color(0x32cd32); // LimeGreen
            context.fillStyle = oceanColor.getStyle();
            context.fillRect(0, 0, width, height);
            // 小さな島々
            for (let i = 0; i < 1000; i++) {
                context.fillStyle = landColor.getStyle();
                context.fillRect(Math.random() * width, Math.random() * height, 3, 3);
            }
            break;
        case 'ice_world':
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, width, height);
            // ひび割れ
            for (let i = 0; i < 50; i++) {
                context.strokeStyle = '#cccccc';
                context.beginPath();
                context.moveTo(Math.random() * width, Math.random() * height);
                context.lineTo(Math.random() * width, Math.random() * height);
                context.stroke();
            }
            break;
        case 'desert_world':
            context.fillStyle = new THREE.Color(0xF4A460).getStyle(); // SandyBrown
            context.fillRect(0, 0, width, height);
            // 砂丘
            for (let i = 0; i < height; i += 4) {
                context.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
                context.fillRect(0, i, width, 2);
            }
            break;
        case 'terran':
        default:
            oceanColor = new THREE.Color(0x4682b4); // SteelBlue
            landColor = new THREE.Color(0x228b22); // ForestGreen
            context.fillStyle = oceanColor.getStyle();
            context.fillRect(0, 0, width, height);
            // 大陸
            for (let i = 0; i < 50000; i++) {
                if (Math.random() > water) {
                    context.fillStyle = landColor.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.2).getStyle();
                    context.fillRect(Math.random() * width, Math.random() * height, 2, 2);
                }
            }
            break;
    }
    // 法線マップ生成ロジック (簡略版)
    normalContext.drawImage(canvas, 0, 0);
    const imgData = context.getImageData(0, 0, width, height);
    const normalData = normalContext.createImageData(width, height);
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const i = (y * width + x) * 4;
            const tx = (imgData.data[i - 4] - imgData.data[i + 4]) / 255;
            const ty = (imgData.data[i - width * 4] - imgData.data[i + width * 4]) / 255;
            const normal = new THREE.Vector3(tx, ty, 1).normalize();
            normalData.data[i] = (normal.x * 0.5 + 0.5) * 255;
            normalData.data[i + 1] = (normal.y * 0.5 + 0.5) * 255;
            normalData.data[i + 2] = (normal.z * 0.5 + 0.5) * 255;
            normalData.data[i + 3] = 255;
        }
    }
    normalContext.putImageData(normalData, 0, 0);
    
    return { map: new THREE.CanvasTexture(canvas), normalMap: new THREE.CanvasTexture(normalCanvas) };
};

function createCelestialBody(type, options = {}) {
    let body;
    const materialParams = { color: new THREE.Color(0xffffff), roughness: 0.8, metalness: 0.2, emissive: new THREE.Color(0x000000), emissiveIntensity: 0.2 };
    let radius = 1;
    let gameMass;
    let starParams = null;
    let planetParams = null;
    const starColors = {
        'red': new THREE.Color(0xFF4000),
        'orange': new THREE.Color(0xFFA500),
        'yellow': new THREE.Color(0xFFFF00),
        'white': new THREE.Color(0xFFFFFF),
        'blue': new THREE.Color(0x87CEEB)
    };

    const createRealisticAsteroid = (radius) => {
        const geometry = new THREE.SphereGeometry(radius, 32, 32);
        const position = geometry.attributes.position;
        const vertex = new THREE.Vector3();
        for (let i = 0; i < position.count; i++){
            vertex.fromBufferAttribute(position, i);
            vertex.multiplyScalar(1 + (Math.random() - 0.5) * 0.6);
            if (Math.random() < 0.1) {
                 vertex.multiplyScalar(0.9 + Math.random() * 0.05);
            }
            position.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        geometry.computeVertexNormals();
        return geometry;
    };

    // 質量と半径の決定ロジック
    if (options.isLoading) {
        const data = options.userData;
        gameMass = data.mass;
        radius = data.radius || 1;
        if (type === 'planet') planetParams = data;
        else if (type === 'star') starParams = data;
    } else {
        switch (type) {
            case 'star':
                starParams = createStar();
                gameMass = parseFloat(starParams.mass) * 1000;
                break;
            case 'planet':
                planetParams = createPlanet(options.parent);
                gameMass = parseFloat(planetParams.mass);
                break;
            case 'moon':
                const parentMassForMoon = options.parent ? options.parent.userData.mass : 1000;
                gameMass = parentMassForMoon * (Math.random() * 0.0001 + 0.00001);
                break;
            case 'dwarfPlanet':
                const parentMassForDwarfPlanet = options.parent ? options.parent.userData.mass : 1000;
                gameMass = parentMassForDwarfPlanet * (Math.random() * 0.0005 + 0.00005);
                break;
            case 'asteroid':
                const parentMassForAsteroid = options.parent ? options.parent.userData.mass : 1000;
                gameMass = parentMassForAsteroid * (Math.random() * 0.00001 + 0.000001);
                break;
            case 'comet':
                const parentMassForComet = options.parent ? options.parent.userData.mass : 1000;
                gameMass = parentMassForComet * (Math.random() * 0.000005 + 0.0000005);
                break;
            case 'black_hole':
                gameMass = options.mass || 10000000;
                radius = options.radius || 500;
                break;
        }
    }

    // 3Dオブジェクトの生成ロジック
    switch (type) {
        case 'black_hole':
            const blackHoleGroup = new THREE.Group();
            
            // ブラックホール本体（輪郭線付き）
            const horizonMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x000000, 
                transparent: true, 
                opacity: 0.9,
                depthTest: false, // 常に表示
                fog: false // フォグの影響を受けない
            });
            const horizon = new THREE.Mesh(starGeometry.clone(), horizonMaterial);
            horizon.scale.set(radius, radius, radius);
            horizon.renderOrder = 1000; // 最前面に表示
            horizon.frustumCulled = false; // フラスタムカリングを無効化
            blackHoleGroup.add(horizon);
            
            // 輪郭線（外側のリング）
            const outlineMaterial = new THREE.MeshBasicMaterial({ 
                color: 0x444444, 
                transparent: true, 
                opacity: 0.8,
                side: THREE.BackSide,
                depthTest: false,
                fog: false // フォグの影響を受けない
            });
            const outline = new THREE.Mesh(starGeometry.clone(), outlineMaterial);
            outline.scale.set(radius * 1.05, radius * 1.05, radius * 1.05);
            outline.renderOrder = 999;
            outline.frustumCulled = false; // フラスタムカリングを無効化
            blackHoleGroup.add(outline);

            const edgeGlowGeometry = new THREE.TorusGeometry(radius * 1.02, radius * 0.05, 16, 100);
            const edgeGlowMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffd700, 
                blending: THREE.AdditiveBlending, 
                side: THREE.DoubleSide, 
                transparent: true, 
                opacity: 1.0,
                depthTest: false,
                fog: false // フォグの影響を受けない
            });
            const edgeGlow = new THREE.Mesh(edgeGlowGeometry, edgeGlowMaterial);
            edgeGlow.name = 'black_hole_edge_glow';
            edgeGlow.renderOrder = 1001;
            edgeGlow.frustumCulled = false; // フラスタムカリングを無効化
            blackHoleGroup.add(edgeGlow);

            const diskGeometry = new THREE.RingGeometry(radius * 1.1, radius * 2.5, 64);
            const canvas = document.createElement('canvas');
            canvas.width = 256; canvas.height = 256;
            const context = canvas.getContext('2d');
            const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
            gradient.addColorStop(0, 'rgba(255, 200, 0, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 256, 256);
            const diskTexture = new THREE.CanvasTexture(canvas);
            const diskMaterial = new THREE.MeshBasicMaterial({ 
                map: diskTexture, 
                side: THREE.DoubleSide, 
                transparent: true, 
                blending: THREE.AdditiveBlending,
                depthTest: false,
                opacity: 0.9,
                fog: false // フォグの影響を受けない
            });
            const disk = new THREE.Mesh(diskGeometry, diskMaterial);
            disk.rotation.x = Math.PI / 2;
            disk.renderOrder = 998;
            disk.frustumCulled = false; // フラスタムカリングを無効化
            blackHoleGroup.add(disk);
            
            // ブラックホールグループ全体の設定
            blackHoleGroup.frustumCulled = false; // グループ全体でフラスタムカリングを無効化
            
            body = blackHoleGroup;
            break;
        case 'star':
            radius = Math.cbrt(gameMass) * 0.8;
            const starColor = starColors[starParams.spectralType] || new THREE.Color(0xffffff);
            materialParams.color.set(starColor);
            materialParams.emissive.set(starColor);
            materialParams.emissiveIntensity = 2.0;
            
            // Use object pooling for star geometry and material
            const starSphereGeometry = celestialObjectPools.getSphereGeometry(radius);
            const starMaterial = celestialObjectPools.getMaterial('star', materialParams);
            body = new THREE.Mesh(starSphereGeometry, starMaterial);
            body.scale.set(radius, radius, radius);
            
            // Store metadata for pooling
            body.userData.originalRadius = radius;
            body.userData.materialType = 'star';
            break;
        case 'planet':
            radius = Math.cbrt(gameMass) * 2.0;
            const maps = createRealisticPlanetMaps(planetParams.subType, planetParams.water, planetParams.atmosphere);
            const planetMaterial = celestialObjectPools.getMaterial('planet', { 
                map: maps.map, 
                normalMap: maps.normalMap, 
                normalScale: new THREE.Vector2(0.5, 0.5), 
                emissive: new THREE.Color(0xffffff), 
                emissiveIntensity: 0.1, 
                roughness: 0.7 
            });
            
            // Use pooled geometry for planet
            const planetGeometry = celestialObjectPools.getSphereGeometry(radius);
            const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
            planetMesh.scale.set(radius, radius, radius);
            planetMesh.userData.originalRadius = radius;
            planetMesh.userData.materialType = 'planet';
            
            body = new THREE.Group();
            body.add(planetMesh);
            
            if (planetParams.atmosphere > 0.1) {
                let atmosphereColor = 0xffffff;
                if (planetParams.subType === 'neptune_like') atmosphereColor = 0x4169E1;
                else if (planetParams.subType === 'terran' || planetParams.subType === 'ocean_world') atmosphereColor = 0x87ceeb;
                
                const atmosphereMaterial = celestialObjectPools.getMaterial('atmosphere', { 
                    color: atmosphereColor, 
                    transparent: true, 
                    opacity: parseFloat(planetParams.atmosphere) * 0.3, 
                    blending: THREE.AdditiveBlending 
                });
                const atmosphereGeometry = celestialObjectPools.getSphereGeometry(radius * 1.05);
                const atmosphereSphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
                atmosphereSphere.name = 'atmosphere';
                atmosphereSphere.scale.set(radius * 1.05, radius * 1.05, radius * 1.05);
                atmosphereSphere.userData.originalRadius = radius * 1.05;
                atmosphereSphere.userData.materialType = 'atmosphere';
                body.add(atmosphereSphere);
            }
            if (planetParams.planetType === 'gas_giant' && Math.random() < 0.5) {
                const ringTexture = new THREE.CanvasTexture(document.createElement('canvas'));
                const ringMaterial = new THREE.MeshBasicMaterial({ map: ringTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
                const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 1.5, radius * 2.5, 64), ringMaterial);
                ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
                body.add(ring);
            }
            break;
        case 'asteroid':
            radius = Math.cbrt(gameMass) * 5.0;
            const asteroidGeom = createRealisticAsteroid(radius);
            const asteroidMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9, metalness: 0.5 });
            body = new THREE.Mesh(asteroidGeom, asteroidMaterial);
            break;
        case 'comet':
            radius = Math.cbrt(gameMass) * 8.0;
            const coreMaterial = new THREE.MeshBasicMaterial({ color: 0xaaddff, blending: THREE.AdditiveBlending });
            body = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16), coreMaterial);
            break;
        default:
            body = new THREE.Mesh(starGeometry.clone(), new THREE.MeshStandardMaterial({color: 0xff00ff})); // Magenta for unknown
            break;
    }

    let finalUserData = {
        type: type,
        name: options.name || `${type}-${Math.random().toString(16).slice(2, 8)}`,
        creationYear: gameState.gameYear,
        mass: gameMass,
        velocity: options.velocity ? options.velocity.clone() : new THREE.Vector3(0, 0, 0),
        acceleration: new THREE.Vector3(0, 0, 0), // 加速度を初期化
        isStatic: type === 'black_hole',
        radius: radius
    };

    // 既存のuserDataとの統合（velocityを配列で上書きしないよう注意）
    const additionalData = options.isLoading ? options.userData : (planetParams || starParams);
    if (additionalData) {
        Object.assign(finalUserData, body.userData, additionalData);
        // velocityが配列として復元された場合は、Vector3に変換し直す
        if (Array.isArray(finalUserData.velocity)) {
            finalUserData.velocity = new THREE.Vector3().fromArray(finalUserData.velocity);
        }
        // accelerationも初期化
        if (!finalUserData.acceleration) {
            finalUserData.acceleration = new THREE.Vector3(0, 0, 0);
        } else if (Array.isArray(finalUserData.acceleration)) {
            finalUserData.acceleration = new THREE.Vector3().fromArray(finalUserData.acceleration);
        }
        
        // 安全装置：初期値が有限数であることを確認
        if (!isFinite(finalUserData.velocity.x) || !isFinite(finalUserData.velocity.y) || !isFinite(finalUserData.velocity.z)) {
            console.warn(`Invalid velocity detected for ${finalUserData.name}, resetting to zero.`);
            finalUserData.velocity.set(0, 0, 0);
        }
        if (!isFinite(finalUserData.acceleration.x) || !isFinite(finalUserData.acceleration.y) || !isFinite(finalUserData.acceleration.z)) {
            console.warn(`Invalid acceleration detected for ${finalUserData.name}, resetting to zero.`);
            finalUserData.acceleration.set(0, 0, 0);
        }
    }
    body.userData = finalUserData;

    if (options.position) {
        body.position.copy(options.position);
    }

    if (type === 'star' && !options.isLoading) {
        const pointLight = new THREE.PointLight(materialParams.emissive, 2, 4000);
        body.add(pointLight);
    }

    return body;
}

function createStarfield() {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: true });
    const starsVertices = [];
    // 密度を減らし（20000→8000）、範囲を拡大（8000→20000）
    for (let i = 0; i < 8000; i++) {
        const x = (Math.random() - 0.5) * 20000;
        const y = (Math.random() - 0.5) * 20000;
        const z = (Math.random() - 0.5) * 20000;
        starsVertices.push(x, y, z);
    }
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    const starfield = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starfield);
}

function switchTab(activeTab) {
    ui.gameScreen.classList.add('hidden-screen');
    ui.researchScreen.classList.add('hidden-screen');
    ui.optionsScreen.classList.add('hidden-screen');
    ui.starManagementScreen.classList.add('hidden-screen');
    ui.gameTabButton.classList.remove('active-tab');
    ui.researchTabButton.classList.remove('active-tab');
    ui.optionsTabButton.classList.remove('active-tab');
    ui.starManagementTabButton.classList.remove('active-tab');

    if (activeTab === 'game') {
        ui.gameScreen.classList.remove('hidden-screen');
        ui.gameTabButton.classList.add('active-tab');
    } else if (activeTab === 'research') {
        ui.researchScreen.classList.remove('hidden-screen');
        ui.researchTabButton.classList.add('active-tab');
    } else if (activeTab === 'options') {
        ui.optionsScreen.classList.remove('hidden-screen');
        ui.optionsTabButton.classList.add('active-tab');
    } else if (activeTab === 'starManagement') {
        ui.starManagementScreen.classList.remove('hidden-screen');
        ui.starManagementTabButton.classList.add('active-tab');
        updateStarList();
    }
}

const UnitConverter = {
    SOLAR_MASS_KG: 1.989e30,
    EARTH_MASS_KG: 5.972e24,
    EARTH_RADIUS_M: 6.371e6,
    YEAR_SECONDS: 3.154e7,
    convertStarMass: (mass, unitSystem) => unitSystem === 'si' ? `${(mass * UnitConverter.SOLAR_MASS_KG).toExponential(2)} kg` : `${mass} M☉`,
    convertStarTemperature: (temp, unitSystem) => `${temp} K`,
    convertStarLifespan: (lifespan, unitSystem) => unitSystem === 'si' ? `${(lifespan * 1e9 * UnitConverter.YEAR_SECONDS).toExponential(2)} 秒` : `${lifespan} 億年`,
    convertPlanetMass: (mass, unitSystem) => unitSystem === 'si' ? `${(mass * UnitConverter.EARTH_MASS_KG).toExponential(2)} kg` : `${mass} M⊕`,
    convertPlanetRadius: (radius, unitSystem) => unitSystem === 'si' ? `${(radius * UnitConverter.EARTH_RADIUS_M).toExponential(2)} m` : `${radius} R⊕`,
    convertPlanetTemperature: (temp, unitSystem) => unitSystem === 'si' ? `${temp + 273.15} K` : `${temp} ℃`,
    convertPlanetAtmosphere: (atm, unitSystem) => unitSystem === 'si' ? `${atm.toFixed(2)} (0-1)` : `${(atm * 100).toFixed(0)} %`,
    convertPlanetWater: (water, unitSystem) => unitSystem === 'si' ? `${water.toFixed(2)} (0-1)` : `${(water * 100).toFixed(0)} %`,
    convertGameYear: (year, unitSystem) => unitSystem === 'si' ? `${(year * UnitConverter.YEAR_SECONDS).toExponential(2)} 秒` : `${Math.floor(year)} 年`
};

function saveGame() {
    const savableStars = gameState.stars.map(star => {
        // Destructure to remove non-serializable 'tail' and handle 'velocity' separately
        const { tail, velocity, acceleration, ...serializableUserData } = star.userData;

        // 安全装置：保存前に値が有限数であることを確認
        const safeVelocity = velocity && isFinite(velocity.x) && isFinite(velocity.y) && isFinite(velocity.z) 
            ? velocity.toArray() 
            : [0, 0, 0];
        const safeAcceleration = acceleration && isFinite(acceleration.x) && isFinite(acceleration.y) && isFinite(acceleration.z)
            ? acceleration.toArray()
            : [0, 0, 0];

        return {
            position: star.position.toArray(),
            userData: {
                ...serializableUserData,
                velocity: safeVelocity, // Convert Vector3 to array for JSON
                acceleration: safeAcceleration
            }
        };
    });
    const savableState = { ...gameState, stars: savableStars };
    localStorage.setItem('cosmicGardenerState', JSON.stringify(savableState));
}

function loadGame() {
    const savedState = localStorage.getItem('cosmicGardenerState');
    if (!savedState) return;

    let parsedState;
    try {
        parsedState = JSON.parse(savedState);
    } catch (e) {
        console.error("Failed to parse saved state:", e);
        return;
    }

    if (parsedState.saveVersion !== gameState.saveVersion) {
        console.warn(`Save version mismatch. Discarding save.`);
        localStorage.removeItem('cosmicGardenerState');
        return;
    }

    const { stars, ...restOfState } = parsedState;
    Object.assign(gameState, restOfState);

    gameState.stars.forEach(star => removeAndDispose(star));
    gameState.stars = stars.map(starData => {
        // 安全装置：ロード時のデータ検証
        const safePosition = starData.position && Array.isArray(starData.position) && starData.position.length >= 3
            ? starData.position
            : [0, 0, 0];
        const safeVelocity = starData.userData.velocity && Array.isArray(starData.userData.velocity) && starData.userData.velocity.length >= 3
            ? starData.userData.velocity
            : [0, 0, 0];
        const safeAcceleration = starData.userData.acceleration && Array.isArray(starData.userData.acceleration) && starData.userData.acceleration.length >= 3
            ? starData.userData.acceleration
            : [0, 0, 0];
            
        // 値が有限数かチェック
        const position = new THREE.Vector3().fromArray(safePosition);
        const velocity = new THREE.Vector3().fromArray(safeVelocity);
        const acceleration = new THREE.Vector3().fromArray(safeAcceleration);
        
        if (!isFinite(position.x) || !isFinite(position.y) || !isFinite(position.z)) {
            position.set(0, 0, 0);
        }
        if (!isFinite(velocity.x) || !isFinite(velocity.y) || !isFinite(velocity.z)) {
            velocity.set(0, 0, 0);
        }
        if (!isFinite(acceleration.x) || !isFinite(acceleration.y) || !isFinite(acceleration.z)) {
            acceleration.set(0, 0, 0);
        }
        
        const body = createCelestialBody(starData.userData.type, {
            position: position,
            velocity: velocity,
            isLoading: true,
            userData: { ...starData.userData, acceleration: acceleration }
        });

        // Re-create visual elements that are not saved
        if (body.userData.hasLife) {
            const auraMaterial = celestialObjectPools.getMaterial('lifeAura');
            const radius = body.userData.radius || 1;
            const auraGeometry = celestialObjectPools.getSphereGeometry(radius * 1.1);
            const auraSphere = new THREE.Mesh(auraGeometry, auraMaterial);
            auraSphere.scale.set(radius * 1.1, radius * 1.1, radius * 1.1);
            auraSphere.name = 'life_aura';
            auraSphere.userData.originalRadius = radius * 1.1;
            auraSphere.userData.materialType = 'lifeAura';
            body.add(auraSphere);
        }
        if (body.userData.lifeStage === 'intelligent') {
            const planetMesh = body.children.find(c => c.type === 'Mesh');
            if (planetMesh && planetMesh.material && planetMesh.material.map) {
                const texture = planetMesh.material.map;
                const canvas = texture.image;
                const context = canvas.getContext('2d');
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
                    if (brightness < 80 && Math.random() < 0.1) {
                        data[i] = 255; data[i + 1] = 220; data[i + 2] = 180;
                    }
                }
                context.putImageData(imageData, 0, 0);
                texture.needsUpdate = true;
            }
        }
        
        scene.add(body);
        return body;
    });
}

function focusOnStar(starObject) {
    focusedStar = starObject;
    // cameraOffsetの計算を削除
}

function updateUI() {
    // Calculate current values
    const currentGameYear = Math.floor(gameState.gameYear);
    const currentCosmicDust = Math.floor(gameState.cosmicDust);
    const currentDustRate = (gameState.currentDustRate || 0).toFixed(1);
    const currentEnergy = Math.floor(gameState.energy);
    const currentOrganicMatter = Math.floor(gameState.organicMatter);
    const currentBiomass = Math.floor(gameState.biomass);
    const currentDarkMatter = Math.floor(gameState.darkMatter);
    const currentThoughtPoints = Math.floor(gameState.thoughtPoints);
    const currentStarCount = gameState.stars.length;
    const currentCosmicActivity = Math.floor(gameState.cosmicActivity);
    const currentTotalPopulation = Math.floor(gameState.cachedTotalPopulation || 0);

    // --- Update UI elements if they have changed ---

    // Game Year
    if (previousUIValues.gameYear !== currentGameYear) {
        if (ui.gameYear) ui.gameYear.textContent = currentGameYear;
        previousUIValues.gameYear = currentGameYear;
    }

    // Cosmic Dust
    if (previousUIValues.cosmicDust !== currentCosmicDust) {
        if (ui.cosmicDust) ui.cosmicDust.textContent = currentCosmicDust;
        if (ui.overlayCosmicDust) ui.overlayCosmicDust.textContent = currentCosmicDust;
        previousUIValues.cosmicDust = currentCosmicDust;
    }

    // Dust Rate
    if (previousUIValues.dustRate !== currentDustRate) {
        if (ui.dustRate) ui.dustRate.textContent = currentDustRate;
        previousUIValues.dustRate = currentDustRate;
    }

    // Energy
    if (previousUIValues.energy !== currentEnergy) {
        if (ui.energy) ui.energy.textContent = currentEnergy;
        if (ui.overlayEnergy) ui.overlayEnergy.textContent = currentEnergy;
        previousUIValues.energy = currentEnergy;
    }

    // Organic Matter
    if (previousUIValues.organicMatter !== currentOrganicMatter) {
        if (ui.organicMatter) ui.organicMatter.textContent = currentOrganicMatter;
        previousUIValues.organicMatter = currentOrganicMatter;
    }

    // Biomass
    if (previousUIValues.biomass !== currentBiomass) {
        if (ui.biomass) ui.biomass.textContent = currentBiomass;
        previousUIValues.biomass = currentBiomass;
    }

    // Star Count
    if (previousUIValues.starCount !== currentStarCount) {
        if (ui.starCount) ui.starCount.textContent = currentStarCount;
        if (ui.overlayStarCount) ui.overlayStarCount.textContent = currentStarCount;
        previousUIValues.starCount = currentStarCount;
    }
    
    // Cosmic Activity
    if (previousUIValues.cosmicActivity !== currentCosmicActivity) {
        if (ui.overlayCosmicActivity) ui.overlayCosmicActivity.textContent = currentCosmicActivity;
        previousUIValues.cosmicActivity = currentCosmicActivity;
    }

    // Total Population
    if (previousUIValues.totalPopulation !== currentTotalPopulation) {
        if (ui.overlayPopulation) ui.overlayPopulation.textContent = currentTotalPopulation.toLocaleString();
        previousUIValues.totalPopulation = currentTotalPopulation;
    }

    // Thought Speed
    const LIGHT_SPEED = 299792458;
    const currentThoughtSpeedMps = gameState.thoughtSpeedMps;
    const currentLightSpeedPercent = ((currentThoughtSpeedMps / LIGHT_SPEED) * 100).toFixed(2);
    if (previousUIValues.thoughtSpeedMps !== currentThoughtSpeedMps) {
        if (ui.thoughtSpeedMps) ui.thoughtSpeedMps.textContent = currentThoughtSpeedMps.toLocaleString(undefined, { maximumFractionDigits: 0 });
        previousUIValues.thoughtSpeedMps = currentThoughtSpeedMps;
    }
    if (previousUIValues.lightSpeedPercent !== currentLightSpeedPercent) {
        if (ui.lightSpeedPercent) ui.lightSpeedPercent.textContent = currentLightSpeedPercent;
        previousUIValues.lightSpeedPercent = currentLightSpeedPercent;
    }

    // Upgrades
    const nextDustUpgradeCost = mathCache.getDustUpgradeCost();
    if (previousUIValues.dustUpgradeLevel !== gameState.dustUpgradeLevel) {
        if (ui.dustUpgradeLevel) ui.dustUpgradeLevel.textContent = gameState.dustUpgradeLevel;
        previousUIValues.dustUpgradeLevel = gameState.dustUpgradeLevel;
    }
    if (previousUIValues.dustUpgradeCost !== nextDustUpgradeCost) {
        if (ui.dustUpgradeCost) ui.dustUpgradeCost.textContent = nextDustUpgradeCost;
        if (ui.upgradeDustButton) ui.upgradeDustButton.disabled = gameState.energy < nextDustUpgradeCost;
        previousUIValues.dustUpgradeCost = nextDustUpgradeCost;
    }
    const nextConverterCost = mathCache.getConverterCost();
    if (previousUIValues.darkMatterConverterLevel !== gameState.darkMatterConverterLevel) {
        if (ui.darkMatterConverterLevel) ui.darkMatterConverterLevel.textContent = gameState.darkMatterConverterLevel;
        previousUIValues.darkMatterConverterLevel = gameState.darkMatterConverterLevel;
    }
    if (previousUIValues.darkMatterConverterCost !== nextConverterCost) {
        if (ui.darkMatterConverterCost) ui.darkMatterConverterCost.textContent = nextConverterCost;
        if (ui.upgradeDarkMatterConverterButton) ui.upgradeDarkMatterConverterButton.disabled = gameState.energy < nextConverterCost;
        previousUIValues.darkMatterConverterCost = nextConverterCost;
    }

    // Research Buttons
    if (previousUIValues.researchStates.enhancedDust !== gameState.researchEnhancedDust) {
        if (ui.researchEnhancedDustStatus) ui.researchEnhancedDustStatus.textContent = gameState.researchEnhancedDust ? '完了' : '未完了';
        if (ui.researchEnhancedDustButton) ui.researchEnhancedDustButton.disabled = gameState.researchEnhancedDust || gameState.darkMatter < 1;
        previousUIValues.researchStates.enhancedDust = gameState.researchEnhancedDust;
    }
    if (previousUIValues.researchStates.advancedEnergy !== gameState.researchAdvancedEnergy) {
        if (ui.researchAdvancedEnergyStatus) ui.researchAdvancedEnergyStatus.textContent = gameState.researchAdvancedEnergy ? '完了' : '未完了';
        if (ui.researchAdvancedEnergyButton) ui.researchAdvancedEnergyButton.disabled = gameState.researchAdvancedEnergy || gameState.darkMatter < 2;
        previousUIValues.researchStates.advancedEnergy = gameState.researchAdvancedEnergy;
    }
    if (previousUIValues.unlockedBodies.moon !== gameState.unlockedCelestialBodies.moon) {
        if (ui.researchMoonStatus) ui.researchMoonStatus.textContent = gameState.unlockedCelestialBodies.moon ? '完了' : '未完了';
        if (ui.researchMoonButton) ui.researchMoonButton.disabled = gameState.unlockedCelestialBodies.moon || gameState.darkMatter < 1;
        if (ui.createMoonButton) ui.createMoonButton.style.display = gameState.unlockedCelestialBodies.moon ? 'block' : 'none';
        previousUIValues.unlockedBodies.moon = gameState.unlockedCelestialBodies.moon;
    }
    if (previousUIValues.unlockedBodies.dwarfPlanet !== gameState.unlockedCelestialBodies.dwarfPlanet) {
        if (ui.researchDwarfPlanetStatus) ui.researchDwarfPlanetStatus.textContent = gameState.unlockedCelestialBodies.dwarfPlanet ? '完了' : '未完了';
        if (ui.researchDwarfPlanetButton) ui.researchDwarfPlanetButton.disabled = gameState.unlockedCelestialBodies.dwarfPlanet || gameState.darkMatter < 2;
        if (ui.createDwarfPlanetButton) ui.createDwarfPlanetButton.style.display = gameState.unlockedCelestialBodies.dwarfPlanet ? 'block' : 'none';
        previousUIValues.unlockedBodies.dwarfPlanet = gameState.unlockedCelestialBodies.dwarfPlanet;
    }
    if (previousUIValues.unlockedBodies.planet !== gameState.unlockedCelestialBodies.planet) {
        if (ui.researchPlanetStatus) ui.researchPlanetStatus.textContent = gameState.unlockedCelestialBodies.planet ? '完了' : '未完了';
        if (ui.researchPlanetButton) ui.researchPlanetButton.disabled = gameState.unlockedCelestialBodies.planet || gameState.darkMatter < 3;
        if (ui.createPlanetButton) ui.createPlanetButton.style.display = gameState.unlockedCelestialBodies.planet ? 'block' : 'none';
        previousUIValues.unlockedBodies.planet = gameState.unlockedCelestialBodies.planet;
    }
    if (previousUIValues.unlockedBodies.star !== gameState.unlockedCelestialBodies.star) {
        if (ui.researchStarStatus) ui.researchStarStatus.textContent = gameState.unlockedCelestialBodies.star ? '完了' : '未完了';
        if (ui.researchStarButton) ui.researchStarButton.disabled = gameState.unlockedCelestialBodies.star || gameState.darkMatter < 5;
        if (ui.createStarButton) ui.createStarButton.style.display = gameState.unlockedCelestialBodies.star ? 'block' : 'none';
        previousUIValues.unlockedBodies.star = gameState.unlockedCelestialBodies.star;
    }

    // Physics Settings
    if (ui.gravitySlider) {
        ui.gravitySlider.value = gameState.physics.G;
        ui.gravityValue.textContent = gameState.physics.G;
        ui.simulationSpeedSlider.value = gameState.physics.simulationSpeed;
        ui.simulationSpeedValue.textContent = `${gameState.physics.simulationSpeed}x`;
        ui.dragSlider.value = gameState.physics.dragFactor;
        ui.dragValue.textContent = gameState.physics.dragFactor;
    }

    // Focused Body Info
    if (focusedStar && ui.focusedStarName) {
        ui.focusedStarName.textContent = `フォーカス中: ${focusedStar.userData.name}`;
        if (focusedStar.userData.type === 'star') {
            if (ui.starParameters) ui.starParameters.classList.remove('hidden');
            if (ui.planetParameters) ui.planetParameters.classList.add('hidden');
            const starAgeInYears = (gameState.gameYear - focusedStar.userData.creationYear);
            if (ui.focusedStarAge) ui.focusedStarAge.textContent = UnitConverter.convertGameYear(starAgeInYears, gameState.currentUnitSystem);
            if (ui.focusedStarTemp) ui.focusedStarTemp.textContent = UnitConverter.convertStarTemperature(focusedStar.userData.temperature, gameState.currentUnitSystem);
            if (ui.focusedStarMass) ui.focusedStarMass.textContent = UnitConverter.convertStarMass(focusedStar.userData.mass, gameState.currentUnitSystem);
            if (ui.focusedStarLifespan) ui.focusedStarLifespan.textContent = UnitConverter.convertStarLifespan(focusedStar.userData.lifespan, gameState.currentUnitSystem);
            if (ui.focusedStarSpeed) ui.focusedStarSpeed.textContent = focusedStar.userData.velocity.length().toFixed(2);
        } else if (focusedStar.userData.type === 'planet') {
            if (ui.starParameters) ui.starParameters.classList.add('hidden');
            if (ui.planetParameters) ui.planetParameters.classList.remove('hidden');

            const planetTypeJa = focusedStar.userData.planetType === 'rocky' ? '岩石惑星' : '巨大ガス惑星';
            let subTypeJa = '';
            switch (focusedStar.userData.subType) {
                case 'terran': subTypeJa = '地球型'; break;
                case 'ocean_world': subTypeJa = '海洋惑星'; break;
                case 'desert_world': subTypeJa = '砂漠惑星'; break;
                case 'ice_world': subTypeJa = '氷雪惑星'; break;
                case 'jupiter_like': subTypeJa = '木星型'; break;
                case 'neptune_like': subTypeJa = '天王星型'; break;
            }
            if (ui.focusedPlanetType) ui.focusedPlanetType.textContent = `${planetTypeJa} (${subTypeJa})`;

            if (ui.focusedPlanetMass && focusedStar.userData.mass !== undefined) {
                ui.focusedPlanetMass.textContent = UnitConverter.convertPlanetMass(focusedStar.userData.mass, gameState.currentUnitSystem);
            }
            if (ui.focusedPlanetRadius && focusedStar.userData.radius !== undefined) {
                ui.focusedPlanetRadius.textContent = UnitConverter.convertPlanetRadius(focusedStar.userData.radius, gameState.currentUnitSystem);
            }
            if (ui.focusedPlanetAtmosphere && focusedStar.userData.atmosphere !== undefined) {
                ui.focusedPlanetAtmosphere.textContent = UnitConverter.convertPlanetAtmosphere(focusedStar.userData.atmosphere, gameState.currentUnitSystem);
            }
            if (ui.focusedPlanetWater && focusedStar.userData.water !== undefined) {
                ui.focusedPlanetWater.textContent = UnitConverter.convertPlanetWater(focusedStar.userData.water, gameState.currentUnitSystem);
            }
            if (ui.focusedPlanetHabitability && focusedStar.userData.habitability !== undefined) {
                ui.focusedPlanetHabitability.textContent = `${focusedStar.userData.habitability} %`;
            }

            if (focusedStar.userData.planetType === 'rocky') {
                if (ui.focusedPlanetGeologyRow) ui.focusedPlanetGeologyRow.style.display = 'block';
                if (ui.focusedPlanetGeology && focusedStar.userData.geologicalActivity !== undefined) {
                    ui.focusedPlanetGeology.textContent = `${(parseFloat(focusedStar.userData.geologicalActivity) * 100).toFixed(0)} %`;
                }
            } else {
                if (ui.focusedPlanetGeologyRow) ui.focusedPlanetGeologyRow.style.display = 'none';
            }

            if (ui.focusedPlanetHasLife) ui.focusedPlanetHasLife.textContent = focusedStar.userData.hasLife ? 'はい' : 'いいえ';
            if (ui.focusedPlanetLifeStage) ui.focusedPlanetLifeStage.textContent = focusedStar.userData.lifeStage || '-';
            if (ui.focusedPlanetPopulation) ui.focusedPlanetPopulation.textContent = focusedStar.userData.population ? Math.floor(focusedStar.userData.population).toLocaleString() : '0';
            if (ui.focusedPlanetSpeed && focusedStar.userData.velocity) ui.focusedPlanetSpeed.textContent = focusedStar.userData.velocity.length().toFixed(2);
        }
    } else {
        if (ui.focusedStarName) ui.focusedStarName.textContent = 'フォーカス中の星はありません';
        if (ui.starParameters) ui.starParameters.classList.add('hidden');
        if (ui.planetParameters) ui.planetParameters.classList.add('hidden');
    }
}

let messageTimeout;
function showMessage(message, duration = 2000) {
    clearTimeout(messageTimeout);
    ui.messageText.textContent = message;
    ui.messageOverlay.style.display = 'block';
    ui.messageOverlay.classList.remove('hidden');
    ui.messageOverlay.style.opacity = 1;
    messageTimeout = setTimeout(() => {
        ui.messageOverlay.style.opacity = 0;
        ui.messageOverlay.addEventListener('transitionend', () => ui.messageOverlay.classList.add('hidden'), { once: true });
    }, duration);
}

function updateStarList() {
    // Clean up existing event listeners before clearing DOM
    const existingButtons = ui.starListContainer.querySelectorAll('button');
    existingButtons.forEach(button => {
        // Clone node to remove all event listeners
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
    });
    
    ui.starListContainer.innerHTML = '';
    const stars = gameState.stars.filter(star => star.userData.type === 'star');

    if (stars.length === 0) {
        ui.starListContainer.innerHTML = '<p>恒星はまだありません。</p>';
        return;
    }

    // Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();

    stars.forEach(star => {
        const starItem = document.createElement('div');
        starItem.classList.add('star-item');

        const starNameButton = document.createElement('button');
        starNameButton.classList.add('star-name-button');
        starNameButton.textContent = star.userData.name;
        starNameButton.dataset.uuid = star.uuid;

        const dropdown = document.createElement('div');
        dropdown.classList.add('star-actions-dropdown', 'hidden');

        const renameButton = document.createElement('button');
        renameButton.textContent = '名前変更';
        renameButton.dataset.uuid = star.uuid;
        renameButton.addEventListener('click', (event) => {
            event.stopPropagation(); // 親要素へのイベント伝播を停止
            const newName = prompt('新しい恒星の名前を入力してください:', star.userData.name);
            if (newName && newName.trim() !== '') {
                star.userData.name = newName.trim();
                updateStarList();
                updateUI();
                saveGame();
            }
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = '削除';
        deleteButton.dataset.uuid = star.uuid;
        deleteButton.addEventListener('click', (event) => {
            event.stopPropagation();
            if (confirm(`${star.userData.name} とその惑星系を本当に削除しますか？`)) {
                // 削除対象の恒星と、その恒星を周回する天体をリストアップ
                const objectsToDelete = gameState.stars.filter(obj => 
                    obj.uuid === star.uuid || 
                    (obj.userData.parentStarName === star.userData.name) // parentStarNameで判定
                );

                objectsToDelete.forEach(obj => {
                    const index = gameState.stars.findIndex(s => s.uuid === obj.uuid);
                    if (index !== -1) {
                        gameState.stars.splice(index, 1);
                    }
                    removeAndDispose(obj);
                });

                if (focusedStar && focusedStar.uuid === star.uuid) {
                    focusedStar = null;
                }
                
                updateStarList();
                updateUI();
                saveGame();
            }
        });

        dropdown.appendChild(renameButton);
        dropdown.appendChild(deleteButton);

        starItem.appendChild(starNameButton);
        starItem.appendChild(dropdown);
        fragment.appendChild(starItem);

        starNameButton.addEventListener('click', () => {
            // 他のドロップダウンを閉じる
            if (ui.starActionsDropdowns) {
                ui.starActionsDropdowns.forEach(d => {
                    if (d !== dropdown) d.classList.add('hidden');
                });
            }
            // クリックしたドロップダウンの表示を切り替え
            dropdown.classList.toggle('hidden');
            focusOnStar(star);
        });
    });
    
    // Single DOM operation instead of multiple appendChild calls
    ui.starListContainer.appendChild(fragment);
    
    // Update cached star actions dropdowns after creating the list
    ui.starActionsDropdowns = document.querySelectorAll('.star-actions-dropdown');
}

function applyGraphicsQuality() {
    switch (gameState.graphicsQuality) {
        case 'low':
            renderer.setPixelRatio(window.devicePixelRatio * 0.5);
            bloomPass.strength = 0.5;
            break;
        case 'medium':
            renderer.setPixelRatio(window.devicePixelRatio * 0.75);
            bloomPass.strength = 1.5;
            break;
        case 'high':
            renderer.setPixelRatio(window.devicePixelRatio);
            bloomPass.strength = 2.0;
            break;
    }
    composer.setSize(window.innerWidth, window.innerHeight);
}

function updateGalaxyMap() {
    const map = ui.galaxyMapContainer;
    if (!map) return;

    if (!gameState.isMapVisible) {
        map.style.display = 'none';
        return;
    }
    map.style.display = 'block';
    map.innerHTML = ''; // マップをクリア

    // Cache map size to avoid repeated clientWidth calls (causes layout reflow)
    let mapSize;
    if (previousGalaxyMapState.mapSize === -1) {
        mapSize = map.clientWidth;
        previousGalaxyMapState.mapSize = mapSize;
    } else {
        mapSize = previousGalaxyMapState.mapSize;
    }
    
    const mapScale = 40000; // 3D空間のどのくらいの範囲をマップに表示するか

    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    if (!blackHole) return;

    const centerX = blackHole.position.x;
    const centerZ = blackHole.position.z;

    // Use DocumentFragment for batch DOM operations
    const fragment = document.createDocumentFragment();

    gameState.stars.forEach(star => {
        const marker = document.createElement('div');
        marker.style.position = 'absolute';

        const relativeX = star.position.x - centerX;
        const relativeZ = star.position.z - centerZ;

        const mapX = (relativeX / mapScale) * mapSize + (mapSize / 2);
        const mapY = (relativeZ / mapScale) * mapSize + (mapSize / 2);

        if (mapX >= 0 && mapX < mapSize && mapY >= 0 && mapY < mapSize) {
            marker.style.left = `${mapX}px`;
            marker.style.top = `${mapY}px`;

            if (star.userData.type === 'black_hole') {
                marker.style.width = '5px';
                marker.style.height = '5px';
                marker.style.backgroundColor = 'red';
                marker.style.borderRadius = '50%';
                marker.style.transform = 'translate(-50%, -50%)'; // 中央に配置
            } else if (star.userData.type === 'star') {
                marker.style.width = '2px';
                marker.style.height = '2px';
                marker.style.backgroundColor = 'white';
                marker.style.borderRadius = '50%';
                marker.style.transform = 'translate(-50%, -50%)'; // 中央に配置
            }
            fragment.appendChild(marker);
        }
    });

    // Single DOM operation instead of multiple appendChild calls
    map.appendChild(fragment);
}

// Debounced galaxy map update function
function debouncedUpdateGalaxyMap() {
    const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
    const currentStarCount = gameState.stars.length;
    const currentIsMapVisible = gameState.isMapVisible;
    const currentBlackHolePos = blackHole ? `${blackHole.position.x},${blackHole.position.z}` : null;
    
    // Check if significant changes have occurred
    const significantChange = 
        previousGalaxyMapState.starCount !== currentStarCount ||
        previousGalaxyMapState.isMapVisible !== currentIsMapVisible ||
        previousGalaxyMapState.blackHolePosition !== currentBlackHolePos;
    
    if (significantChange) {
        updateGalaxyMap();
        previousGalaxyMapState.starCount = currentStarCount;
        previousGalaxyMapState.isMapVisible = currentIsMapVisible;
        previousGalaxyMapState.blackHolePosition = currentBlackHolePos;
    }
}

function updatePhysics(timeStep) {
    // 物理定数の安全性チェック（詳細ログ付き）
    if (!isFinite(gameState.physics.G)) {
        console.warn('Invalid G detected:', gameState.physics.G);
        return;
    }
    if (!isFinite(gameState.physics.dragFactor)) {
        console.warn('Invalid dragFactor detected:', gameState.physics.dragFactor);
        return;
    }
    if (!isFinite(gameState.physics.softeningFactor)) {
        console.warn('Invalid softeningFactor detected:', gameState.physics.softeningFactor);
        return;
    }
    if (!isFinite(timeStep)) {
        console.warn('Invalid timeStep detected:', timeStep);
        return;
    }
    if (timeStep <= 0) {
        console.warn('timeStep is zero or negative:', timeStep);
        return;
    }
    if (timeStep > 10) {
        console.warn('timeStep is too large:', timeStep);
        return;
    }

    // timeStepが大きすぎる場合は制限する
    const safeTimeStep = Math.min(timeStep, 1.0); // 物理計算は最大1.0に制限

    // --- NaNクリーンアップ処理 ---
    const invalidBodies = new Set();
    gameState.stars.forEach(body => {
        if (!isFinite(body.position.x) || !isFinite(body.position.y) || !isFinite(body.position.z)) {
            invalidBodies.add(body.uuid);
            console.error(`Detected and removing invalid body: ${body.userData.name} (UUID: ${body.uuid}) due to non-finite position.`);
        }
    });

    if (invalidBodies.size > 0) {
        gameState.stars = gameState.stars.filter(star => {
            if (invalidBodies.has(star.uuid)) {
                removeAndDispose(star);
                if (focusedStar && focusedStar.uuid === star.uuid) {
                    focusedStar = null;
                }
                return false;
            }
            return true;
        });
    }
    // --- クリーンアップここまで ---

    const bodies = gameState.stars;
    const bodyCount = bodies.length;
    const destroyed = new Set();
    const mergeEvents = [];
    
    // Spatial grid is now updated in the main animation loop for efficiency

    // 1. 加速度の計算
    for (let i = 0; i < bodyCount; i++) {
        const bodyA = bodies[i];
        if (bodyA.userData.isStatic) continue;
        
        // 加速度の安全な初期化
        if (!bodyA.userData.acceleration) {
            bodyA.userData.acceleration = new THREE.Vector3(0, 0, 0);
        }
        
        let totalAcceleration = vector3Pool.get();
        for (let j = 0; j < bodyCount; j++) {
            if (i === j) continue;
            const bodyB = bodies[j];
            const direction = vector3Pool.get().subVectors(bodyB.position, bodyA.position);
            const distanceSq = direction.lengthSq();

            // 距離がゼロに極めて近い場合、計算をスキップしてNaNの発生を防ぐ
            const epsilon = 1e-10; // ゼロと見なすための微小な値
            if (distanceSq < epsilon) {
                vector3Pool.release(direction);
                continue;
            }

            // 方向ベクトルの正規化を安全に行う
            const distance = Math.sqrt(distanceSq);
            if (distance < epsilon) {
                vector3Pool.release(direction);
                continue;
            }
            
            const normalizedDirection = direction.divideScalar(distance);
            
            // 安全装置：正規化された方向ベクトルが有限数かチェック
            if (!isFinite(normalizedDirection.x) || !isFinite(normalizedDirection.y) || !isFinite(normalizedDirection.z)) {
                vector3Pool.release(direction);
                continue;
            }

            const forceMagnitude = (gameState.physics.G * bodyB.userData.mass) / (distanceSq + mathCache.softeningFactorSq);
            
            // 安全装置：力の大きさが有限数かチェック
            if (!isFinite(forceMagnitude)) {
                vector3Pool.release(direction);
                continue;
            }
            
            const acceleration = normalizedDirection.multiplyScalar(forceMagnitude);
            totalAcceleration.add(acceleration);
            vector3Pool.release(direction);
        }
        
        // ドラッグ力を安全に計算
        if (bodyA.userData.velocity && isFinite(bodyA.userData.velocity.x) && 
            isFinite(bodyA.userData.velocity.y) && isFinite(bodyA.userData.velocity.z)) {
            const dragForce = vector3Pool.get().copy(bodyA.userData.velocity).multiplyScalar(-gameState.physics.dragFactor);
            
            // ドラッグ力が有限数かチェック
            if (isFinite(dragForce.x) && isFinite(dragForce.y) && isFinite(dragForce.z)) {
                totalAcceleration.add(dragForce);
            }
            vector3Pool.release(dragForce);
        }

        // 銀河の境界を超えた場合に中心に戻す力を加える
        const distanceFromCenter = bodyA.position.length();
        if (distanceFromCenter > GALAXY_BOUNDARY) {
            const excessDistance = distanceFromCenter - GALAXY_BOUNDARY;
            
            // 位置ベクトルが有効かチェック
            if (distanceFromCenter > 0 && isFinite(distanceFromCenter) && isFinite(excessDistance)) {
                const normalizedPosition = vector3Pool.get().copy(bodyA.position).divideScalar(distanceFromCenter);
                
                // 正規化された位置ベクトルが有限数かチェック
                if (isFinite(normalizedPosition.x) && isFinite(normalizedPosition.y) && isFinite(normalizedPosition.z)) {
                    const restoringForce = normalizedPosition.multiplyScalar(-excessDistance * RESTORING_FORCE_FACTOR);
                    totalAcceleration.add(restoringForce);
                }
                vector3Pool.release(normalizedPosition);
            }
        }

        // 安全装置：加速度が有限数かチェック
        if (!isFinite(totalAcceleration.x) || !isFinite(totalAcceleration.y) || !isFinite(totalAcceleration.z)) {
            console.warn('Detected non-finite acceleration for', bodyA.userData.name, '. Resetting to zero.');
            totalAcceleration.set(0, 0, 0);
        }

        bodyA.userData.acceleration.copy(totalAcceleration);
        vector3Pool.release(totalAcceleration);
    }

    // 2. 衝突判定とイベント記録 (spatial partitioning optimized)
    const checkedPairs = new Set();
    for (let i = 0; i < bodyCount; i++) {
        const bodyA = bodies[i];
        if (destroyed.has(bodyA.uuid)) continue;
        
        const radiusA = (bodyA.children[0] ? bodyA.children[0].scale.x : bodyA.scale.x) || 1;
        const searchRadius = radiusA * 3; // Search within 3x radius for potential collisions
        const nearbyBodies = spatialGrid.getNearbyObjects(bodyA, searchRadius);
        
        for (const bodyB of nearbyBodies) {
            if (bodyA === bodyB || destroyed.has(bodyB.uuid)) continue;
            
            // Create unique pair identifier to avoid checking same pair twice
            const pairId = bodyA.uuid < bodyB.uuid ? `${bodyA.uuid}-${bodyB.uuid}` : `${bodyB.uuid}-${bodyA.uuid}`;
            if (checkedPairs.has(pairId)) continue;
            checkedPairs.add(pairId);

            const distVec = vector3Pool.get().subVectors(bodyA.position, bodyB.position);
            const distance = distVec.length();
            vector3Pool.release(distVec);
            const radiusB = (bodyB.children[0] ? bodyB.children[0].scale.x : bodyB.scale.x) || 1;

            if (distance < radiusA + radiusB) {
                const bigger = bodyA.userData.mass >= bodyB.userData.mass ? bodyA : bodyB;
                const smaller = bigger === bodyA ? bodyB : bodyA;
                if (smaller.userData.type === 'black_hole') continue;
                mergeEvents.push({ bigger, smaller });
                destroyed.add(smaller.uuid);
            }
        }
    }

    // 3. 合体イベントの処理 (安全装置付き)
    mergeEvents.forEach(event => {
        const { bigger, smaller } = event;
        if (!bigger || !smaller || !bigger.userData || !smaller.userData) {
            console.error("合体イベントで無効な天体が検出されました。", event);
            return; // or continue
        }

        const combinedMass = bigger.userData.mass + smaller.userData.mass;
        if (combinedMass <= 0) {
            console.error("合体後の質量が0以下になりました。合体を中止します。", bigger, smaller);
            return; // or continue
        }

        const newVelocity = new THREE.Vector3()
            .add(bigger.userData.velocity.clone().multiplyScalar(bigger.userData.mass))
            .add(smaller.userData.velocity.clone().multiplyScalar(smaller.userData.mass))
            .divideScalar(combinedMass);

        if (!isFinite(newVelocity.x) || !isFinite(newVelocity.y) || !isFinite(newVelocity.z)) {
            console.error("計算の結果、速度が非有限数になりました。合体を中止します。", { bigger, smaller, newVelocity });
            return; // or continue
        }

        bigger.userData.velocity.copy(newVelocity);
        bigger.userData.mass = combinedMass;

        const radiusA = (bigger.children[0] ? bigger.children[0].scale.x : bigger.scale.x) || 1;
        const radiusB = (smaller.children[0] ? smaller.children[0].scale.x : smaller.scale.x) || 1;
        const newRadius = Math.cbrt(Math.pow(radiusA, 3) + Math.pow(radiusB, 3));
        
        if (!isFinite(newRadius)) {
            console.error("計算の結果、半径が非有限数になりました。合体を中止します。", { bigger, smaller, newRadius });
            return; // or continue
        }

        const scaleTarget = bigger.children[0] || bigger;
        scaleTarget.scale.set(newRadius, newRadius, newRadius);

        console.log(`${bigger.userData.name}が${smaller.userData.name}を吸収合体しました。`);
        showMessage(`${bigger.userData.name}が${smaller.userData.name}を吸収合体した！`);
    });

    // 4. 位置の更新
    for (let i = 0; i < bodyCount; i++) {
        const body = bodies[i];
        if (body.userData.isStatic || destroyed.has(body.uuid)) continue;

        // 加速度から新しい速度を計算
        const newVelocity = body.userData.velocity.clone().add(body.userData.acceleration.multiplyScalar(safeTimeStep));

        // 安全装置：新しい速度が有限数かチェック
        if (!isFinite(newVelocity.x) || !isFinite(newVelocity.y) || !isFinite(newVelocity.z)) {
            console.warn('Detected non-finite velocity for', body.userData.name, '. Skipping velocity update.');
            continue; // このフレームの更新をスキップ
        }
        body.userData.velocity.copy(newVelocity);

        // 速度から新しい位置を計算
        const newPosition = body.position.clone().add(body.userData.velocity.clone().multiplyScalar(safeTimeStep));

        // 安全装置：新しい位置が有限数かチェック
        if (!isFinite(newPosition.x) || !isFinite(newPosition.y) || !isFinite(newPosition.z)) {
            console.warn('Detected non-finite position for', body.userData.name, '. Skipping position update.');
            continue; // このフレームの更新をスキップ
        }
        body.position.copy(newPosition);
    }

    // 5. 破壊された天体のクリーンアップ
    if (destroyed.size > 0) {
        gameState.stars = gameState.stars.filter(star => {
            if (destroyed.has(star.uuid)) {
                removeAndDispose(star);
                if (focusedStar && focusedStar.uuid === star.uuid) {
                    focusedStar = null;
                }
                return false;
            }
            return true;
        });
    }
}

function updateGeology(planetObject, deltaTime) {
    if (planetObject.userData.planetType !== 'rocky' || !planetObject.userData.geologicalActivity) return;

    const activityLevel = parseFloat(planetObject.userData.geologicalActivity);
    const eruptionChance = activityLevel * deltaTime * 0.001; // 噴火確率を調整

    if (Math.random() < eruptionChance) {
        const atmosphereIncrease = Math.random() * 0.1 + 0.05;
        const currentAtmosphere = parseFloat(planetObject.userData.atmosphere);
        const newAtmosphere = Math.min(1.0, currentAtmosphere + atmosphereIncrease);
        planetObject.userData.atmosphere = newAtmosphere.toFixed(2);

        // 大気のビジュアルを更新
        const atmosphereSphere = planetObject.getObjectByName('atmosphere');
        if (atmosphereSphere) {
            atmosphereSphere.material.opacity = newAtmosphere * 0.3;
        }

        showMessage(`${planetObject.userData.name}で大規模な火山活動が発生！大気が濃くなった。`);
    }
}

function updateClimate(planetObject, deltaTime) {
    if (planetObject.userData.planetType !== 'rocky') return;

    const atmosphere = parseFloat(planetObject.userData.atmosphere);
    const oldTemp = parseFloat(planetObject.userData.temperature);
    const oldSubType = planetObject.userData.subType;

    // 温室効果/冷却効果
    const tempChange = (atmosphere - 0.5) * 0.1 * deltaTime;
    let newTemp = oldTemp + tempChange;
    planetObject.userData.temperature = newTemp.toFixed(2);

    // 気候変動によるサブタイプの変化
    let newSubType = oldSubType;
    if (oldSubType === 'terran' || oldSubType === 'ocean_world') {
        if (newTemp > 60) newSubType = 'desert_world';
        else if (newTemp < -60) newSubType = 'ice_world';
    } else if (oldSubType === 'desert_world') {
        if (newTemp < 50) newSubType = 'terran';
    } else if (oldSubType === 'ice_world') {
        if (newTemp > -40) newSubType = 'terran';
    }

    if (newSubType !== oldSubType) {
        planetObject.userData.subType = newSubType;
        showMessage(`${planetObject.userData.name}の気候が変動し、${newSubType}になった！`);

        // ビジュアルを更新
        const planetMesh = planetObject.children[0];
        if (planetMesh && planetMesh.material) {
            const maps = createRealisticPlanetMaps(newSubType, parseFloat(planetObject.userData.water), atmosphere);
            planetMesh.material.map = maps.map;
            planetMesh.material.normalMap = maps.normalMap;
            planetMesh.material.needsUpdate = true;
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    const now = Date.now();
    
    // 安全なtimeStep計算
    const rawDeltaTime = (now - gameState.lastTick) / 1000;
    if (!isFinite(rawDeltaTime) || rawDeltaTime < 0 || rawDeltaTime > 1) {
        gameState.lastTick = now;
        return; // 異常な値の場合はこのフレームをスキップ
    }
    
    // 時間倍率の安全な取得
    let timeMultiplier = 1;
    if (gameState.currentTimeMultiplier && typeof gameState.currentTimeMultiplier === 'string') {
        const multiplierValue = parseInt(gameState.currentTimeMultiplier.replace('x', ''));
        if (isFinite(multiplierValue) && multiplierValue > 0 && multiplierValue <= 10) {
            timeMultiplier = multiplierValue;
        }
    }
    
    const deltaTime = rawDeltaTime * timeMultiplier;
    const animationDeltaTime = deltaTime * 0.05; // アニメーション用の時間
    
    // デバッグ用ログ（一時的）
    if (!isFinite(animationDeltaTime) || animationDeltaTime <= 0) {
        console.warn('Invalid animationDeltaTime:', {
            rawDeltaTime,
            timeMultiplier,
            deltaTime,
            animationDeltaTime,
            currentTimeMultiplier: gameState.currentTimeMultiplier
        });
        gameState.lastTick = now;
        return;
    }
    
    gameState.lastTick = now;

    gameState.gameYear += deltaTime / 5; // ゲーム内時間は元の速度
    updatePhysics(animationDeltaTime); // 物理演算はアニメーション速度に合わせる

    let dustRate = 1 + gameState.dustUpgradeLevel * 0.5 + (gameState.researchEnhancedDust ? 2 : 0);
    let energyRate = 0;
    let intelligentLifeCount = 0;
    let totalPopulation = 0; // Add population tracking to eliminate UI loop

    // Clear spatial grid once before the combined loop
    spatialGrid.clear();
    
    // Combined optimized loop - consolidates multiple forEach iterations
    gameState.stars.forEach(body => {
        // Spatial grid insertion (previously separate forEach in updatePhysics)
        spatialGrid.insert(body);
        
        // Rotation update
        body.rotation.y += 0.3 * animationDeltaTime;

        // Population tracking for UI (eliminates separate UI forEach)
        if (body.userData.hasLife) {
            totalPopulation += body.userData.population;
        }

        switch (body.userData.type) {
            case 'star':
                energyRate += body.userData.mass / 1000;
                break;
            case 'asteroid':
            case 'comet':
                dustRate += 0.5;
                break;
            case 'planet':
                checkLifeSpawn(body);
                evolveLife(body);
                updateGeology(body, deltaTime);
                updateClimate(body, deltaTime);
                if (body.userData.hasLife) {
                    let organicRate = 0, biomassRate = 0, populationGrowthRate = 0;
                    switch (body.userData.lifeStage) {
                        case 'microbial':
                            organicRate = 0.1; populationGrowthRate = 0.01; break;
                        case 'plant':
                            organicRate = 0.5; biomassRate = 0.1; populationGrowthRate = 0.05; break;
                        case 'animal':
                            organicRate = 0.8; biomassRate = 0.3; populationGrowthRate = 0.1; break;
                        case 'intelligent':
                            organicRate = 1.0; biomassRate = 0.5; populationGrowthRate = 0.5;
                            intelligentLifeCount++;
                            let thoughtPointRate = (body.userData.population / 1000000) * (1 + gameState.cosmicActivity / 10000);
                            gameState.thoughtPoints += thoughtPointRate * deltaTime;
                            break;
                    }
                    gameState.organicMatter += organicRate * deltaTime;
                    gameState.biomass += biomassRate * deltaTime;
                    body.userData.population += body.userData.population * populationGrowthRate * deltaTime;
                }
                break;
        }
    });
    
    // Store population for UI (eliminates UI forEach loop)
    gameState.cachedTotalPopulation = totalPopulation;

    if (gameState.researchAdvancedEnergy) energyRate *= 2;
    
    // 塵の生成レートを保存（UI表示用）
    gameState.currentDustRate = dustRate;

    // 思考速度の計算 (思考ポイントに基づいて指数関数的に増加) - use cached calculation
    gameState.thoughtSpeedMps = mathCache.getThoughtSpeed();

    // リソースの蓄積と加算
    gameState.resourceAccumulators.cosmicDust += dustRate * deltaTime;
    gameState.resourceAccumulators.energy += energyRate * deltaTime;

    if (gameState.resourceAccumulators.cosmicDust >= 1) {
        const dustToAdd = Math.floor(gameState.resourceAccumulators.cosmicDust);
        gameState.cosmicDust += dustToAdd;
        gameState.resourceAccumulators.cosmicDust -= dustToAdd;
    }
    if (gameState.resourceAccumulators.energy >= 1) {
        const energyToAdd = Math.floor(gameState.resourceAccumulators.energy);
        gameState.energy += energyToAdd;
        gameState.resourceAccumulators.energy -= energyToAdd;
    }

    // WASDによるカメラ移動
    if (keys.w) camera.position.z -= moveSpeed * animationDeltaTime;
    if (keys.s) camera.position.z += moveSpeed * animationDeltaTime;
    if (keys.a) camera.position.x -= moveSpeed * animationDeltaTime;
    if (keys.d) camera.position.x += moveSpeed * animationDeltaTime;

    // カメラの滑らかな追従
    if (focusedStar) {
        const offset = camera.position.clone().sub(controls.target);
        controls.target.lerp(focusedStar.position, 0.05);
        camera.position.copy(controls.target).add(offset);
    }

    // ブラックホールのエッジグローをカメラに向ける
    const edgeGlow = scene.getObjectByName('black_hole_edge_glow');
    if (edgeGlow) {
        edgeGlow.lookAt(camera.position);
    }

    controls.update();
    composer.render();

    uiUpdateTimer += deltaTime;
    if (uiUpdateTimer >= uiUpdateInterval) {
        updateUI();
        uiUpdateTimer = 0;
    }
    
    // 統計更新（1秒間隔）
    updateStatistics();
    
    galaxyMapUpdateTimer += deltaTime;
    if (galaxyMapUpdateTimer >= galaxyMapUpdateInterval) {
        debouncedUpdateGalaxyMap();
        galaxyMapUpdateTimer = 0;
    }
}

function createInfoPanel() {
    const panel = document.createElement('div');
    panel.id = 'info-panel';
    panel.classList.add('info-panel', 'hidden');
    document.body.appendChild(panel);

    let currentTarget = null;

    function show(element, title, contentFn) {
        if (!element) return;
        panel.innerHTML = `<h3>${title}</h3><p>${contentFn()}</p>`;
        panel.classList.remove('hidden');
        currentTarget = element;
        
        const rect = element.getBoundingClientRect();
        panel.style.left = `${rect.left}px`;
        panel.style.top = `${rect.bottom + 5}px`;
    }

    function hide() {
        panel.classList.add('hidden');
        currentTarget = null;
    }

    function updatePosition(event) {
        if (!currentTarget) return;
        // パネルをマウスカーソルの右下に配置
        panel.style.left = `${event.clientX + 15}px`;
        panel.style.top = `${event.clientY + 15}px`;
    }

    return (elementId, title, contentFn) => {
        const element = document.getElementById(elementId);
        if (!element) {
            // console.warn(`Info panel target not found: ${elementId}`);
            return;
        }
        
        // 親要素にリスナーを設定
        const parent = element.parentElement;

        parent.addEventListener('mouseenter', () => {
            show(parent, title, contentFn);
        });
        parent.addEventListener('mouseleave', hide);
        parent.addEventListener('mousemove', updatePosition);
    };
}

function setupEventListeners() {
    // Prevent multiple event listener registrations
    // Temporarily disabled to debug research issue
    // if (eventListenersSetup) return;
    // eventListenersSetup = true;
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        
        // Invalidate cached map size on resize
        previousGalaxyMapState.mapSize = -1;
    });

    window.addEventListener('keydown', (event) => {
               if (event.code === 'KeyW') keys.w = true;
        if (event.code === 'KeyA') keys.a = true;
        if (event.code === 'KeyS') keys.s = true;
        if (event.code === 'KeyD') keys.d = true;
    });
    window.addEventListener('keyup', (event) => {
        if (event.code === 'KeyW') keys.w = false;
        if (event.code === 'KeyA') keys.a = false;
        if (event.code === 'KeyS') keys.s = false;
        if (event.code === 'KeyD') keys.d = false;
        if (event.code === 'KeyM') {
            gameState.isMapVisible = !gameState.isMapVisible;
            updateGalaxyMap(); // 表示状態を即座に更新
        }
    });

    ui.gameTabButton.addEventListener('click', () => switchTab('game'));
    ui.researchTabButton.addEventListener('click', () => switchTab('research'));
    ui.optionsTabButton.addEventListener('click', () => switchTab('options'));
    ui.starManagementTabButton.addEventListener('click', () => switchTab('starManagement'));
    ui.closeOptionsButton.addEventListener('click', () => switchTab('game'));

    // 開閉式メニュー - cache the querySelectorAll result
    ui.collapsibleHeaders = document.querySelectorAll('.collapsible-header');
    ui.collapsibleHeaders.forEach(header => {
        header.addEventListener('click', () => {
            header.classList.toggle('active');
            const content = header.nextElementSibling;
            if (content.style.maxHeight) {
                content.style.maxHeight = null;
                content.style.padding = '0 15px';
            } else {
                content.style.maxHeight = content.scrollHeight + "px";
                content.style.padding = '15px';
            }
        });
    });

    window.addEventListener('click', (event) => {
        if (ui.uiArea.contains(event.target)) return; // UI上は無視
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children, true); // scene全体を再帰的にチェック

        if (intersects.length > 0) {
            let intersectedObject = intersects[0].object;
            // 親をたどって、gameState.starsに含まれる最上位のオブジェクトを見つける
            while (intersectedObject.parent && !gameState.stars.includes(intersectedObject)) {
                intersectedObject = intersectedObject.parent;
            }

            // 見つかったオブジェクトがstars配列にあればフォーカスする
            if (gameState.stars.includes(intersectedObject)) {
                focusOnStar(intersectedObject);
            }
        }
    });

    // 小惑星・彗星・月・準惑星・惑星の作成機能
    const creationMapping = {
        createAsteroidButton: { type: 'asteroid', cost: 100 },
        createCometButton: { type: 'comet', cost: 500 },
        createMoonButton: { type: 'moon', cost: 1000 },
        createDwarfPlanetButton: { type: 'dwarfPlanet', cost: 2500 },
        createPlanetButton: { type: 'planet', cost: 10000 },
    };

    for (const [buttonId, { type, cost }] of Object.entries(creationMapping)) {
        const button = ui[buttonId];
        if (!button) continue;

        let creationTimeout = null;
        let creationCount = 0;
        let isCreating = false;

        const stopCreation = () => {
            if (isCreating) {
                isCreating = false;
                clearTimeout(creationTimeout);
                creationTimeout = null;
            }
        };

        const createAction = () => {
            if (!isCreating) return;

            if (!focusedStar || focusedStar.userData.type !== 'star') {
                if (creationCount === 0) { 
                    showMessage('まず、親となる恒星をクリックして選択してください。');
                }
                stopCreation();
                return;
            }
            if (gameState.cosmicDust < cost) {
                if (creationCount === 0) {
                    showMessage('宇宙の塵が足りません。');
                }
                stopCreation();
                return;
            }

            gameState.cosmicDust -= cost;
            const parentRadius = (focusedStar.children[0] ? focusedStar.children[0].scale.x : focusedStar.scale.x) || 1;
            const orbitalRadius = parentRadius + 20 + Math.random() * (parentRadius * 5);
            const angle = Math.random() * Math.PI * 2;
            const position = new THREE.Vector3(orbitalRadius * Math.cos(angle), (Math.random() - 0.5) * 20, orbitalRadius * Math.sin(angle));
            
            if (orbitalRadius <= 0) {
                console.error(`[Creation Error] Invalid orbitalRadius (${orbitalRadius}) for ${type}. Skipping creation.`);
                stopCreation();
                return;
            }

            const orbitalSpeed = Math.sqrt((gameState.physics.G * focusedStar.userData.mass) / orbitalRadius);

            if (!isFinite(orbitalSpeed)) {
                console.error(`[Creation Error] Calculated orbitalSpeed is not finite (${orbitalSpeed}) for ${type}. Skipping creation.`);
                stopCreation();
                return;
            }

            const relativeVelocity = new THREE.Vector3(-position.z, 0, position.x).normalize().multiplyScalar(orbitalSpeed);
            const finalVelocity = focusedStar.userData.velocity.clone().add(relativeVelocity);
            const finalPosition = focusedStar.position.clone().add(position);
            
            if (!isFinite(finalPosition.x) || !isFinite(finalVelocity.x)) {
                 console.error(`[Creation Error] Final position or velocity is not finite. Skipping creation.`);
                 stopCreation();
                 return;
            }

            const newBody = createCelestialBody(type, {
                position: finalPosition,
                velocity: finalVelocity,
                parent: focusedStar
            });
            gameState.stars.push(newBody);
            scene.add(newBody);
            
            // ログエントリを追加
            const typeNames = {
                'asteroid': '小惑星',
                'comet': '彗星',
                'moon': '衛星',
                'dwarfPlanet': '準惑星',
                'planet': '惑星'
            };
            const bodyName = newBody.userData.name || typeNames[type] || type;
            const parentName = focusedStar.userData.name || '恒星';
            addTimelineLog(`${bodyName}が${parentName}の周囲に誕生しました`, 'creation');
            
            saveGame();

            creationCount++;

            let nextDelay;
            if (creationCount <= 2) nextDelay = 500;
            else if (creationCount <= 5) nextDelay = 250;
            else if (creationCount <= 10) nextDelay = 100;
            else nextDelay = 50;

            creationTimeout = setTimeout(createAction, nextDelay);
        };

        button.addEventListener('mousedown', (event) => {
            event.preventDefault();
            if (isCreating) return;
            isCreating = true;
            creationCount = 0;
            createAction();
        });

        button.addEventListener('mouseup', stopCreation);
        button.addEventListener('mouseleave', stopCreation);
    }
    
    // 恒星生成関数を分離
    const createStarAction = (starName = null) => {
        const cost = 100000;
        if (gameState.cosmicDust < cost) {
            showMessage('宇宙の塵が足りません。');
            return false;
        }
        
        // 名前が指定されていない場合は自動生成
        const name = starName || `恒星-${gameState.stars.filter(s => s.userData.type === 'star').length + 1}`;
        
        gameState.cosmicDust -= cost;
        const radius = 5000 + Math.random() * 10000; //生成される恒星のブラックホールからの距離
        const angle = Math.random() * Math.PI * 2;
        const position = new THREE.Vector3(radius * Math.cos(angle), (Math.random() - 0.5) * 100, radius * Math.sin(angle));
        const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
        const blackHoleMass = blackHole ? blackHole.userData.mass : 100000;
        const orbitalSpeed = Math.sqrt((gameState.physics.G * blackHoleMass) / radius);
        const velocity = new THREE.Vector3(-position.z, 0, position.x).normalize().multiplyScalar(orbitalSpeed);
        const newStar = createCelestialBody('star', { name, position, velocity });
        gameState.stars.push(newStar);
        scene.add(newStar);
        focusOnStar(newStar);
        
        // ログエントリを追加
        addTimelineLog(`恒星「${name}」が銀河に誕生しました`, 'creation');
        
        saveGame();
        return true;
    };

    // 恒星生成ボタン（長押し対応）
    let isCreatingStars = false;
    let starCreationInterval = null;
    let starCreationCount = 0;

    ui.createStarButton.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (isCreatingStars) return;
        isCreatingStars = true;
        starCreationCount = 0;

        // 最初の星の名前をユーザーに尋ねる
        const firstStarName = prompt('最初の恒星の名前を入力してください:', '輝く星');
        if (!firstStarName) {
            isCreatingStars = false;
            return; // ユーザーがキャンセルした場合は何もしない
        }

        // 最初の星を生成
        if (createStarAction(firstStarName)) {
            starCreationCount++;

            // 500ms後に連続生成を開始
            starCreationInterval = setTimeout(() => {
                const continuousCreation = () => {
                    if (!isCreatingStars) return;

                    if (createStarAction()) { // 名前なしで自動生成
                        starCreationCount++;

                        // 次の生成までの遅延（曲線的に速くなる）
                        let delay;
                        if (starCreationCount <= 2) delay = 800;
                        else if (starCreationCount <= 4) delay = 600;
                        else if (starCreationCount <= 7) delay = 400;
                        else if (starCreationCount <= 11) delay = 250;
                        else if (starCreationCount <= 16) delay = 150;
                        else delay = 100;

                        starCreationInterval = setTimeout(continuousCreation, delay);
                    } else {
                        // リソース不足で停止
                        stopStarCreation();
                    }
                };
                continuousCreation();
            }, 500);
        } else {
            // 最初の星の生成に失敗した場合
            isCreatingStars = false;
        }
    });

    // 停止処理
    const stopStarCreation = () => {
        if (isCreatingStars) {
            isCreatingStars = false;
            if (starCreationInterval) {
                clearTimeout(starCreationInterval);
                starCreationInterval = null;
            }
        }
    };

    ui.createStarButton.addEventListener('mouseup', stopStarCreation);
    ui.createStarButton.addEventListener('mouseleave', stopStarCreation);
    document.addEventListener('mouseup', stopStarCreation);

    if (ui.upgradeDustButton) {
        ui.upgradeDustButton.addEventListener('mousedown', () => {
        let upgradeTimeout;
        let upgradeCount = 0;

        const upgradeAction = () => {
            const cost = mathCache.getDustUpgradeCost();
            if (gameState.energy >= cost) {
                gameState.energy -= cost;
                gameState.dustUpgradeLevel++;
                updateUI();
                saveGame();
                upgradeCount++;

                let nextDelay;
                if (upgradeCount <= 3) nextDelay = 500;
                else if (upgradeCount <= 8) nextDelay = 100;
                else if (upgradeCount <= 18) nextDelay = 50;
                else nextDelay = 10;
                
                upgradeTimeout = setTimeout(upgradeAction, nextDelay);
            } else {
                clearTimeout(upgradeTimeout);
            }
        };

        upgradeAction(); // 最初のクリックで一度実行

        const clearUpgrade = () => clearTimeout(upgradeTimeout);
        ui.upgradeDustButton.addEventListener('mouseup', clearUpgrade, { once: true });
        ui.upgradeDustButton.addEventListener('mouseleave', clearUpgrade, { once: true });
        });
    }

    if (ui.upgradeDarkMatterConverterButton) {
        ui.upgradeDarkMatterConverterButton.addEventListener('mousedown', () => {
        let upgradeTimeout;
        let upgradeCount = 0;

        const upgradeAction = () => {
            const cost = mathCache.getConverterCost();
            if (gameState.energy >= cost) {
                gameState.energy -= cost;
                gameState.darkMatterConverterLevel++;
                gameState.darkMatter++;
                updateUI();
                saveGame();
                upgradeCount++;

                let nextDelay;
                if (upgradeCount <= 3) nextDelay = 500;
                else if (upgradeCount <= 8) nextDelay = 100;
                else if (upgradeCount <= 18) nextDelay = 50;
                else nextDelay = 10;

                upgradeTimeout = setTimeout(upgradeAction, nextDelay);
            } else {
                clearTimeout(upgradeTimeout);
            }
        };

        upgradeAction();

        const clearUpgrade = () => clearTimeout(upgradeTimeout);
        ui.upgradeDarkMatterConverterButton.addEventListener('mouseup', clearUpgrade, { once: true });
        ui.upgradeDarkMatterConverterButton.addEventListener('mouseleave', clearUpgrade, { once: true });
        });
    }

    // Research button event listeners with safety checks
    if (ui.researchEnhancedDustButton) {
        ui.researchEnhancedDustButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 1 && !gameState.researchEnhancedDust) {
                gameState.darkMatter -= 1;
                gameState.researchEnhancedDust = true;
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchAdvancedEnergyButton) {
        ui.researchAdvancedEnergyButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 2 && !gameState.researchAdvancedEnergy) {
                gameState.darkMatter -= 2;
                gameState.researchAdvancedEnergy = true;
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchMoonButton) {
        ui.researchMoonButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 1 && !gameState.unlockedCelestialBodies.moon) {
                gameState.darkMatter -= 1;
                gameState.unlockedCelestialBodies.moon = true;
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchDwarfPlanetButton) {
        ui.researchDwarfPlanetButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 2 && !gameState.unlockedCelestialBodies.dwarfPlanet) {
                gameState.darkMatter -= 2;
                gameState.unlockedCelestialBodies.dwarfPlanet = true;
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchPlanetButton) {
        ui.researchPlanetButton.addEventListener('click', () => {
            if (gameState.darkMatter >= 3 && !gameState.unlockedCelestialBodies.planet) {
                gameState.darkMatter -= 3;
                gameState.unlockedCelestialBodies.planet = true;
                updateUI();
                saveGame();
            }
        });
    }

    if (ui.researchStarButton) {
        ui.researchStarButton.addEventListener('click', () => {
            const cost = parseInt(ui.researchStarCost.textContent);
            if (gameState.darkMatter >= cost && !gameState.unlockedCelestialBodies.star) {
                gameState.darkMatter -= cost;
                gameState.unlockedCelestialBodies.star = true;
                updateUI();
                saveGame();
            }
        });
    }

    ui.gravitySlider.addEventListener('input', (event) => {
        gameState.physics.G = parseFloat(event.target.value);
        ui.gravityValue.textContent = event.target.value;
    });

    ui.simulationSpeedSlider.addEventListener('input', (event) => {
        gameState.physics.simulationSpeed = parseFloat(event.target.value);
        ui.simulationSpeedValue.textContent = `${event.target.value}x`;
    });

    ui.dragSlider.addEventListener('input', (event) => {
        gameState.physics.dragFactor = parseFloat(event.target.value);
        ui.dragValue.textContent = event.target.value;
    });

    ui.addAllResourcesButton.addEventListener('click', () => {
        gameState.cosmicDust += 100000000;
        gameState.energy += 1000000;
        gameState.darkMatter += 10;
        updateUI();
        showMessage('全リソースを追加しました。');
    });

    ui.graphicsQualitySelect.addEventListener('change', (event) => {
        gameState.graphicsQuality = event.target.value;
        applyGraphicsQuality();
        saveGame();
    });

    ui.unitSystemSelect.addEventListener('change', (event) => {
        gameState.currentUnitSystem = event.target.value;
        saveGame();
        updateUI();
    });

    ui.resetGameButton.addEventListener('click', () => {
        if (confirm('本当にすべての進行状況をリセットしますか？')) {
            localStorage.removeItem('cosmicGardenerState');
            location.reload();
        }
    });

    // --- Info Panels Setup ---
    const setupInfoPanel = createInfoPanel();
    
    // Left UI Panel
    setupInfoPanel('resource-cosmicDust', '宇宙の塵', () => `宇宙に漂う基本的な物質。あらゆる天体の創造に必要となる。<br>現在の生成速度: ${gameState.currentDustRate.toFixed(1)}/s`);
    setupInfoPanel('resource-energy', 'エネルギー', () => `恒星や物理現象から生み出される力。アップグレードや高度な操作に不可欠。`);
    setupInfoPanel('resource-organicMatter', '有機物', () => `生命の誕生に必���な複雑な分子。特定の天体から収集できる。`);
    setupInfoPanel('resource-biomass', 'バイオマス', () => `生命活動によって生成される有機物の集合体。高度な進化に必要。`);
    setupInfoPanel('resource-darkMatter', 'ダークマター', () => `未知の物質。宇宙の法則を書き換える研究に必要。`);
    setupInfoPanel('resource-thoughtPoints', '思考ポイント', () => `知的生命体の思考から生まれる。時間加速など、宇宙の根源的な操作を可能にする。`);
    
    // Bottom Right Overlay Panel
    setupInfoPanel('overlayCosmicDust', '宇宙の塵', () => `現在の宇宙の塵の総量。`);
    setupInfoPanel('overlayEnergy', 'エネルギー', () => `現在のエネルギーの総量。`);
    setupInfoPanel('overlayStarCount', '天体の数', () => `シミュレーション内に存在する天体の総数。`);
    setupInfoPanel('overlayDarkMatter', 'ダークマター', () => `現在のダークマターの総量。`);
    setupInfoPanel('overlayThoughtPoints', '思考ポイント', () => `現在の思考ポイントの総量。`);
    setupInfoPanel('overlayCosmicActivity', '宇宙活発度', () => `宇宙全体の物理的な活動レベル。天体の速度や衝突頻度から計算される。`);
    setupInfoPanel('overlayPopulation', '総人口', () => {
        const totalPopulation = gameState.cachedTotalPopulation || 0;
        return `全宇宙の知的生命体の総数。思考ポイントの生成源となる。<br>現在の総人口: ${Math.floor(totalPopulation).toLocaleString()}`;
    });

    // 統計・ログパネルの開閉機能
    const statsLogContainer = document.getElementById('stats-log-container');
    const statsLogTabs = document.getElementById('stats-log-tabs');
    const statisticsPanel = document.getElementById('statistics-panel');
    const timelineLogPanel = document.getElementById('timeline-log-panel');
    const statsTabButton = document.getElementById('stats-tab-button');
    const logTabButton = document.getElementById('log-tab-button');
    const statsLogIcon = document.getElementById('stats-log-toggle-icon');
    
    let isStatsLogExpanded = false;
    let currentStatsLogTab = 'stats';
    
    // パネル開閉機能
    statsLogTabs.addEventListener('click', (e) => {
        if (e.target.classList.contains('stats-log-tab')) return; // タブクリックは除外
        
        isStatsLogExpanded = !isStatsLogExpanded;
        statsLogContainer.classList.toggle('expanded', isStatsLogExpanded);
        
        if (isStatsLogExpanded) {
            if (currentStatsLogTab === 'stats') {
                statisticsPanel.classList.add('expanded');
                timelineLogPanel.classList.remove('expanded');
            } else {
                timelineLogPanel.classList.add('expanded');
                statisticsPanel.classList.remove('expanded');
            }
        } else {
            statisticsPanel.classList.remove('expanded');
            timelineLogPanel.classList.remove('expanded');
        }
    });
    
    // タブ切り替え機能
    statsTabButton.addEventListener('click', (e) => {
        e.stopPropagation();
        currentStatsLogTab = 'stats';
        statsTabButton.classList.add('active');
        logTabButton.classList.remove('active');
        
        if (isStatsLogExpanded) {
            statisticsPanel.classList.add('expanded');
            timelineLogPanel.classList.remove('expanded');
        }
    });
    
    logTabButton.addEventListener('click', (e) => {
        e.stopPropagation();
        currentStatsLogTab = 'log';
        logTabButton.classList.add('active');
        statsTabButton.classList.remove('active');
        
        if (isStatsLogExpanded) {
            timelineLogPanel.classList.add('expanded');
            statisticsPanel.classList.remove('expanded');
        }
    });
    
    // グラフタブ切り替え
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const chartType = tab.getAttribute('data-chart');
            switchChart(chartType);
        });
    });
}

function init() {
    createStarfield();
    loadGame();
    applyGraphicsQuality();

    if (gameState.stars.length === 0) {
        const blackHole = createCelestialBody('black_hole', {
            name: '銀河中心核',
            radius: 500, // 半径を500に拡大
            mass: 10000000, // 質量を増加
            position: new THREE.Vector3(0, 0, 0)
        });
        gameState.stars.push(blackHole);
        scene.add(blackHole);
        focusOnStar(blackHole);
    }

    setupEventListeners();
    updateUI();
    updateTimelineLogDisplay(); // 初期化時にログ表示を更新
    updateStatisticsDisplay(); // 初期化時に統計表示を更新
    
    // ゲーム開始時のウェルカムメッセージ
    if (gameState.timelineLog.length === 0) {
        addTimelineLog('宇宙の創造者として旅が始まりました', 'system');
    }
    
    animate();
}

init();