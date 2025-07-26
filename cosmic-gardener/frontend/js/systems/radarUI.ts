// レーダー（Galaxy Map）UI管理システム

import { soundManager } from '../sound.js';
import { gameState } from '../state.js';
import type { CelestialBody } from '../state.js';
import { camera } from '../threeSetup.js';
import * as THREE from 'three';

export class RadarUI {
  private container: HTMLElement;
  private toggleButton: HTMLElement;
  private mapContainer: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private isOpen: boolean = false;
  private updateTimer: number = 0;
  private previousState: {
    starCount: number;
    blackHolePosition: string | null;
  } = {
    starCount: -1,
    blackHolePosition: null
  };
  
  constructor() {
    // RadarUIを有効化
    
    try {
      // 既存の要素をすべて削除
      const existingContainer = document.getElementById('radar-ui-container');
      if (existingContainer) {
        existingContainer.remove();
      }
      const existingToggle = document.getElementById('galaxy-map-toggle');
      if (existingToggle) {
        existingToggle.remove();
      }
      const existingMap = document.getElementById('galaxy-map-container');
      if (existingMap) {
        existingMap.remove();
      }
      
      // レーダーコンテナを作成
      const radarContainer = document.createElement('div');
      radarContainer.id = 'radar-ui-container';
      radarContainer.style.cssText = `
        position: fixed !important;
        right: 20px !important;
        bottom: 20px !important;
        z-index: 10001 !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-end !important;
        gap: 10px !important;
      `;
      
      // レーダーボタンを作成
      const toggleButton = document.createElement('button');
      toggleButton.id = 'galaxy-map-toggle';
      toggleButton.className = 'radar-toggle-modern';
      toggleButton.title = 'レーダーを開閉';
      toggleButton.innerHTML = '◎';
      toggleButton.style.cssText = `
        width: 60px !important;
        height: 60px !important;
        background: rgba(0, 0, 0, 0.8) !important;
        border: 1px solid rgba(255, 215, 0, 0.3) !important;
        border-radius: 0 !important;
        color: #FFD700 !important;
        font-size: 24px !important;
        font-weight: normal !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.2s ease !important;
        backdrop-filter: blur(10px) !important;
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.2) !important;
      `;
      
      // レーダーパネルを作成
      const mapContainer = document.createElement('div');
      mapContainer.id = 'galaxy-map-container';
      mapContainer.className = 'radar-panel-modern';
      mapContainer.style.cssText = `
        width: 250px !important;
        height: 250px !important;
        background: rgba(0, 0, 0, 0.8) !important;
        border: 1px solid rgba(255, 215, 0, 0.3) !important;
        border-radius: 8px !important;
        box-shadow: 0 0 20px rgba(255, 215, 0, 0.2) !important;
        backdrop-filter: blur(10px) !important;
        overflow: hidden !important;
        opacity: 0 !important;
        transform: scale(0.8) translateY(20px) !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        pointer-events: none !important;
      `;
      
      // 要素を追加
      radarContainer.appendChild(toggleButton);
      radarContainer.appendChild(mapContainer);
      document.body.appendChild(radarContainer);
      
      console.log('[RADAR] Radar UI created and appended');
    } catch (error) {
      console.error('[RADAR] Error in constructor:', error);
    }
    
    this.container = document.getElementById('galaxy-map-container')!;
    this.toggleButton = document.getElementById('galaxy-map-toggle')!;
    this.mapContainer = this.container;
    
    if (this.container && this.toggleButton) {
      // キャンバスを作成
      this.canvas = document.createElement('canvas');
      this.canvas.width = 230;
      this.canvas.height = 230;
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d')!;
      
      // イベントリスナーを設定
      this.initializeEventListeners();
      
      console.log('[RADAR] RadarUI constructor completed');
    } else {
      console.error('[RADAR] Failed to get required elements');
    }
  }

  /**
   * イベントリスナーの初期化
   */
  private initializeEventListeners(): void {
    // トグルボタンのクリックイベント
    this.toggleButton.addEventListener('click', () => {
      this.toggleRadar();
    });

    // パネル外クリックで閉じる
    document.addEventListener('click', (e) => {
      if (this.isOpen && 
          !this.container.contains(e.target as Node) &&
          e.target !== this.toggleButton) {
        this.closeRadar();
      }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeRadar();
      }
    });
  }

  /**
   * レーダーの開閉切り替え
   */
  private toggleRadar(): void {
    if (this.isOpen) {
      this.closeRadar();
    } else {
      this.openRadar();
    }
  }

  /**
   * レーダーを開く
   */
  private openRadar(): void {
    this.isOpen = true;
    this.container.style.cssText = `
      width: 250px !important;
      height: 250px !important;
      background: rgba(0, 0, 0, 0.8) !important;
      border: 1px solid rgba(100, 255, 218, 0.3) !important;
      border-radius: 8px !important;
      box-shadow: 0 0 20px rgba(100, 255, 218, 0.2) !important;
      backdrop-filter: blur(10px) !important;
      overflow: hidden !important;
      opacity: 1 !important;
      transform: scale(1) translateY(0) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      pointer-events: auto !important;
    `;
    soundManager.playSound('ui_open');
    this.updateRadar();
  }

  /**
   * レーダーを閉じる
   */
  private closeRadar(): void {
    this.isOpen = false;
    this.container.style.cssText = `
      width: 250px !important;
      height: 250px !important;
      background: rgba(0, 0, 0, 0.8) !important;
      border: 1px solid rgba(100, 255, 218, 0.3) !important;
      border-radius: 8px !important;
      box-shadow: 0 0 20px rgba(100, 255, 218, 0.2) !important;
      backdrop-filter: blur(10px) !important;
      overflow: hidden !important;
      opacity: 0 !important;
      transform: scale(0.8) translateY(20px) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
      pointer-events: none !important;
    `;
    soundManager.playSound('ui_close');
  }

  /**
   * 表示/非表示の切り替え
   */
  public setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'block' : 'none';
    if (!visible && this.isOpen) {
      this.closeRadar();
    }
  }

  /**
   * 更新処理（フレーム毎に呼ばれる）
   */
  public update(deltaTime: number): void {
    if (!this.isOpen) return;
    
    // 200ms毎に更新
    this.updateTimer += deltaTime;
    if (this.updateTimer >= 0.2) {
      this.updateTimer = 0;
      
      // 状態が変化した場合のみ更新
      const blackHole = gameState.stars.find(s => s.userData.type === 'black_hole');
      const currentBlackHolePos = blackHole ? 
        `${blackHole.position.x},${blackHole.position.z}` : null;
      
      if (this.previousState.starCount !== gameState.stars.length ||
          this.previousState.blackHolePosition !== currentBlackHolePos) {
        this.updateRadar();
        this.previousState.starCount = gameState.stars.length;
        this.previousState.blackHolePosition = currentBlackHolePos;
      }
    }
  }

  /**
   * レーダーの描画更新
   */
  private updateRadar(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 10;
    
    // クリア
    ctx.clearRect(0, 0, width, height);
    
    // 背景円
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // グリッド線
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.1)';
    ctx.lineWidth = 0.5;
    
    // 十字線
    ctx.beginPath();
    ctx.moveTo(centerX - radius, centerY);
    ctx.lineTo(centerX + radius, centerY);
    ctx.moveTo(centerX, centerY - radius);
    ctx.lineTo(centerX, centerY + radius);
    ctx.stroke();
    
    // 同心円
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * i / 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // カメラの向き表示
    const cameraDir = new THREE.Vector3();
    camera.getWorldDirection(cameraDir);
    const cameraAngle = Math.atan2(cameraDir.x, cameraDir.z);
    
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-cameraAngle);
    
    // 視野角インジケーター
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-20, -radius * 0.8);
    ctx.lineTo(20, -radius * 0.8);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    ctx.restore();
    
    // 天体を描画
    const mapScale = 40000; // スケール係数
    const celestialBodies = gameState.stars;
    
    celestialBodies.forEach(body => {
      const relX = body.position.x / mapScale;
      const relZ = body.position.z / mapScale;
      
      // レーダー範囲内かチェック
      const distance = Math.sqrt(relX * relX + relZ * relZ);
      if (distance > 1) return;
      
      const x = centerX + relX * radius;
      const y = centerY + relZ * radius;
      
      // 天体タイプに応じた描画
      ctx.beginPath();
      
      if (body.userData.type === 'black_hole') {
        // ブラックホール - 特別な表示
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ff00ff';
        ctx.fill();
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // パルスエフェクト
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (body.userData.type === 'star') {
        // 恒星
        const starSize = Math.min(6, 3 + Math.log10(body.userData.mass / 1e30));
        ctx.arc(x, y, starSize, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        
        // グロー効果
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, starSize * 2);
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, starSize * 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (body.userData.type === 'planet') {
        // 惑星
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff00';
        ctx.fill();
      } else {
        // その他の天体
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.fill();
      }
    });
    
    // 中心点（プレイヤー位置）
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    // 天体数表示
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`天体数: ${celestialBodies.length}`, 10, 20);
  }

  /**
   * クリーンアップ
   */
  public dispose(): void {
    // イベントリスナーの削除などが必要な場合
  }
}

// シングルトンインスタンス
let radarUIInstance: RadarUI | null = null;

export function initializeRadarUI(): RadarUI {
  if (!radarUIInstance) {
    radarUIInstance = new RadarUI();
  }
  return radarUIInstance;
}

// 遅延初期化のためのゲッター
export const radarUI = {
  get instance(): RadarUI {
    if (!radarUIInstance) {
      console.log('[RADAR] Lazy initialization of RadarUI');
      radarUIInstance = new RadarUI();
    }
    return radarUIInstance;
  },
  
  update(deltaTime: number): void {
    if (radarUIInstance) {
      radarUIInstance.update(deltaTime);
    }
  },
  
  setVisible(visible: boolean): void {
    if (radarUIInstance) {
      radarUIInstance.setVisible(visible);
    }
  }
};