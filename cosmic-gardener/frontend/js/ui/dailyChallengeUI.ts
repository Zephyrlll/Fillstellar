/**
 * Daily Challenge UI
 * デイリーチャレンジUI
 */

import { dailyChallengeSystem, DailyChallenge } from '../systems/dailyChallengeSystem.js';

export class DailyChallengeUI {
  private static instance: DailyChallengeUI;
  private container: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private updateInterval: number | null = null;
  
  private constructor() {
    console.log('[DAILY-CHALLENGE-UI] Initialized');
  }
  
  static getInstance(): DailyChallengeUI {
    if (!DailyChallengeUI.instance) {
      DailyChallengeUI.instance = new DailyChallengeUI();
    }
    return DailyChallengeUI.instance;
  }
  
  // UIの初期化
  init(): void {
    this.createButton();
    this.createPanel();
  }
  
  // ボタンの作成
  private createButton(): void {
    const button = document.createElement('button');
    button.id = 'daily-challenge-button';
    button.innerHTML = '🎅 デイリー';
    button.title = 'デイリーチャレンジ';
    button.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      border-radius: 20px;
      color: white;
      font-weight: bold;
      cursor: pointer;
      z-index: 1000;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    `;
    
    button.addEventListener('mouseover', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });
    
    button.addEventListener('click', () => this.toggle());
    
    document.body.appendChild(button);
  }
  
  // パネルの作成
  private createPanel(): void {
    this.container = document.createElement('div');
    this.container.id = 'daily-challenge-panel';
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 600px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #667eea;
      border-radius: 15px;
      padding: 0;
      color: white;
      z-index: 10000;
      display: none;
      font-family: 'Orbitron', monospace;
      overflow: hidden;
    `;
    
    document.body.appendChild(this.container);
  }
  
  // コンテンツの更新
  private updateContent(): void {
    if (!this.container) return;
    
    const challenges = dailyChallengeSystem.getActiveChallenges();
    const timeRemaining = dailyChallengeSystem.getTimeRemaining();
    
    this.container.innerHTML = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; position: relative;">
        <h2 style="margin: 0; text-align: center;">🎆 デイリーチャレンジ</h2>
        <div style="text-align: center; margin-top: 10px; font-size: 14px; opacity: 0.9;">
          残り時間: ${this.formatTime(timeRemaining)}
        </div>
        <button id="close-daily-challenge" style="
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.3s;
        "×</button>
      </div>
      
      <div style="padding: 20px; max-height: calc(80vh - 100px); overflow-y: auto;">
        ${challenges.length === 0 ? this.renderNoChallenges() : this.renderChallenges(challenges)}
        
        <div style="margin-top: 30px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 10px; text-align: center;">
          <p style="margin: 0; color: #aaa; font-size: 14px;">
            🚀 Coming Soon: バックエンド連携後に実際の報酬が受け取れるようになります
          </p>
        </div>
      </div>
    `;
    
    // イベントリスナー設定
    const closeButton = document.getElementById('close-daily-challenge');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.close());
    }
    
    // 報酬受け取りボタン
    challenges.forEach(challenge => {
      if (challenge.completed && !challenge.claimed) {
        const claimButton = document.getElementById(`claim-${challenge.id}`);
        if (claimButton) {
          claimButton.addEventListener('click', () => {
            if (dailyChallengeSystem.claimRewards(challenge.id)) {
              this.updateContent();
            }
          });
        }
      }
    });
  }
  
  // チャレンジがない場合の表示
  private renderNoChallenges(): string {
    return `
      <div style="text-align: center; padding: 40px; color: #aaa;">
        <p style="font-size: 18px;">本日のチャレンジはまだ生成されていません</p>
        <p>毎日0:00に新しいチャレンジが生成されます</p>
      </div>
    `;
  }
  
  // チャレンジの表示
  private renderChallenges(challenges: DailyChallenge[]): string {
    return challenges.map(challenge => `
      <div style="
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid ${challenge.completed ? '#4ade80' : '#667eea'};
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 15px;
        position: relative;
        ${challenge.completed ? 'box-shadow: 0 0 20px rgba(74, 222, 128, 0.3);' : ''}
      ">
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 30px; margin-right: 15px;">${challenge.icon}</span>
          <div style="flex: 1;">
            <h3 style="margin: 0; color: ${challenge.completed ? '#4ade80' : '#fff'};">
              ${challenge.name} ${challenge.completed ? '✓' : ''}
            </h3>
            <p style="margin: 5px 0 0 0; color: #aaa; font-size: 14px;">${challenge.description}</p>
          </div>
        </div>
        
        <div style="margin: 15px 0;">
          ${this.renderObjectives(challenge.objectives)}
        </div>
        
        <div style="
          background: rgba(0, 0, 0, 0.3);
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
          margin: 15px 0;
        ">
          <div style="
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            height: 100%;
            width: ${challenge.progress * 100}%;
            transition: width 0.3s ease;
          "></div>
        </div>
        
        <div style="margin-top: 15px;">
          <h4 style="margin: 0 0 10px 0; color: #667eea;">報酬:</h4>
          ${this.renderRewards(challenge.rewards)}
        </div>
        
        ${challenge.completed && !challenge.claimed ? `
          <button id="claim-${challenge.id}" style="
            margin-top: 15px;
            width: 100%;
            padding: 10px;
            background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%);
            border: none;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
          ">
            報酬を受け取る
          </button>
        ` : ''}
        
        ${challenge.claimed ? `
          <div style="
            margin-top: 15px;
            text-align: center;
            color: #4ade80;
            font-weight: bold;
          ">
            ✓ 報酬受け取り済み
          </div>
        ` : ''}
      </div>
    `).join('');
  }
  
  // 目標の表示
  private renderObjectives(objectives: any[]): string {
    return objectives.map(obj => `
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 5px 0;">
        <span style="color: #aaa; font-size: 14px;">${this.getObjectiveDescription(obj)}</span>
        <span style="color: ${obj.current >= obj.amount ? '#4ade80' : '#fff'};">
          ${this.formatNumber(obj.current)} / ${this.formatNumber(obj.amount)}
        </span>
      </div>
    `).join('');
  }
  
  // 報酬の表示
  private renderRewards(rewards: any[]): string {
    return `<div style="display: flex; flex-wrap: wrap; gap: 10px;">
      ${rewards.map(reward => `
        <div style="
          background: rgba(102, 126, 234, 0.2);
          border: 1px solid #667eea;
          border-radius: 5px;
          padding: 5px 10px;
          font-size: 14px;
        ">
          ${this.getRewardDescription(reward)}
        </div>
      `).join('')}
    </div>`;
  }
  
  // 目標の説明取得
  private getObjectiveDescription(obj: any): string {
    switch (obj.type) {
      case 'collect_resource': return `${this.getResourceName(obj.target)}を収集`;
      case 'create_celestial': return `${this.getCelestialName(obj.target)}を作成`;
      case 'complete_research': return '研究を完了';
      case 'reach_production': return `${this.getResourceName(obj.target)}の生産量到達`;
      case 'special': return '特別条件';
      default: return '未知の目標';
    }
  }
  
  // 報酬の説明取得
  private getRewardDescription(reward: any): string {
    switch (reward.type) {
      case 'resource': 
        return `${this.getResourceName(reward.target)} +${this.formatNumber(reward.amount)}`;
      case 'prestige_points': 
        return `プレステージP +${reward.amount}`;
      case 'paragon_exp': 
        return `パラゴンEXP +${reward.amount}`;
      case 'multiplier': 
        return `${reward.target === 'all' ? '全' : this.getResourceName(reward.target)}生産 ×${reward.amount} (${Math.floor(reward.duration / 60000)}分)`;
      case 'unlock': 
        return '特別アンロック';
      default: 
        return '未知の報酬';
    }
  }
  
  // ヘルパー関数
  private formatTime(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}時間${minutes}分`;
  }
  
  private formatNumber(num: number): string {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  }
  
  private getResourceName(resource: string): string {
    const names: { [key: string]: string } = {
      cosmicDust: '宇宙の塵',
      energy: 'エネルギー',
      organicMatter: '有機物',
      biomass: 'バイオマス',
      darkMatter: 'ダークマター',
      thoughtPoints: '思考ポイント',
      all: '全資源'
    };
    return names[resource] || resource;
  }
  
  private getCelestialName(type: string): string {
    const names: { [key: string]: string } = {
      star: '恒星',
      planet: '惑星',
      moon: '月',
      asteroid: '小惑星',
      comet: '彗星',
      black_hole: 'ブラックホール'
    };
    return names[type] || type;
  }
  
  // 表示/非表示切り替え
  toggle(): void {
    if (!this.container) return;
    
    this.isOpen = !this.isOpen;
    this.container.style.display = this.isOpen ? 'block' : 'none';
    
    if (this.isOpen) {
      this.updateContent();
      // 1秒ごとに更新
      this.updateInterval = window.setInterval(() => this.updateContent(), 1000);
    } else {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    }
  }
  
  // 閉じる
  close(): void {
    this.isOpen = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

export const dailyChallengeUI = DailyChallengeUI.getInstance();