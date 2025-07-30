/**
 * Graph Display UI
 * グラフ表示機能の実装
 */

import { gameState } from '../state.js';
import { formatNumber } from '../utils.js';
import { animationSystem } from './simpleAnimations.js';

interface ChartData {
    labels: string[];
    datasets: {
        label: string;
        data: number[];
        color: string;
    }[];
}

export class GraphDisplayUI {
    private static instance: GraphDisplayUI;
    private container: HTMLDivElement | null = null;
    private overlay: HTMLDivElement | null = null;
    private isOpen: boolean = false;
    private updateInterval: number | null = null;
    private currentChart: 'resources' | 'celestial' | 'performance' = 'resources';
    
    private constructor() {}
    
    static getInstance(): GraphDisplayUI {
        if (!GraphDisplayUI.instance) {
            GraphDisplayUI.instance = new GraphDisplayUI();
        }
        return GraphDisplayUI.instance;
    }
    
    open(): void {
        if (this.isOpen) return;
        
        this.createUI();
        this.isOpen = true;
        this.startUpdating();
        
        // アニメーション
        if (this.overlay && this.container) {
            animationSystem.fadeIn(this.overlay);
            animationSystem.scaleIn(this.container);
        }
    }
    
    close(): void {
        if (!this.isOpen) return;
        
        this.stopUpdating();
        
        if (this.overlay && this.container) {
            animationSystem.fadeOut(this.overlay, () => {
                this.overlay?.remove();
                this.overlay = null;
            });
            
            animationSystem.scaleOut(this.container, () => {
                this.container?.remove();
                this.container = null;
            });
        }
        
        this.isOpen = false;
    }
    
    private createUI(): void {
        // オーバーレイ
        this.overlay = document.createElement('div');
        this.overlay.className = 'graph-display-overlay';
        this.overlay.addEventListener('click', () => this.close());
        
        // コンテナ
        this.container = document.createElement('div');
        this.container.className = 'graph-display-container';
        this.container.addEventListener('click', (e) => e.stopPropagation());
        
        // スタイル
        const style = document.createElement('style');
        style.textContent = `
            .graph-display-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 9999;
                opacity: 0;
            }
            
            .graph-display-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.9);
                background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
                border: 2px solid #00d4ff;
                border-radius: 15px;
                padding: 30px;
                width: 90%;
                max-width: 1200px;
                height: 80vh;
                display: flex;
                flex-direction: column;
                box-shadow: 0 0 40px rgba(0, 212, 255, 0.3);
                opacity: 0;
            }
            
            .graph-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid #00d4ff;
            }
            
            .graph-title {
                font-size: 32px;
                color: #00d4ff;
                font-weight: bold;
                text-shadow: 0 0 20px rgba(0, 212, 255, 0.6);
            }
            
            .graph-close {
                background: none;
                border: 2px solid #00d4ff;
                color: #00d4ff;
                font-size: 24px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .graph-close:hover {
                background: #00d4ff;
                color: #0f0c29;
                transform: rotate(90deg);
            }
            
            .graph-tabs {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }
            
            .graph-tab {
                background: rgba(0, 212, 255, 0.1);
                border: 1px solid #00d4ff;
                color: #00d4ff;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 16px;
            }
            
            .graph-tab:hover {
                background: rgba(0, 212, 255, 0.2);
            }
            
            .graph-tab.active {
                background: #00d4ff;
                color: #0f0c29;
            }
            
            .graph-content {
                flex: 1;
                background: rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(0, 212, 255, 0.3);
                border-radius: 10px;
                padding: 20px;
                overflow: hidden;
                position: relative;
            }
            
            .chart-container {
                width: 100%;
                height: 100%;
                position: relative;
            }
            
            .chart-canvas {
                width: 100%;
                height: 100%;
            }
            
            .chart-legend {
                position: absolute;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                border: 1px solid #00d4ff;
                border-radius: 5px;
                padding: 15px;
                font-size: 14px;
            }
            
            .legend-item {
                display: flex;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .legend-color {
                width: 20px;
                height: 3px;
                margin-right: 10px;
            }
            
            .legend-label {
                color: #fff;
            }
            
            .no-data {
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100%;
                color: #8892b0;
                font-size: 18px;
                font-style: italic;
            }
            
            .chart-svg {
                width: 100%;
                height: 100%;
            }
            
            .axis {
                stroke: #8892b0;
                stroke-width: 1;
            }
            
            .axis-label {
                fill: #8892b0;
                font-size: 12px;
            }
            
            .grid-line {
                stroke: rgba(136, 146, 176, 0.1);
                stroke-width: 1;
                stroke-dasharray: 3, 3;
            }
            
            .data-line {
                fill: none;
                stroke-width: 2;
            }
            
            .data-point {
                r: 3;
                transition: r 0.3s ease;
            }
            
            .data-point:hover {
                r: 5;
            }
            
            .tooltip {
                position: absolute;
                background: rgba(0, 0, 0, 0.9);
                border: 1px solid #00d4ff;
                border-radius: 5px;
                padding: 10px;
                color: #fff;
                font-size: 14px;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease;
            }
            
            .tooltip.visible {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
        
        this.updateContent();
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.container);
    }
    
    private updateContent(): void {
        if (!this.container) return;
        
        this.container.innerHTML = `
            <div class="graph-header">
                <h2 class="graph-title">📊 グラフ表示</h2>
                <button class="graph-close">×</button>
            </div>
            
            <div class="graph-tabs">
                <button class="graph-tab ${this.currentChart === 'resources' ? 'active' : ''}" data-chart="resources">
                    リソース推移
                </button>
                <button class="graph-tab ${this.currentChart === 'celestial' ? 'active' : ''}" data-chart="celestial">
                    天体数推移
                </button>
                <button class="graph-tab ${this.currentChart === 'performance' ? 'active' : ''}" data-chart="performance">
                    パフォーマンス
                </button>
            </div>
            
            <div class="graph-content">
                ${this.renderChart()}
            </div>
        `;
        
        // イベントリスナー
        const closeBtn = this.container.querySelector('.graph-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // タブ切り替え
        const tabs = this.container.querySelectorAll('.graph-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const chartType = tab.getAttribute('data-chart') as 'resources' | 'celestial' | 'performance';
                if (chartType) {
                    this.currentChart = chartType;
                    this.updateContent();
                }
            });
        });
        
        // ツールチップ設定
        this.setupTooltips();
    }
    
    private renderChart(): string {
        const data = this.getChartData();
        
        if (data.labels.length === 0) {
            return '<div class="no-data">データが不足しています。もう少しプレイしてからご確認ください。</div>';
        }
        
        return `
            <div class="chart-container">
                <svg class="chart-svg" viewBox="0 0 1000 500">
                    ${this.renderSVGChart(data)}
                </svg>
                <div class="chart-legend">
                    ${data.datasets.map(dataset => `
                        <div class="legend-item">
                            <div class="legend-color" style="background-color: ${dataset.color}"></div>
                            <div class="legend-label">${dataset.label}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="tooltip"></div>
            </div>
        `;
    }
    
    private renderSVGChart(data: ChartData): string {
        const padding = { top: 40, right: 40, bottom: 60, left: 80 };
        const width = 1000 - padding.left - padding.right;
        const height = 500 - padding.top - padding.bottom;
        
        // スケール計算
        const maxValue = Math.max(...data.datasets.flatMap(d => d.data));
        const minValue = 0;
        const xScale = (i: number) => padding.left + (i / (data.labels.length - 1)) * width;
        const yScale = (v: number) => padding.top + height - ((v - minValue) / (maxValue - minValue)) * height;
        
        let svg = '';
        
        // グリッド線
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (height / 5) * i;
            svg += `<line class="grid-line" x1="${padding.left}" y1="${y}" x2="${padding.left + width}" y2="${y}"/>`;
            const value = maxValue - (maxValue / 5) * i;
            svg += `<text class="axis-label" x="${padding.left - 10}" y="${y + 5}" text-anchor="end">${formatNumber(value)}</text>`;
        }
        
        // X軸ラベル
        data.labels.forEach((label, i) => {
            if (i % Math.ceil(data.labels.length / 10) === 0) {
                const x = xScale(i);
                svg += `<text class="axis-label" x="${x}" y="${padding.top + height + 20}" text-anchor="middle">${label}</text>`;
            }
        });
        
        // データライン
        data.datasets.forEach((dataset, datasetIndex) => {
            // ライン
            const pathData = dataset.data.map((value, i) => {
                const x = xScale(i);
                const y = yScale(value);
                return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
            }).join(' ');
            
            svg += `<path class="data-line" d="${pathData}" stroke="${dataset.color}"/>`;
            
            // データポイント
            dataset.data.forEach((value, i) => {
                const x = xScale(i);
                const y = yScale(value);
                svg += `<circle class="data-point" cx="${x}" cy="${y}" fill="${dataset.color}" 
                        data-value="${value}" data-label="${data.labels[i]}" data-series="${dataset.label}"/>`;
            });
        });
        
        // 軸
        svg += `<line class="axis" x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + height}"/>`;
        svg += `<line class="axis" x1="${padding.left}" y1="${padding.top + height}" x2="${padding.left + width}" y2="${padding.top + height}"/>`;
        
        return svg;
    }
    
    private getChartData(): ChartData {
        const stats = gameState.statistics;
        
        switch (this.currentChart) {
            case 'resources':
                return {
                    labels: stats.resources.cosmicDust.history.slice(-20).map(h => 
                        `${Math.floor(h.time / 60)}分`
                    ),
                    datasets: [
                        {
                            label: '宇宙の塵',
                            data: stats.resources.cosmicDust.history.slice(-20).map(h => h.value),
                            color: '#FFD700'
                        },
                        {
                            label: 'エネルギー',
                            data: stats.resources.energy.history.slice(-20).map(h => h.value),
                            color: '#00FFFF'
                        },
                        {
                            label: '有機物',
                            data: stats.resources.organicMatter.history.slice(-20).map(h => h.value),
                            color: '#00FF00'
                        }
                    ]
                };
                
            case 'celestial':
                return {
                    labels: stats.cosmic.starCount.history.slice(-20).map(h => 
                        `${Math.floor(h.time / 60)}分`
                    ),
                    datasets: [
                        {
                            label: '恒星',
                            data: stats.cosmic.starCount.history.slice(-20).map(h => h.value),
                            color: '#FFA500'
                        },
                        {
                            label: '惑星',
                            data: stats.cosmic.planetCount.history.slice(-20).map(h => h.value),
                            color: '#4169E1'
                        },
                        {
                            label: '総天体数',
                            data: stats.cosmic.starCount.history.slice(-20).map((h, i) => {
                                const time = h.time;
                                const stars = h.value;
                                const planets = stats.cosmic.planetCount.history.find(p => 
                                    Math.abs(p.time - time) < 1000
                                )?.value || 0;
                                const asteroids = stats.cosmic.asteroidCount.history.find(a => 
                                    Math.abs(a.time - time) < 1000
                                )?.value || 0;
                                return stars + planets + asteroids;
                            }),
                            color: '#FF69B4'
                        }
                    ]
                };
                
            case 'performance':
                const perfHistory = (window as any).performanceMonitor?.getMetrics()?.history || [];
                return {
                    labels: perfHistory.slice(-20).map((h: any) => 
                        `${Math.floor((Date.now() - h.time) / 1000)}秒前`
                    ).reverse(),
                    datasets: [
                        {
                            label: 'FPS',
                            data: perfHistory.slice(-20).map((h: any) => h.fps).reverse(),
                            color: '#00FF00'
                        },
                        {
                            label: 'フレーム時間 (ms)',
                            data: perfHistory.slice(-20).map((h: any) => h.frameTime).reverse(),
                            color: '#FF0000'
                        }
                    ]
                };
                
            default:
                return { labels: [], datasets: [] };
        }
    }
    
    private setupTooltips(): void {
        const tooltip = this.container?.querySelector('.tooltip') as HTMLDivElement;
        if (!tooltip) return;
        
        const points = this.container?.querySelectorAll('.data-point');
        points?.forEach(point => {
            point.addEventListener('mouseenter', (e) => {
                const target = e.target as SVGCircleElement;
                const value = target.getAttribute('data-value');
                const label = target.getAttribute('data-label');
                const series = target.getAttribute('data-series');
                
                tooltip.innerHTML = `
                    <strong>${series}</strong><br>
                    時刻: ${label}<br>
                    値: ${formatNumber(parseFloat(value || '0'))}
                `;
                
                const rect = target.getBoundingClientRect();
                const containerRect = this.container!.getBoundingClientRect();
                tooltip.style.left = `${rect.left - containerRect.left + 10}px`;
                tooltip.style.top = `${rect.top - containerRect.top - 10}px`;
                tooltip.classList.add('visible');
            });
            
            point.addEventListener('mouseleave', () => {
                tooltip.classList.remove('visible');
            });
        });
    }
    
    private startUpdating(): void {
        this.updateInterval = window.setInterval(() => {
            this.updateContent();
        }, 5000);
    }
    
    private stopUpdating(): void {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// グローバルに公開
(window as any).graphDisplayUI = GraphDisplayUI.getInstance();