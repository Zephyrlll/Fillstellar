import { gameState } from '../state.js';
import { formatNumber } from '../utils.js';
import { animationSystem } from './simpleAnimations.js';

export class Dashboard {
  private container: HTMLDivElement | null = null;
  private updateInterval = 1000; // 1秒ごと（デフォルト）
  private updateTimer: number | null = null;
  private resourceTargets: Map<string, number> = new Map();
  private updateFrequencies = [
    { label: '0.1秒', value: 100 },
    { label: '0.5秒', value: 500 },
    { label: '1秒', value: 1000 },
    { label: '2秒', value: 2000 },
    { label: '5秒', value: 5000 },
    { label: '10秒', value: 10000 }
  ];
  
  constructor() {
    // Set initial resource targets
    this.resourceTargets.set('cosmicDust', 1000);
    this.resourceTargets.set('energy', 100);
    this.resourceTargets.set('organicMatter', 50);
    this.resourceTargets.set('biomass', 20);
    this.resourceTargets.set('darkMatter', 10);
    this.resourceTargets.set('thoughtPoints', 5);
    
    // Load saved update interval
    const savedInterval = localStorage.getItem('dashboardUpdateInterval');
    if (savedInterval) {
      this.updateInterval = parseInt(savedInterval);
    }
  }
  
  init(): void {
    this.createUI();
    this.startUpdating();
  }
  
  private createUI(): void {
    if (this.container) {
      this.container.remove();
    }
    
    this.container = document.createElement('div');
    this.container.id = 'dashboard';
    this.container.className = 'dashboard hidden';
    
    document.body.appendChild(this.container);
    this.render();
  }
  
  private render(): void {
    if (!this.container) return;
    
    this.container.innerHTML = `
      <div class="dashboard-header">
        <h3>宇宙の庭 - ダッシュボード</h3>
        <div class="dashboard-controls">
          <select class="update-frequency-select" title="更新頻度">
            ${this.updateFrequencies.map(freq => `
              <option value="${freq.value}" ${this.updateInterval === freq.value ? 'selected' : ''}>
                更新: ${freq.label}
              </option>
            `).join('')}
          </select>
          <button class="dashboard-close" title="閉じる">×</button>
        </div>
      </div>
      
      <div class="dashboard-content">
        <div class="resource-summary">
          <h4>資源概要</h4>
          ${this.renderResourceSummary()}
        </div>
        
        <div class="production-rates">
          <h4>生産レート (/秒)</h4>
          ${this.renderProductionRates()}
        </div>
        
        <div class="next-milestone">
          <h4>次の目標</h4>
          ${this.renderNextMilestone()}
        </div>
        
        <div class="mini-map">
          <h4>宇宙マップ</h4>
          <canvas id="mini-map-canvas" width="560" height="200"></canvas>
          <div class="celestial-count">
            天体数: ${gameState.stars.length}
          </div>
        </div>
        
        <div class="life-statistics">
          <h4>生命統計</h4>
          ${this.renderLifeStatistics()}
        </div>
      </div>
    `;
    
    // Setup event listeners
    const closeBtn = this.container.querySelector('.dashboard-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    // Update frequency selector
    const frequencySelect = this.container.querySelector('.update-frequency-select') as HTMLSelectElement;
    if (frequencySelect) {
      frequencySelect.addEventListener('change', (e) => {
        const newInterval = parseInt((e.target as HTMLSelectElement).value);
        this.setUpdateInterval(newInterval);
      });
    }
    
    // Render minimap
    this.renderMiniMap();
  }
  
  private renderResourceSummary(): string {
    const resources = [
      { name: '宇宙の塵', value: gameState.cosmicDust, class: 'cosmic-dust' },
      { name: 'エネルギー', value: gameState.energy, class: 'energy' },
      { name: '有機物', value: gameState.organicMatter, class: 'organic-matter' },
      { name: 'バイオマス', value: gameState.biomass, class: 'biomass' },
      { name: 'ダークマター', value: gameState.darkMatter, class: 'dark-matter' },
      { name: '思考ポイント', value: gameState.thoughtPoints, class: 'thought-points' }
    ];
    
    return resources.map(r => `
      <div class="resource-summary-item ${r.class}">
        <span class="resource-name">${r.name}</span>
        <span class="resource-value">${formatNumber(r.value)}</span>
      </div>
    `).join('');
  }
  
  private renderProductionRates(): string {
    const rates = this.calculateProductionRates();
    
    return Object.entries(rates).map(([resource, rate]) => {
      const name = this.getResourceDisplayName(resource);
      const cssClass = this.getResourceClass(resource);
      const rateClass = rate > 0 ? 'positive' : rate < 0 ? 'negative' : 'zero';
      
      return `
        <div class="production-rate-item ${cssClass}">
          <span class="rate-name">${name}</span>
          <span class="rate-value ${rateClass}">
            ${rate > 0 ? '+' : ''}${formatNumber(rate, 2)}
          </span>
        </div>
      `;
    }).join('');
  }
  
  private renderNextMilestone(): string {
    const nextTarget = this.findNextTarget();
    
    if (!nextTarget) {
      return '<div class="no-target">すべての目標を達成しました！</div>';
    }
    
    const current = gameState[nextTarget.resource as keyof typeof gameState] as number;
    const progress = (current / nextTarget.target) * 100;
    const remaining = nextTarget.target - current;
    const rate = this.calculateProductionRates()[nextTarget.resource] || 0;
    const eta = rate > 0 ? this.calculateETA(remaining, rate) : '∞';
    
    return `
      <div class="milestone-info">
        <div class="milestone-title">${nextTarget.name}: ${formatNumber(nextTarget.target)}</div>
        <div class="milestone-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${Math.min(progress, 100)}%"></div>
          </div>
          <span class="progress-text">${Math.floor(progress)}%</span>
        </div>
        <div class="milestone-eta">到達まで: ${eta}</div>
      </div>
    `;
  }
  
  private renderLifeStatistics(): string {
    const lifeStats = this.calculateLifeStatistics();
    const totalBodies = gameState.stars.length;
    const bodiesWithLife = lifeStats.total;
    const lifePercentage = totalBodies > 0 ? (bodiesWithLife / totalBodies) * 100 : 0;
    
    if (bodiesWithLife === 0) {
      return `
        <div class="no-life">
          <span class="no-life-icon">🌑</span>
          <span class="no-life-text">まだ生命は誕生していません</span>
        </div>
      `;
    }
    
    const lifeStages = [
      { stage: 'microbial', name: '微生物', icon: '🦠', color: '#4caf50' },
      { stage: 'plant', name: '植物', icon: '🌱', color: '#8bc34a' },
      { stage: 'animal', name: '動物', icon: '🐾', color: '#ff9800' },
      { stage: 'intelligent', name: '知的生命', icon: '🧠', color: '#e91e63' }
    ];
    
    const html = `
      <div class="life-summary">
        <div class="life-overview">
          <span class="life-total">生命体のある天体: ${bodiesWithLife} / ${totalBodies}</span>
          <span class="life-percentage">(${lifePercentage.toFixed(1)}%)</span>
        </div>
        <div class="life-population">
          <span class="population-label">総人口:</span>
          <span class="population-value">${formatNumber(lifeStats.totalPopulation)}</span>
        </div>
      </div>
      <div class="life-chart-container">
        <div class="life-pie-chart">
          <canvas id="life-pie-canvas" width="160" height="160"></canvas>
        </div>
        <div class="life-legend">
          ${lifeStages.map(({ stage, name, icon, color }) => {
            const count = lifeStats[stage] || 0;
            const population = lifeStats.populationByStage[stage] || 0;
            const percentage = bodiesWithLife > 0 ? (count / bodiesWithLife) * 100 : 0;
            
            return `
              <div class="life-legend-item">
                <span class="life-legend-color" style="background-color: ${color}"></span>
                <span class="life-legend-icon">${icon}</span>
                <span class="life-legend-name">${name}</span>
                <span class="life-legend-count" title="${count}個の天体">${count}天体</span>
                <span class="life-legend-population" title="人口: ${formatNumber(population)}">${formatNumber(population, 0)}</span>
                <span class="life-legend-percent">(${percentage.toFixed(1)}%)</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    // 円グラフの描画を予約
    setTimeout(() => this.renderLifePieChart(lifeStats, lifeStages), 0);
    
    return html;
  }
  
  private calculateLifeStatistics(): any {
    const stats = {
      total: 0,
      microbial: 0,
      plant: 0,
      animal: 0,
      intelligent: 0,
      totalPopulation: 0,
      populationByStage: {
        microbial: 0,
        plant: 0,
        animal: 0,
        intelligent: 0
      }
    };
    
    gameState.stars.forEach(body => {
      if (body.userData?.hasLife && body.userData?.lifeStage) {
        stats.total++;
        stats[body.userData.lifeStage]++;
        
        // 人口も集計
        const population = body.userData.population || 0;
        stats.totalPopulation += population;
        stats.populationByStage[body.userData.lifeStage] += population;
      }
    });
    
    return stats;
  }
  
  private renderLifePieChart(lifeStats: any, lifeStages: any[]): void {
    const canvas = document.getElementById('life-pie-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 70;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw pie chart
    let currentAngle = -Math.PI / 2; // Start from top
    
    lifeStages.forEach(({ stage, color }) => {
      const count = lifeStats[stage] || 0;
      if (count === 0) return;
      
      const percentage = count / lifeStats.total;
      const endAngle = currentAngle + (percentage * Math.PI * 2);
      
      // Draw slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      currentAngle = endAngle;
    });
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw total count in center
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Orbitron';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lifeStats.total.toString(), centerX, centerY);
  }
  
  private renderMiniMap(): void {
    const canvas = document.getElementById('mini-map-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.fillStyle = '#000011';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#112233';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      const pos = (i + 1) * 40;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, 200);
      ctx.moveTo(0, pos);
      ctx.lineTo(200, pos);
      ctx.stroke();
    }
    
    // Calculate bounds
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    gameState.stars.forEach(body => {
      minX = Math.min(minX, body.position.x);
      maxX = Math.max(maxX, body.position.x);
      minZ = Math.min(minZ, body.position.z);
      maxZ = Math.max(maxZ, body.position.z);
    });
    
    const rangeX = maxX - minX || 1;
    const rangeZ = maxZ - minZ || 1;
    const scale = Math.min(180 / rangeX, 180 / rangeZ);
    
    // Draw celestial bodies
    gameState.stars.forEach(body => {
      const x = ((body.position.x - minX) * scale) + 10;
      const z = ((body.position.z - minZ) * scale) + 10;
      
      // Set color based on type
      switch (body.userData.type) {
        case 'star':
          ctx.fillStyle = '#ffeb3b';
          break;
        case 'planet':
          ctx.fillStyle = body.userData.hasLife ? '#4caf50' : '#2196f3';
          break;
        case 'moon':
          ctx.fillStyle = '#9e9e9e';
          break;
        case 'asteroid':
          ctx.fillStyle = '#795548';
          break;
        case 'black_hole':
          ctx.fillStyle = '#9c27b0';
          break;
        default:
          ctx.fillStyle = '#ffffff';
      }
      
      // Draw dot
      ctx.beginPath();
      ctx.arc(x, z, body.userData.type === 'star' ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw orbit if planet/moon
      if (body.userData.type === 'planet' || body.userData.type === 'moon') {
        ctx.strokeStyle = ctx.fillStyle + '33'; // 20% opacity
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(100, 100, Math.hypot(x - 100, z - 100), 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }
  
  private calculateProductionRates(): Record<string, number> {
    const rates: Record<string, number> = {
      cosmicDust: 0,
      energy: 0,
      organicMatter: 0,
      biomass: 0,
      darkMatter: 0,
      thoughtPoints: 0
    };
    
    // Base cosmic dust generation
    rates.cosmicDust = 1 * (1 + gameState.dustUpgradeLevel * 0.5);
    
    // Energy from stars
    const stars = gameState.stars.filter(body => body.userData.type === 'star');
    rates.energy = stars.length * 0.5;
    
    // Dark matter conversion
    if (gameState.darkMatterConverterLevel > 0) {
      rates.darkMatter = 0.1 * gameState.darkMatterConverterLevel;
    }
    
    // Life-based resources
    const planetsWithLife = gameState.stars.filter(body => 
      body.userData.type === 'planet' && body.userData.hasLife
    );
    
    planetsWithLife.forEach(planet => {
      const lifeStage = planet.userData.lifeStage;
      switch (lifeStage) {
        case 'microbial':
          rates.organicMatter += 0.1;
          break;
        case 'plant':
          rates.organicMatter += 0.3;
          rates.biomass += 0.1;
          break;
        case 'animal':
          rates.biomass += 0.5;
          break;
        case 'intelligent':
          rates.thoughtPoints += 0.2;
          break;
      }
    });
    
    return rates;
  }
  
  private findNextTarget(): { resource: string; target: number; name: string } | null {
    const milestones = [
      { resource: 'cosmicDust', targets: [1000, 10000, 100000, 1000000] },
      { resource: 'energy', targets: [100, 1000, 10000, 100000] },
      { resource: 'organicMatter', targets: [50, 500, 5000, 50000] },
      { resource: 'biomass', targets: [20, 200, 2000, 20000] },
      { resource: 'darkMatter', targets: [10, 100, 1000, 10000] },
      { resource: 'thoughtPoints', targets: [5, 50, 500, 5000] }
    ];
    
    for (const milestone of milestones) {
      const current = gameState[milestone.resource as keyof typeof gameState] as number;
      
      for (const target of milestone.targets) {
        if (current < target) {
          return {
            resource: milestone.resource,
            target,
            name: this.getResourceDisplayName(milestone.resource)
          };
        }
      }
    }
    
    return null;
  }
  
  private calculateETA(remaining: number, rate: number): string {
    const seconds = remaining / rate;
    
    if (seconds < 60) return `${Math.floor(seconds)}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間`;
    return `${Math.floor(seconds / 86400)}日`;
  }
  
  private getResourceDisplayName(resource: string): string {
    const names: Record<string, string> = {
      cosmicDust: '宇宙の塵',
      energy: 'エネルギー',
      organicMatter: '有機物',
      biomass: 'バイオマス',
      darkMatter: 'ダークマター',
      thoughtPoints: '思考ポイント'
    };
    return names[resource] || resource;
  }
  
  private getResourceClass(resource: string): string {
    return resource.replace(/([A-Z])/g, '-$1').toLowerCase();
  }
  
  hide(): void {
    if (!this.container) return;
    
    animationSystem.fadeOut({
      targets: this.container,
      duration: 300,
      complete: () => {
        this.container?.classList.add('hidden');
        this.stopUpdating();
      }
    });
  }
  
  show(): void {
    if (!this.container) return;
    
    this.container.classList.remove('hidden');
    this.startUpdating();
    this.render();
    
    animationSystem.fadeIn({
      targets: this.container,
      duration: 300
    });
  }
  
  private startUpdating(): void {
    this.stopUpdating();
    
    this.updateTimer = window.setInterval(() => {
      this.update();
    }, this.updateInterval);
  }
  
  private setUpdateInterval(interval: number): void {
    this.updateInterval = interval;
    localStorage.setItem('dashboardUpdateInterval', interval.toString());
    
    // Restart the update timer with new interval
    this.startUpdating();
    
    // Show feedback
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showToast({
        message: `更新頻度を${this.updateFrequencies.find(f => f.value === interval)?.label}に変更しました`,
        type: 'info',
        duration: 2000
      });
    }
  }
  
  private stopUpdating(): void {
    if (this.updateTimer !== null) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }
  
  private update(): void {
    if (!this.container || this.container.classList.contains('minimized')) return;
    
    // Update resource summary
    const resourceSummary = this.container.querySelector('.resource-summary');
    if (resourceSummary) {
      resourceSummary.innerHTML = '<h4>資源概要</h4>' + this.renderResourceSummary();
    }
    
    // Update production rates
    const productionRates = this.container.querySelector('.production-rates');
    if (productionRates) {
      productionRates.innerHTML = '<h4>生産レート (/秒)</h4>' + this.renderProductionRates();
    }
    
    // Update next milestone
    const nextMilestone = this.container.querySelector('.next-milestone');
    if (nextMilestone) {
      nextMilestone.innerHTML = '<h4>次の目標</h4>' + this.renderNextMilestone();
    }
    
    // Update celestial count
    const celestialCount = this.container.querySelector('.celestial-count');
    if (celestialCount) {
      celestialCount.textContent = `天体数: ${gameState.stars.length}`;
    }
    
    // Update life statistics
    const lifeStatistics = this.container.querySelector('.life-statistics');
    if (lifeStatistics) {
      lifeStatistics.innerHTML = '<h4>生命統計</h4>' + this.renderLifeStatistics();
    }
    
    // Update minimap less frequently (every 5 seconds)
    if (Date.now() % 5000 < 1000) {
      this.renderMiniMap();
    }
  }
  
  destroy(): void {
    this.stopUpdating();
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}