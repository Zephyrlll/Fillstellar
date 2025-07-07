import { gameState } from './state.js';

let currentChart = 'resources';

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
            const value = (typeof num === 'number' && isFinite(num)) ? num : 0;
            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
            if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
            return value.toFixed(1);
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
        planetCount: '惑星数',
        asteroidCount: '小惑星数',
        cometCount: '彗星数',
        moonCount: '衛星数',
        cosmicActivity: '宇宙活発度',
        totalPopulation: '総人口',
        intelligentLifeCount: '知的文明数',
        averageStarAge: '平均恒星年齢',
        totalMass: '総質量'
    };
    
    Object.entries(gameState.statistics.cosmic).forEach(([key, stats]) => {
        const item = document.createElement('div');
        item.className = 'stat-item';
        
        const formatNumber = (num, type) => {
            // 数値でない場合は0として処理
            const value = (typeof num === 'number' && isFinite(num)) ? num : 0;
            
            if (type === 'averageStarAge') {
                return value.toFixed(1) + ' 億年';
            } else if (type === 'totalMass') {
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M 太陽質量';
                if (value >= 1000) return (value / 1000).toFixed(1) + 'K 太陽質量';
                return value.toFixed(0) + ' 太陽質量';
            } else if (type === 'cosmicActivity') {
                return value.toFixed(2);
            } else {
                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                if (value >= 1000) return (value / 1000).toFixed(1) + 'K';
                return Math.floor(value).toLocaleString();
            }
        };
        
        item.innerHTML = `
            <span class="stat-name">${cosmicNames[key]}</span>
            <div class="stat-values">
                <span class="stat-value">現在: ${formatNumber(stats.current, key)}</span>
            </div>
        `;
        
        container.appendChild(item);
    });
}

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
    const padding = 40;
    const legendHeight = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - legendHeight;
    
    // 全リソースを表示
    const resources = ['cosmicDust', 'energy', 'organicMatter', 'biomass', 'darkMatter', 'thoughtPoints'];
    const colors = ['#FFD700', '#00FFFF', '#00FF00', '#8A2BE2', '#FF69B4', '#FFA500'];
    const resourceNames = {
        cosmicDust: '宇宙の塵',
        energy: 'エネルギー',
        organicMatter: '有機物',
        biomass: 'バイオマス',
        darkMatter: 'ダークマター',
        thoughtPoints: '思考ポイント'
    };
    
    // 背景をクリア
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // グリッド線を描画
    ctx.strokeStyle = 'rgba(255, 183, 0, 0.2)';
    ctx.lineWidth = 1;
    
    // 縦のグリッド線
    for (let i = 0; i <= 5; i++) {
        const x = padding + (i / 5) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + chartHeight);
        ctx.stroke();
    }
    
    // 横のグリッド線
    for (let i = 0; i <= 4; i++) {
        const y = padding + (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
    }
    
    // データがあるリソースの最大値を計算
    const resourcesWithData = resources.filter(resource => {
        const stats = gameState.statistics.resources[resource];
        return stats.history.length > 0 && Math.max(...stats.history.map(h => h.value)) > 0;
    });
    
    if (resourcesWithData.length === 0) {
        // データがない場合のメッセージ
        ctx.fillStyle = '#FFD700';
        ctx.font = '14px "Noto Sans JP"';
        ctx.textAlign = 'center';
        ctx.fillText('データを収集中...', width / 2, height / 2);
        return;
    }
    
    // 全体の最大値を計算
    let globalMax = 0;
    resourcesWithData.forEach(resource => {
        const stats = gameState.statistics.resources[resource];
        const max = Math.max(...stats.history.map(h => h.value));
        globalMax = Math.max(globalMax, max);
    });
    
    // リソース線を描画
    resourcesWithData.forEach((resource, index) => {
        const stats = gameState.statistics.resources[resource];
        const color = colors[resources.indexOf(resource)];
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let hasValidPoints = false;
        stats.history.forEach((point, i) => {
            const x = padding + (i / Math.max(stats.history.length - 1, 1)) * chartWidth;
            const y = padding + chartHeight - (point.value / globalMax) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
                hasValidPoints = true;
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        if (hasValidPoints) {
            ctx.stroke();
        }
    });
    
    // Y軸の値ラベル
    ctx.fillStyle = '#FFD700';
    ctx.font = '10px "Noto Sans JP"';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 4; i++) {
        const value = globalMax * (1 - i / 4);
        const y = padding + (i / 4) * chartHeight;
        let text;
        if (value >= 1000000) {
            text = (value / 1000000).toFixed(1) + 'M';
        } else if (value >= 1000) {
            text = (value / 1000).toFixed(1) + 'K';
        } else {
            text = value.toFixed(0);
        }
        ctx.fillText(text, padding - 5, y + 3);
    }
    
    // X軸の時間ラベル
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const x = padding + (i / 5) * chartWidth;
        const timeAgo = (5 - i) * 12; // 12秒間隔
        ctx.fillText(`-${timeAgo}s`, x, padding + chartHeight + 15);
    }
    
    // 凡例を描画
    const legendY = height - legendHeight + 10;
    const legendItemWidth = (width - padding * 2) / Math.min(resourcesWithData.length, 3);
    
    resourcesWithData.forEach((resource, index) => {
        const row = Math.floor(index / 3);
        const col = index % 3;
        const x = padding + col * legendItemWidth;
        const y = legendY + row * 20;
        
        const color = colors[resources.indexOf(resource)];
        
        // 色付きの四角
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 12, 12);
        
        // テキスト
        ctx.fillStyle = '#FFD700';
        ctx.font = '11px "Noto Sans JP"';
        ctx.textAlign = 'left';
        ctx.fillText(resourceNames[resource], x + 16, y + 9);
    });
    
    // 軸線
    ctx.strokeStyle = '#FFB700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();
}

function drawCosmicChart(ctx, width, height) {
    const padding = 40;
    const legendHeight = 80;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - legendHeight;
    
    // 主要な宇宙メトリクス
    const metrics = ['starCount', 'planetCount', 'totalPopulation', 'intelligentLifeCount', 'cosmicActivity'];
    const colors = ['#FFD700', '#00FFFF', '#FF69B4', '#32CD32', '#FFA500'];
    const metricNames = {
        starCount: '恒星数',
        planetCount: '惑星数',
        totalPopulation: '総人口',
        intelligentLifeCount: '知的文明',
        cosmicActivity: '宇宙活発度'
    };
    
    // 背景をクリア
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // グリッド線を描画
    ctx.strokeStyle = 'rgba(255, 183, 0, 0.2)';
    ctx.lineWidth = 1;
    
    // 縦のグリッド線
    for (let i = 0; i <= 5; i++) {
        const x = padding + (i / 5) * chartWidth;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + chartHeight);
        ctx.stroke();
    }
    
    // 横のグリッド線
    for (let i = 0; i <= 4; i++) {
        const y = padding + (i / 4) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
    }
    
    // データがあるメトリクスをフィルタ
    const metricsWithData = metrics.filter(metric => {
        const stats = gameState.statistics.cosmic[metric];
        return stats.history.length > 0 && Math.max(...stats.history.map(h => h.value)) > 0;
    });
    
    if (metricsWithData.length === 0) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '14px "Noto Sans JP"';
        ctx.textAlign = 'center';
        ctx.fillText('データを収集中...', width / 2, height / 2);
        return;
    }
    
    // 正規化のため、各メトリクスを別々にスケール
    metricsWithData.forEach((metric, index) => {
        const stats = gameState.statistics.cosmic[metric];
        const color = colors[index];
        const maxValue = Math.max(...stats.history.map(h => h.value));
        
        if (maxValue === 0) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        let hasValidPoints = false;
        stats.history.forEach((point, i) => {
            const x = padding + (i / Math.max(stats.history.length - 1, 1)) * chartWidth;
            const y = padding + chartHeight - (point.value / maxValue) * chartHeight;
            
            if (i === 0) {
                ctx.moveTo(x, y);
                hasValidPoints = true;
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        if (hasValidPoints) {
            ctx.stroke();
        }
    });
    
    // X軸の時間ラベル
    ctx.fillStyle = '#FFD700';
    ctx.font = '10px "Noto Sans JP"';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const x = padding + (i / 5) * chartWidth;
        const timeAgo = (5 - i) * 12;
        ctx.fillText(`-${timeAgo}s`, x, padding + chartHeight + 15);
    }
    
    // 凡例を描画
    const legendY = height - legendHeight + 10;
    const legendItemWidth = (width - padding * 2) / Math.min(metricsWithData.length, 2);
    
    metricsWithData.forEach((metric, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = padding + col * legendItemWidth;
        const y = legendY + row * 20;
        
        const color = colors[index];
        
        // 色付きの四角
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 12, 12);
        
        // テキスト
        ctx.fillStyle = '#FFD700';
        ctx.font = '11px "Noto Sans JP"';
        ctx.textAlign = 'left';
        ctx.fillText(metricNames[metric], x + 16, y + 9);
        
        // 現在値を表示
        const currentValue = gameState.statistics.cosmic[metric].current;
        let valueText = '';
        if (metric === 'cosmicActivity') {
            valueText = ` (${currentValue.toFixed(2)})`;
        } else {
            valueText = ` (${Math.floor(currentValue).toLocaleString()})`;
        }
        ctx.fillText(valueText, x + 16 + ctx.measureText(metricNames[metric]).width, y + 9);
    });
    
    // 軸線
    ctx.strokeStyle = '#FFB700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();
    
    // 注記
    ctx.fillStyle = '#AAA';
    ctx.font = '9px "Noto Sans JP"';
    ctx.textAlign = 'center';
    ctx.fillText('※各メトリクスは個別にスケールされています', width / 2, height - 5);
}

export function switchChart(chartType) {
    currentChart = chartType;
    
    // タブの表示を更新
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-chart="${chartType}"]`).classList.add('active');
    
    updateStatisticsChart();
}

export function updateStatistics() {
    const now = Date.now();
    const deltaTime = (now - gameState.statistics.lastUpdate) / 1000; // 秒単位
    
    if (deltaTime < 1) return; // 1秒未満の場合は更新しない
    
    // 統計データが初期化されていない場合は初期化
    if (!gameState.statistics) {
        console.warn('統計データが初期化されていません');
        return;
    }
    
    // リソース統計を更新
    const resources = ['cosmicDust', 'energy', 'organicMatter', 'biomass', 'darkMatter', 'thoughtPoints'];
    resources.forEach(resource => {
        const current = gameState[resource] || 0;
        const stats = gameState.statistics.resources[resource];
        
        // 前回の測定値を保持（初回は現在値で初期化）
        if (!stats.hasOwnProperty('previousValue')) {
            stats.previousValue = current;
            stats.total = current;
        }
        
        // 増加量を計算（前回の測定値との差分）
        const gained = current - stats.previousValue;
        
        // 統計を更新
        stats.total = current;
        stats.previousValue = current;
        
        // レート計��
        if (deltaTime > 0) {
            if (gained >= 0) {
                stats.perSecond = gained / deltaTime;
                stats.perHour = stats.perSecond * 3600;
            } else {
                // 減少の場合もレートを計算（負の値として）
                stats.perSecond = gained / deltaTime;
                stats.perHour = stats.perSecond * 3600;
            }
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
    const planetCount = gameState.stars.filter(s => s.userData.type === 'planet').length;
    const asteroidCount = gameState.stars.filter(s => s.userData.type === 'asteroid').length;
    const cometCount = gameState.stars.filter(s => s.userData.type === 'comet').length;
    const moonCount = gameState.stars.filter(s => s.userData.type === 'moon').length;
    const cosmicActivity = gameState.cosmicActivity || 0;
    const totalPopulation = gameState.cachedTotalPopulation || 0;
    
    // 知的生命体の数
    const intelligentLifeCount = gameState.stars.filter(s => 
        s.userData && s.userData.hasLife && s.userData.lifeStage === 'intelligent'
    ).length;
    
    // 恒星の平均年齢（各恒星の作成年からの経過時間を計算）
    const stars = gameState.stars.filter(s => s.userData && s.userData.type === 'star');
    let averageStarAge = 0;
    if (stars.length > 0) {
        const totalAge = stars.reduce((sum, star) => {
            const creationYear = star.userData.creationYear || 0;
            const age = (gameState.gameYear - creationYear) / 100; // 億年単位
            return sum + age;
        }, 0);
        averageStarAge = totalAge / stars.length;
    }
    
    // 総質量（全天体の質量合計）
    const totalMass = gameState.stars.reduce((sum, body) => {
        if (!body.userData) return sum;
        const mass = body.userData.mass || 0;
        // デバッグ用ログ
        if (body.userData.type === 'star' || body.userData.type === 'planet') {
            console.log(`[Mass Debug] ${body.userData.type} "${body.userData.name}": mass = ${mass}`);
        }
        return sum + mass;
    }, 0);
    console.log(`[Mass Debug] Total mass calculated: ${totalMass}`);
    
    const cosmicStats = [
        { key: 'starCount', value: starCount },
        { key: 'planetCount', value: planetCount },
        { key: 'asteroidCount', value: asteroidCount },
        { key: 'cometCount', value: cometCount },
        { key: 'moonCount', value: moonCount },
        { key: 'cosmicActivity', value: cosmicActivity },
        { key: 'totalPopulation', value: totalPopulation },
        { key: 'intelligentLifeCount', value: intelligentLifeCount },
        { key: 'averageStarAge', value: averageStarAge },
        { key: 'totalMass', value: totalMass }
    ];
    
    cosmicStats.forEach(({ key, value }) => {
        const stats = gameState.statistics.cosmic[key];
        if (!stats) return; // 統計が存在しない場合はスキップ
        
        // 数値でない場合は0に変換
        const safeValue = (typeof value === 'number' && isFinite(value)) ? value : 0;
        stats.current = safeValue;
        
        stats.history.push({
            time: now,
            value: safeValue
        });
        
        if (stats.history.length > gameState.statistics.maxHistoryPoints) {
            stats.history.shift();
        }
    });
    
    gameState.statistics.lastUpdate = now;
    updateStatisticsDisplay();
}
