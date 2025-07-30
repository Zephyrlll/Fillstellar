/**
 * Celestial Body Limiter System
 * 天体数を制限してパフォーマンスを維持
 */

import { gameStateManager } from '../state.js';
import { ui } from '../ui.js';

interface CelestialLimits {
  asteroid: number;
  comet: number;
  moon: number;
  planet: number;
  star: number;
  black_hole: number;
  total: number;
}

class CelestialLimiterSystem {
  private static instance: CelestialLimiterSystem;
  
  // デフォルトの制限値
  private limits: CelestialLimits = {
    asteroid: 30,      // 小惑星は多めに
    comet: 20,         // 彗星
    moon: 15,          // 月
    planet: 10,        // 惑星
    star: 5,           // 恒星は少なめに
    black_hole: 3,     // ブラックホールは最小限
    total: 50          // 全体の上限
  };
  
  private constructor() {
    console.log('[LIMITER] Celestial limiter system initialized');
  }
  
  static getInstance(): CelestialLimiterSystem {
    if (!CelestialLimiterSystem.instance) {
      CelestialLimiterSystem.instance = new CelestialLimiterSystem();
    }
    return CelestialLimiterSystem.instance;
  }
  
  // 天体作成が可能かチェック
  canCreateCelestialBody(type: keyof CelestialLimits): boolean {
    const state = gameStateManager.getState();
    const bodies = state.celestialBodies || state.stars || [];
    
    // 総数チェック
    if (bodies.length >= this.limits.total) {
      this.showLimitWarning('total');
      return false;
    }
    
    // タイプ別チェック
    const typeCount = bodies.filter(body => body.userData.type === type).length;
    if (typeCount >= this.limits[type]) {
      this.showLimitWarning(type);
      return false;
    }
    
    return true;
  }
  
  // 現在の天体数を取得
  getCurrentCounts(): Record<string, number> {
    const state = gameStateManager.getState();
    const bodies = state.celestialBodies || state.stars || [];
    
    const counts: Record<string, number> = {
      asteroid: 0,
      comet: 0,
      moon: 0,
      planet: 0,
      star: 0,
      black_hole: 0,
      total: bodies.length
    };
    
    bodies.forEach(body => {
      const type = body.userData.type;
      if (type in counts) {
        counts[type]++;
      }
    });
    
    return counts;
  }
  
  // 制限警告を表示
  private showLimitWarning(type: string): void {
    let message = '';
    
    if (type === 'total') {
      message = `天体数が上限（${this.limits.total}個）に達しました。パフォーマンスを維持するため、既存の天体を削除してから新しい天体を作成してください。`;
    } else {
      const typeName = this.getTypeNameJapanese(type);
      message = `${typeName}の数が上限（${this.limits[type as keyof CelestialLimits]}個）に達しました。`;
    }
    
    ui.showNotification(message, 'warning');
    
    // より詳細な通知も表示
    this.showLimitModal();
  }
  
  // 制限モーダルを表示
  private showLimitModal(): void {
    const modal = document.createElement('div');
    modal.className = 'celestial-limit-modal';
    modal.innerHTML = `
      <div class="limit-modal-content">
        <h3>⚠️ 天体数の制限</h3>
        <p>パフォーマンスを維持するため、天体数には制限があります。</p>
        
        <div class="limit-stats">
          ${this.generateLimitStats()}
        </div>
        
        <div class="limit-tips">
          <h4>💡 ヒント</h4>
          <ul>
            <li>不要な小惑星を削除して空きを作る</li>
            <li>小さな天体を合体させて大きな天体にする</li>
            <li>恒星の数を抑えてエネルギー効率を上げる</li>
          </ul>
        </div>
        
        <button class="limit-modal-close" onclick="this.closest('.celestial-limit-modal').remove()">閉じる</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // アニメーション
    setTimeout(() => modal.classList.add('show'), 10);
  }
  
  // 制限統計を生成
  private generateLimitStats(): string {
    const counts = this.getCurrentCounts();
    let html = '<table class="limit-table">';
    
    const types = ['asteroid', 'comet', 'moon', 'planet', 'star', 'black_hole'];
    types.forEach(type => {
      const current = counts[type] || 0;
      const limit = this.limits[type as keyof CelestialLimits];
      const percentage = (current / limit) * 100;
      const isNearLimit = percentage >= 80;
      
      html += `
        <tr class="${isNearLimit ? 'near-limit' : ''}">
          <td>${this.getTypeNameJapanese(type)}</td>
          <td>${current} / ${limit}</td>
          <td>
            <div class="limit-bar">
              <div class="limit-fill" style="width: ${percentage}%"></div>
            </div>
          </td>
        </tr>
      `;
    });
    
    html += `
      <tr class="total-row">
        <td>合計</td>
        <td>${counts.total} / ${this.limits.total}</td>
        <td>
          <div class="limit-bar">
            <div class="limit-fill" style="width: ${(counts.total / this.limits.total) * 100}%"></div>
          </div>
        </td>
      </tr>
    `;
    
    html += '</table>';
    return html;
  }
  
  // タイプ名を日本語に変換
  private getTypeNameJapanese(type: string): string {
    const names: Record<string, string> = {
      asteroid: '小惑星',
      comet: '彗星',
      moon: '月',
      planet: '惑星',
      star: '恒星',
      black_hole: 'ブラックホール',
      total: '全天体'
    };
    return names[type] || type;
  }
  
  // 制限値を更新（設定画面用）
  updateLimits(newLimits: Partial<CelestialLimits>): void {
    this.limits = { ...this.limits, ...newLimits };
    console.log('[LIMITER] Limits updated:', this.limits);
  }
  
  // 制限値を取得
  getLimits(): CelestialLimits {
    return { ...this.limits };
  }
}

// スタイル追加
const style = document.createElement('style');
style.textContent = `
  .celestial-limit-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  .celestial-limit-modal.show {
    opacity: 1;
  }
  
  .limit-modal-content {
    background: linear-gradient(135deg, #1a1a2e, #16213e);
    border: 2px solid #ff6b6b;
    border-radius: 15px;
    padding: 30px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  }
  
  .limit-modal-content h3 {
    color: #ff6b6b;
    margin-bottom: 15px;
    font-size: 1.5em;
  }
  
  .limit-modal-content h4 {
    color: #4CAF50;
    margin-top: 20px;
    margin-bottom: 10px;
  }
  
  .limit-stats {
    margin: 20px 0;
  }
  
  .limit-table {
    width: 100%;
    border-collapse: collapse;
  }
  
  .limit-table td {
    padding: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .limit-table .near-limit td {
    color: #ff9800;
  }
  
  .limit-table .total-row td {
    font-weight: bold;
    border-top: 2px solid rgba(255, 255, 255, 0.2);
    padding-top: 12px;
  }
  
  .limit-bar {
    width: 100%;
    height: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 5px;
    overflow: hidden;
  }
  
  .limit-fill {
    height: 100%;
    background: linear-gradient(90deg, #4CAF50, #8BC34A);
    transition: width 0.3s ease;
  }
  
  .near-limit .limit-fill {
    background: linear-gradient(90deg, #ff9800, #ff5722);
  }
  
  .limit-tips {
    background: rgba(255, 255, 255, 0.05);
    padding: 15px;
    border-radius: 10px;
    margin-top: 20px;
  }
  
  .limit-tips ul {
    margin: 10px 0 0 20px;
    color: #ddd;
  }
  
  .limit-tips li {
    margin-bottom: 5px;
  }
  
  .limit-modal-close {
    background: #4CAF50;
    color: white;
    border: none;
    padding: 10px 30px;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    margin-top: 20px;
    width: 100%;
    transition: all 0.3s ease;
  }
  
  .limit-modal-close:hover {
    background: #45a049;
    transform: translateY(-2px);
  }
`;
document.head.appendChild(style);

export const celestialLimiter = CelestialLimiterSystem.getInstance();