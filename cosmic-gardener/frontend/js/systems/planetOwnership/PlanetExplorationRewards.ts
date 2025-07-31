/**
 * Planet Exploration Rewards
 * 惑星探索終了時のシンプルな報酬画面
 */

import { gameState } from '../../state.js';
import { formatNumber } from '../../utils.js';
import { addTimelineLog } from '../../timeline.js';
import { showMessage } from '../../ui.js';

// 探索結果データ（シンプル化）
export interface ExplorationResult {
    duration: number; // 探索時間（秒）
    coinsEarned: number; // 獲得したコイン
    buildingsPlaced: number; // 建設した建物数
    objectivesCompleted: number; // 達成した目標数
    bonusReasons: Array<{
        reason: string;
        amount: number;
    }>; // ボーナスの理由
}

export class PlanetExplorationRewards {
    private static instance: PlanetExplorationRewards;
    private container: HTMLDivElement | null = null;
    private result: ExplorationResult | null = null;
    private isOpen = false;
    
    private constructor() {}
    
    static getInstance(): PlanetExplorationRewards {
        if (!PlanetExplorationRewards.instance) {
            PlanetExplorationRewards.instance = new PlanetExplorationRewards();
        }
        return PlanetExplorationRewards.instance;
    }
    
    /**
     * 報酬画面を表示
     */
    show(result: ExplorationResult): void {
        if (this.isOpen) return;
        
        this.result = result;
        this.isOpen = true;
        this.createUI();
        this.calculateRewards();
    }
    
    /**
     * 報酬画面を閉じる
     */
    close(): void {
        if (!this.isOpen) return;
        
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        this.isOpen = false;
    }
    
    /**
     * UIを作成
     */
    private createUI(): void {
        this.container = document.createElement('div');
        this.container.id = 'exploration-rewards';
        this.container.innerHTML = `
            <style>
                #exploration-rewards {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: linear-gradient(135deg, rgba(20, 20, 30, 0.98), rgba(30, 30, 40, 0.98));
                    border: 3px solid #FFD700;
                    border-radius: 20px;
                    padding: 40px;
                    min-width: 500px;
                    max-width: 600px;
                    z-index: 100000;
                    box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
                    animation: rewardFadeIn 0.5s ease-out;
                    text-align: center;
                }
                
                @keyframes rewardFadeIn {
                    from {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.8);
                    }
                    to {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                }
                
                .rewards-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                
                .rewards-title {
                    font-size: 48px;
                    color: #FFD700;
                    font-weight: bold;
                    margin-bottom: 10px;
                    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
                }
                
                .rewards-subtitle {
                    font-size: 18px;
                    color: #AAA;
                }
                
                .coin-display {
                    font-size: 64px;
                    color: #FFD700;
                    margin: 30px 0;
                    font-weight: bold;
                    text-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
                    animation: coinPulse 2s ease-in-out infinite;
                }
                
                @keyframes coinPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                }
                
                .bonus-list {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 10px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: left;
                }
                
                .bonus-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                
                .bonus-item:last-child {
                    border-bottom: none;
                }
                
                .bonus-reason {
                    color: #CCC;
                }
                
                .bonus-amount {
                    color: #4CAF50;
                    font-weight: bold;
                }
                
                .stats-row {
                    display: flex;
                    justify-content: space-around;
                    margin: 20px 0;
                }
                
                .stat-box {
                    text-align: center;
                }
                
                .stat-value {
                    font-size: 32px;
                    color: #FFD700;
                    font-weight: bold;
                }
                
                .stat-label {
                    font-size: 14px;
                    color: #888;
                    margin-top: 5px;
                }
                
                .close-button {
                    display: block;
                    margin: 30px auto 0;
                    padding: 15px 50px;
                    background: linear-gradient(135deg, #FFD700, #FFA500);
                    border: none;
                    border-radius: 30px;
                    color: #000;
                    font-size: 20px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: all 0.3s;
                    box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
                }
                
                .close-button:hover {
                    transform: scale(1.05);
                    box-shadow: 0 6px 20px rgba(255, 215, 0, 0.6);
                }
            </style>
            
            <div class="rewards-header">
                <div class="rewards-title">🎉 おつかれさま！</div>
                <div class="rewards-subtitle">
                    探索時間: ${this.formatDuration(this.result?.duration || 0)}
                </div>
            </div>
            
            <div class="coin-display">
                💰 +${this.result?.coinsEarned || 0}
            </div>
            
            <div class="stats-row">
                <div class="stat-box">
                    <div class="stat-value">${this.result?.buildingsPlaced || 0}</div>
                    <div class="stat-label">建物を配置</div>
                </div>
                <div class="stat-box">
                    <div class="stat-value">${this.result?.objectivesCompleted || 0}</div>
                    <div class="stat-label">目標達成</div>
                </div>
            </div>
            
            ${this.result?.bonusReasons && this.result.bonusReasons.length > 0 ? `
                <div class="bonus-list">
                    <h3 style="color: #FFD700; margin-bottom: 15px; text-align: center;">✨ ボーナス内訳</h3>
                    ${this.result.bonusReasons.map(bonus => `
                        <div class="bonus-item">
                            <span class="bonus-reason">${bonus.reason}</span>
                            <span class="bonus-amount">+${bonus.amount} コイン</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <button class="close-button" id="close-rewards">
                閉じる
            </button>
        `;
        
        document.body.appendChild(this.container);
        
        // イベントリスナー
        const closeBtn = document.getElementById('close-rewards');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.close();
                // メインゲームに戻る処理をトリガー
                (window as any).returnToMainGame?.();
            });
        }
    }
    
    /**
     * 報酬を計算して適用
     */
    private calculateRewards(): void {
        if (!this.result) return;
        
        // シンプルにコインだけを付与
        const totalCoins = this.result.coinsEarned;
        
        // メインゲームの宇宙の塵に変換
        gameState.resources.cosmicDust += totalCoins;
        
        // タイムラインに記録
        addTimelineLog(`惑星探索完了: +${formatNumber(totalCoins)} コイン獲得`);
        
        // 成功メッセージ
        showMessage(`${formatNumber(totalCoins)} コインを獲得しました！`, 'success');
    }
    
    /**
     * 時間をフォーマット
     */
    private formatDuration(seconds: number): string {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}分${secs}秒`;
    }
}