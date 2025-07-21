/**
 * Production Analysis UI
 * 生産効率分析のUIシステム
 */

import { productionAnalyzer } from './productionAnalyzer.js';
import { ResourceType } from '../resourceSystem.js';
import { 
  AnalysisReport, 
  Bottleneck, 
  ResourcePrediction,
  OptimizationSuggestion,
  ChartConfig,
  ProductionMetrics
} from '../types/productionAnalysis.js';

export class ProductionAnalysisUI {
  private static instance: ProductionAnalysisUI;
  private container: HTMLElement | null = null;
  private isOpen: boolean = false;
  private updateInterval: number | null = null;
  private charts: Map<string, any> = new Map();
  
  private constructor() {
    console.log('[PRODUCTION-ANALYSIS-UI] Initialized');
  }
  
  static getInstance(): ProductionAnalysisUI {
    if (!ProductionAnalysisUI.instance) {
      ProductionAnalysisUI.instance = new ProductionAnalysisUI();
    }
    return ProductionAnalysisUI.instance;
  }
  
  // UI初期化
  init(): void {
    this.createUI();
    this.setupEventListeners();
    this.addStyles();
    
    // 分析完了イベントのリスナー登録
    window.addEventListener('productionAnalysisComplete', (e: any) => {
      if (this.isOpen) {
        this.updateDisplay(e.detail);
      }
    });
  }
  
  // UI作成
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'production-analysis-ui';
    this.container.className = 'production-analysis-container hidden';
    this.container.innerHTML = `
      <div class="analysis-header">
        <h2>生産効率分析</h2>
        <button class="close-button" id="analysis-close">×</button>
      </div>
      
      <div class="analysis-controls">
        <button class="control-button" id="analysis-toggle">
          <span class="control-icon">▶</span>
          <span class="control-text">分析開始</span>
        </button>
        <select id="update-interval" class="control-select">
          <option value="5000">5秒ごと</option>
          <option value="10000">10秒ごと</option>
          <option value="30000">30秒ごと</option>
          <option value="60000">1分ごと</option>
        </select>
      </div>
      
      <div class="analysis-tabs">
        <button class="tab-button active" data-tab="overview">概要</button>
        <button class="tab-button" data-tab="bottlenecks">ボトルネック</button>
        <button class="tab-button" data-tab="predictions">予測</button>
        <button class="tab-button" data-tab="flow">フロー分析</button>
        <button class="tab-button" data-tab="recommendations">最適化提案</button>
      </div>
      
      <div class="analysis-content">
        <div class="tab-content active" id="overview-tab">
          ${this.createOverviewTab()}
        </div>
        <div class="tab-content" id="bottlenecks-tab">
          ${this.createBottlenecksTab()}
        </div>
        <div class="tab-content" id="predictions-tab">
          ${this.createPredictionsTab()}
        </div>
        <div class="tab-content" id="flow-tab">
          ${this.createFlowTab()}
        </div>
        <div class="tab-content" id="recommendations-tab">
          ${this.createRecommendationsTab()}
        </div>
      </div>
    `;
    
    document.body.appendChild(this.container);
  }
  
  // 概要タブ
  private createOverviewTab(): string {
    return `
      <div class="overview-section">
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>全体効率</h3>
            <div class="metric-value" id="overall-efficiency">--</div>
            <div class="metric-label">利用率</div>
          </div>
          <div class="metric-card">
            <h3>廃棄率</h3>
            <div class="metric-value" id="waste-percentage">--</div>
            <div class="metric-label">リソースロス</div>
          </div>
          <div class="metric-card">
            <h3>ボトルネック数</h3>
            <div class="metric-value" id="bottleneck-count">--</div>
            <div class="metric-label">検出された問題</div>
          </div>
          <div class="metric-card">
            <h3>生産性評価</h3>
            <div class="metric-value" id="productivity-rating">--</div>
            <div class="metric-label">総合評価</div>
          </div>
        </div>
        
        <div class="production-summary">
          <h3>資源別生産状況</h3>
          <div id="resource-production-list" class="resource-list">
            <!-- 動的に生成 -->
          </div>
        </div>
        
        <div class="chart-container">
          <canvas id="production-chart"></canvas>
        </div>
      </div>
    `;
  }
  
  // ボトルネックタブ
  private createBottlenecksTab(): string {
    return `
      <div class="bottlenecks-section">
        <div class="bottleneck-filter">
          <label>重要度フィルター:</label>
          <select id="bottleneck-severity-filter">
            <option value="all">すべて</option>
            <option value="critical">危機的</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
        <div id="bottleneck-list" class="bottleneck-list">
          <!-- 動的に生成 -->
        </div>
      </div>
    `;
  }
  
  // 予測タブ
  private createPredictionsTab(): string {
    return `
      <div class="predictions-section">
        <div class="prediction-timeframe">
          <label>予測期間:</label>
          <select id="prediction-timeframe">
            <option value="300">5分後</option>
            <option value="900">15分後</option>
            <option value="1800">30分後</option>
            <option value="3600" selected>1時間後</option>
          </select>
        </div>
        <div id="prediction-list" class="prediction-list">
          <!-- 動的に生成 -->
        </div>
        <div class="chart-container">
          <canvas id="prediction-chart"></canvas>
        </div>
      </div>
    `;
  }
  
  // フロー分析タブ
  private createFlowTab(): string {
    return `
      <div class="flow-section">
        <div class="flow-visualization" id="flow-diagram">
          <!-- フロー図を動的に生成 -->
        </div>
        <div class="flow-details" id="flow-details">
          <h3>フロー詳細</h3>
          <div class="flow-stats">
            <!-- 動的に生成 -->
          </div>
        </div>
      </div>
    `;
  }
  
  // 最適化提案タブ
  private createRecommendationsTab(): string {
    return `
      <div class="recommendations-section">
        <div class="recommendation-filter">
          <label>アクションタイプ:</label>
          <select id="recommendation-filter">
            <option value="all">すべて</option>
            <option value="celestial_create">天体作成</option>
            <option value="conversion_adjust">変換調整</option>
            <option value="research">研究</option>
            <option value="automation">自動化</option>
          </select>
        </div>
        <div id="recommendation-list" class="recommendation-list">
          <!-- 動的に生成 -->
        </div>
      </div>
    `;
  }
  
  // イベントリスナー設定
  private setupEventListeners(): void {
    // 閉じるボタン
    const closeBtn = document.getElementById('analysis-close');
    closeBtn?.addEventListener('click', () => this.close());
    
    // 分析トグル
    const toggleBtn = document.getElementById('analysis-toggle');
    toggleBtn?.addEventListener('click', () => this.toggleAnalysis());
    
    // 更新間隔変更
    const intervalSelect = document.getElementById('update-interval') as HTMLSelectElement;
    intervalSelect?.addEventListener('change', (e) => {
      const interval = parseInt((e.target as HTMLSelectElement).value);
      productionAnalyzer.setUpdateInterval(interval);
    });
    
    // タブ切り替え
    this.container?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('tab-button')) {
        const tabName = target.getAttribute('data-tab');
        if (tabName) {
          this.switchTab(tabName);
        }
      }
    });
    
    // フィルター変更
    const severityFilter = document.getElementById('bottleneck-severity-filter');
    severityFilter?.addEventListener('change', () => this.updateBottleneckDisplay());
    
    const recommendationFilter = document.getElementById('recommendation-filter');
    recommendationFilter?.addEventListener('change', () => this.updateRecommendationDisplay());
  }
  
  // タブ切り替え
  private switchTab(tabName: string): void {
    // タブボタン
    this.container?.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // タブコンテンツ
    this.container?.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `${tabName}-tab`);
    });
  }
  
  // 分析トグル
  private toggleAnalysis(): void {
    const state = productionAnalyzer.getState();
    const toggleBtn = document.getElementById('analysis-toggle');
    const icon = toggleBtn?.querySelector('.control-icon');
    const text = toggleBtn?.querySelector('.control-text');
    
    if (state.isAnalyzing) {
      productionAnalyzer.stop();
      if (icon) icon.textContent = '▶';
      if (text) text.textContent = '分析開始';
      toggleBtn?.classList.remove('active');
    } else {
      productionAnalyzer.start();
      if (icon) icon.textContent = '⏸';
      if (text) text.textContent = '分析停止';
      toggleBtn?.classList.add('active');
    }
  }
  
  // 表示更新
  private updateDisplay(report?: AnalysisReport): void {
    const latestReport = report || productionAnalyzer.getLatestReport();
    if (!latestReport) return;
    
    this.updateOverview(latestReport);
    this.updateBottleneckDisplay();
    this.updatePredictionDisplay();
    this.updateFlowDisplay();
    this.updateRecommendationDisplay();
  }
  
  // 概要更新
  private updateOverview(report: AnalysisReport): void {
    const metrics = report.metrics;
    
    // メトリクス更新
    const efficiencyEl = document.getElementById('overall-efficiency');
    if (efficiencyEl) {
      efficiencyEl.textContent = `${Math.round(metrics.utilizationRate * 100)}%`;
    }
    
    const wasteEl = document.getElementById('waste-percentage');
    if (wasteEl) {
      wasteEl.textContent = `${Math.round(metrics.wastePercentage)}%`;
    }
    
    const bottleneckEl = document.getElementById('bottleneck-count');
    if (bottleneckEl) {
      bottleneckEl.textContent = report.bottlenecks.length.toString();
    }
    
    const ratingEl = document.getElementById('productivity-rating');
    if (ratingEl) {
      const rating = this.calculateProductivityRating(metrics);
      ratingEl.textContent = rating;
      ratingEl.className = `metric-value rating-${rating.toLowerCase()}`;
    }
    
    // 資源別生産状況
    this.updateResourceProductionList(metrics);
  }
  
  // 生産性評価の計算
  private calculateProductivityRating(metrics: ProductionMetrics): string {
    const utilization = metrics.utilizationRate;
    const waste = metrics.wastePercentage / 100;
    const score = utilization * (1 - waste);
    
    if (score >= 0.8) return 'S';
    if (score >= 0.6) return 'A';
    if (score >= 0.4) return 'B';
    if (score >= 0.2) return 'C';
    return 'D';
  }
  
  // 資源生産リストの更新
  private updateResourceProductionList(metrics: ProductionMetrics): void {
    const listEl = document.getElementById('resource-production-list');
    if (!listEl) return;
    
    // 基本リソースのみ表示
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];
    
    const items = basicResources.map(resource => {
      const production = metrics.totalProduction[resource] || 0;
      const consumption = metrics.totalConsumption[resource] || 0;
      const net = metrics.netProduction[resource] || 0;
      const efficiency = metrics.efficiency[resource] || 0;
      
      const trend = net > 0 ? '↑' : net < 0 ? '↓' : '→';
      const trendClass = net > 0 ? 'positive' : net < 0 ? 'negative' : 'stable';
      
      return `
        <div class="resource-item">
          <div class="resource-name">${this.getResourceDisplayName(resource)}</div>
          <div class="resource-stats">
            <span class="stat production">+${Math.round(production)}/s</span>
            <span class="stat consumption">-${Math.round(consumption)}/s</span>
            <span class="stat net ${trendClass}">${trend} ${Math.round(Math.abs(net))}/s</span>
            <span class="stat efficiency">${Math.round(efficiency * 100)}%</span>
          </div>
        </div>
      `;
    }).join('');
    
    listEl.innerHTML = items;
  }
  
  // ボトルネック表示更新
  private updateBottleneckDisplay(): void {
    const report = productionAnalyzer.getLatestReport();
    if (!report) return;
    
    const listEl = document.getElementById('bottleneck-list');
    if (!listEl) return;
    
    const filterEl = document.getElementById('bottleneck-severity-filter') as HTMLSelectElement;
    const filter = filterEl?.value || 'all';
    
    const filteredBottlenecks = filter === 'all' 
      ? report.bottlenecks 
      : report.bottlenecks.filter(b => b.severity === filter);
    
    if (filteredBottlenecks.length === 0) {
      listEl.innerHTML = '<div class="empty-message">ボトルネックは検出されていません</div>';
      return;
    }
    
    const items = filteredBottlenecks.map(bottleneck => `
      <div class="bottleneck-item severity-${bottleneck.severity}">
        <div class="bottleneck-header">
          <span class="bottleneck-type">${this.getBottleneckTypeLabel(bottleneck.type)}</span>
          <span class="bottleneck-severity">${this.getSeverityLabel(bottleneck.severity)}</span>
        </div>
        <div class="bottleneck-description">${bottleneck.description}</div>
        <div class="bottleneck-impact">
          <div class="impact-bar">
            <div class="impact-fill" style="width: ${bottleneck.impact}%"></div>
          </div>
          <span class="impact-value">影響度: ${Math.round(bottleneck.impact)}%</span>
        </div>
        ${bottleneck.suggestions.length > 0 ? `
          <div class="bottleneck-suggestions">
            <div class="suggestion-label">対策:</div>
            ${bottleneck.suggestions.map(s => `
              <div class="suggestion-item">${s.title}</div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `).join('');
    
    listEl.innerHTML = items;
  }
  
  // 予測表示更新
  private updatePredictionDisplay(): void {
    const report = productionAnalyzer.getLatestReport();
    if (!report) return;
    
    const listEl = document.getElementById('prediction-list');
    if (!listEl) return;
    
    const items = report.predictions.map(prediction => {
      const trendIcon = {
        'increasing': '📈',
        'stable': '➡️',
        'decreasing': '📉',
        'depleting': '⚠️'
      }[prediction.trend];
      
      return `
        <div class="prediction-item trend-${prediction.trend}">
          <div class="prediction-header">
            <span class="prediction-resource">${this.getResourceDisplayName(prediction.resource)}</span>
            <span class="prediction-trend">${trendIcon}</span>
          </div>
          <div class="prediction-values">
            <div class="current-value">
              現在: ${Math.round(prediction.currentAmount)}
            </div>
            <div class="predicted-value">
              予測: ${Math.round(prediction.predictedAmount)}
            </div>
            ${prediction.depletionTime ? `
              <div class="depletion-warning">
                ⚠️ ${Math.round(prediction.depletionTime)}秒で枯渇
              </div>
            ` : ''}
          </div>
          <div class="confidence-level">
            信頼度: ${Math.round(prediction.confidenceLevel * 100)}%
          </div>
        </div>
      `;
    }).join('');
    
    listEl.innerHTML = items;
  }
  
  // フロー表示更新
  private updateFlowDisplay(): void {
    const report = productionAnalyzer.getLatestReport();
    if (!report) return;
    
    // 簡略化されたフロー表示（実際のプロジェクトではD3.jsなどを使用）
    const diagramEl = document.getElementById('flow-diagram');
    if (!diagramEl) return;
    
    // フローの集計
    const flowSummary = new Map<string, number>();
    report.flowAnalysis.forEach(flow => {
      const key = `${flow.fromResource} → ${flow.toResource}`;
      flowSummary.set(key, (flowSummary.get(key) || 0) + flow.rate);
    });
    
    const flowItems = Array.from(flowSummary.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([flow, rate]) => `
        <div class="flow-item">
          <span class="flow-path">${flow}</span>
          <span class="flow-rate">${Math.round(rate * 10) / 10}/s</span>
        </div>
      `).join('');
    
    diagramEl.innerHTML = `
      <h3>主要な資源フロー</h3>
      <div class="flow-list">${flowItems}</div>
    `;
  }
  
  // 提案表示更新
  private updateRecommendationDisplay(): void {
    const report = productionAnalyzer.getLatestReport();
    if (!report) return;
    
    const listEl = document.getElementById('recommendation-list');
    if (!listEl) return;
    
    const filterEl = document.getElementById('recommendation-filter') as HTMLSelectElement;
    const filter = filterEl?.value || 'all';
    
    const filteredRecommendations = filter === 'all'
      ? report.recommendations
      : report.recommendations.filter(r => r.actionType === filter);
    
    if (filteredRecommendations.length === 0) {
      listEl.innerHTML = '<div class="empty-message">現在、最適化提案はありません</div>';
      return;
    }
    
    const items = filteredRecommendations.map(recommendation => `
      <div class="recommendation-item priority-${recommendation.priority}">
        <div class="recommendation-header">
          <h4>${recommendation.title}</h4>
          <span class="priority-badge">${this.getPriorityLabel(recommendation.priority)}</span>
        </div>
        <div class="recommendation-description">${recommendation.description}</div>
        <div class="recommendation-footer">
          <span class="expected-improvement">
            期待効果: +${recommendation.expectedImprovement}%
          </span>
          <button class="apply-button" data-recommendation="${recommendation.id}">
            適用
          </button>
        </div>
      </div>
    `).join('');
    
    listEl.innerHTML = items;
    
    // 適用ボタンのイベント設定
    listEl.querySelectorAll('.apply-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const recommendationId = target.getAttribute('data-recommendation');
        if (recommendationId) {
          this.applyRecommendation(recommendationId);
        }
      });
    });
  }
  
  // 提案の適用
  private applyRecommendation(recommendationId: string): void {
    console.log('[PRODUCTION-ANALYSIS-UI] Applying recommendation:', recommendationId);
    // TODO: 実際の提案適用ロジックを実装
    
    // フィードバック表示
    const feedbackSystem = (window as any).feedbackSystem;
    if (feedbackSystem) {
      feedbackSystem.showToast({
        message: '最適化提案を適用しました',
        type: 'success'
      });
    }
  }
  
  // ヘルパー関数
  private getResourceDisplayName(resource: ResourceType): string {
    const names: { [key: string]: string } = {
      [ResourceType.COSMIC_DUST]: '宇宙の塵',
      [ResourceType.ENERGY]: 'エネルギー',
      [ResourceType.ORGANIC_MATTER]: '有機物',
      [ResourceType.BIOMASS]: 'バイオマス',
      [ResourceType.DARK_MATTER]: 'ダークマター',
      [ResourceType.THOUGHT_POINTS]: '思考ポイント'
    };
    return names[resource] || resource;
  }
  
  private getBottleneckTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'input': '供給不足',
      'output': '需要超過',
      'conversion': '変換効率',
      'storage': 'ストレージ'
    };
    return labels[type] || type;
  }
  
  private getSeverityLabel(severity: string): string {
    const labels: { [key: string]: string } = {
      'critical': '危機的',
      'high': '高',
      'medium': '中',
      'low': '低'
    };
    return labels[severity] || severity;
  }
  
  private getPriorityLabel(priority: string): string {
    const labels: { [key: string]: string } = {
      'high': '優先度高',
      'medium': '優先度中',
      'low': '優先度低'
    };
    return labels[priority] || priority;
  }
  
  // 開く
  open(): void {
    if (!this.container) return;
    this.container.classList.remove('hidden');
    this.isOpen = true;
    
    // 最新データで表示を更新
    this.updateDisplay();
  }
  
  // 閉じる
  close(): void {
    if (!this.container) return;
    this.container.classList.add('hidden');
    this.isOpen = false;
  }
  
  // トグル
  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
  
  // スタイル追加
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .production-analysis-container {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 900px;
        max-height: 700px;
        background: rgba(10, 10, 20, 0.98);
        border: 2px solid #4a4aff;
        border-radius: 15px;
        padding: 20px;
        z-index: 1000;
        overflow-y: auto;
        box-shadow: 0 0 30px rgba(74, 74, 255, 0.8);
      }
      
      .production-analysis-container.hidden {
        display: none;
      }
      
      .analysis-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
      }
      
      .analysis-header h2 {
        color: #4a4aff;
        margin: 0;
      }
      
      .close-button {
        background: none;
        border: none;
        color: #fff;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
      }
      
      .analysis-controls {
        display: flex;
        gap: 15px;
        margin-bottom: 20px;
      }
      
      .control-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 20px;
        background: #2a2a4a;
        border: 1px solid #4a4aff;
        border-radius: 5px;
        color: #fff;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .control-button.active {
        background: #4a4aff;
      }
      
      .control-select {
        padding: 8px 15px;
        background: #1a1a2e;
        border: 1px solid #333;
        border-radius: 5px;
        color: #fff;
      }
      
      .analysis-tabs {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        border-bottom: 1px solid #333;
      }
      
      .tab-button {
        background: none;
        border: none;
        color: #aaa;
        padding: 10px 20px;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .tab-button.active {
        color: #4a4aff;
        border-bottom: 2px solid #4a4aff;
      }
      
      .tab-content {
        display: none;
      }
      
      .tab-content.active {
        display: block;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 15px;
        margin-bottom: 30px;
      }
      
      .metric-card {
        background: rgba(20, 20, 40, 0.8);
        border: 1px solid #333;
        border-radius: 10px;
        padding: 15px;
        text-align: center;
      }
      
      .metric-card h3 {
        color: #aaa;
        font-size: 14px;
        margin: 0 0 10px 0;
      }
      
      .metric-value {
        font-size: 32px;
        color: #4a4aff;
        font-weight: bold;
      }
      
      .metric-label {
        color: #666;
        font-size: 12px;
        margin-top: 5px;
      }
      
      .resource-list {
        background: rgba(20, 20, 40, 0.8);
        border: 1px solid #333;
        border-radius: 10px;
        padding: 15px;
      }
      
      .resource-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid #222;
      }
      
      .resource-item:last-child {
        border-bottom: none;
      }
      
      .resource-stats {
        display: flex;
        gap: 15px;
      }
      
      .stat {
        font-size: 14px;
      }
      
      .stat.production {
        color: #4aff4a;
      }
      
      .stat.consumption {
        color: #ff4a4a;
      }
      
      .stat.net.positive {
        color: #4aff4a;
      }
      
      .stat.net.negative {
        color: #ff4a4a;
      }
      
      .stat.net.stable {
        color: #ffff4a;
      }
      
      .stat.efficiency {
        color: #4a4aff;
      }
      
      .bottleneck-item {
        background: rgba(20, 20, 40, 0.8);
        border: 1px solid #333;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 15px;
      }
      
      .bottleneck-item.severity-critical {
        border-color: #ff0000;
      }
      
      .bottleneck-item.severity-high {
        border-color: #ff8800;
      }
      
      .bottleneck-item.severity-medium {
        border-color: #ffff00;
      }
      
      .bottleneck-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      
      .bottleneck-type {
        color: #4a4aff;
        font-weight: bold;
      }
      
      .bottleneck-severity {
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 12px;
      }
      
      .severity-critical .bottleneck-severity {
        background: #ff0000;
        color: #fff;
      }
      
      .severity-high .bottleneck-severity {
        background: #ff8800;
        color: #fff;
      }
      
      .severity-medium .bottleneck-severity {
        background: #ffff00;
        color: #000;
      }
      
      .impact-bar {
        width: 100%;
        height: 10px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
        overflow: hidden;
        margin-top: 10px;
      }
      
      .impact-fill {
        height: 100%;
        background: linear-gradient(to right, #4a4aff, #ff4a4a);
        transition: width 0.3s;
      }
      
      .recommendation-item {
        background: rgba(20, 20, 40, 0.8);
        border: 1px solid #333;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 15px;
      }
      
      .recommendation-item.priority-high {
        border-color: #4a4aff;
      }
      
      .recommendation-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .recommendation-header h4 {
        margin: 0;
        color: #4a4aff;
      }
      
      .priority-badge {
        padding: 4px 10px;
        border-radius: 15px;
        font-size: 12px;
        background: rgba(74, 74, 255, 0.2);
        color: #4a4aff;
      }
      
      .recommendation-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 15px;
      }
      
      .expected-improvement {
        color: #4aff4a;
        font-weight: bold;
      }
      
      .apply-button {
        padding: 6px 20px;
        background: #4a4aff;
        border: none;
        border-radius: 5px;
        color: #fff;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .apply-button:hover {
        background: #5a5aff;
        transform: translateY(-2px);
      }
      
      .empty-message {
        text-align: center;
        color: #666;
        padding: 40px;
        font-style: italic;
      }
      
      .rating-S { color: #ffd700 !important; }
      .rating-A { color: #4aff4a !important; }
      .rating-B { color: #4a4aff !important; }
      .rating-C { color: #ffff4a !important; }
      .rating-D { color: #ff4a4a !important; }
    `;
    document.head.appendChild(style);
  }
}

export const productionAnalysisUI = ProductionAnalysisUI.getInstance();