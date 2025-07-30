/**
 * Audio Settings UI
 * オーディオ設定のUI管理
 */

import { audioSystem } from '../systems/audioSystem.js';

export class AudioSettingsUI {
  private static instance: AudioSettingsUI;
  private container: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  
  private constructor() {
    console.log('[AUDIO-UI] Audio settings UI initialized');
  }
  
  static getInstance(): AudioSettingsUI {
    if (!AudioSettingsUI.instance) {
      AudioSettingsUI.instance = new AudioSettingsUI();
    }
    return AudioSettingsUI.instance;
  }
  
  // UIの初期化
  init(): void {
    this.createSettingsButton();
    this.createSettingsPanel();
  }
  
  // 設定ボタンの作成
  private createSettingsButton(): void {
    const button = document.createElement('button');
    button.id = 'audio-settings-button';
    button.innerHTML = '🔊';
    button.title = 'オーディオ設定';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.8);
      border: 2px solid #00ff88;
      color: #00ff88;
      font-size: 24px;
      cursor: pointer;
      z-index: 1000;
      transition: all 0.3s ease;
    `;
    
    button.addEventListener('mouseover', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 0 20px rgba(0, 255, 136, 0.5)';
    });
    
    button.addEventListener('mouseout', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = 'none';
    });
    
    button.addEventListener('click', () => {
      this.toggle();
    });
    
    document.body.appendChild(button);
  }
  
  // 設定パネルの作成
  private createSettingsPanel(): void {
    this.container = document.createElement('div');
    this.container.id = 'audio-settings-panel';
    this.container.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 300px;
      background: rgba(0, 0, 0, 0.95);
      border: 2px solid #00ff88;
      border-radius: 10px;
      padding: 20px;
      color: #fff;
      z-index: 999;
      display: none;
      font-family: 'Orbitron', monospace;
    `;
    
    this.updateContent();
    document.body.appendChild(this.container);
  }
  
  // コンテンツの更新
  private updateContent(): void {
    if (!this.container) return;
    
    const config = (audioSystem as any).config;
    
    this.container.innerHTML = `
      <h3 style="margin: 0 0 20px 0; color: #00ff88; text-align: center;">オーディオ設定</h3>
      
      <div class="audio-control" style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px;">マスターボリューム</label>
        <input type="range" id="master-volume" min="0" max="100" value="${config.masterVolume * 100}" 
               style="width: 100%; accent-color: #00ff88;">
        <span id="master-volume-value" style="display: block; text-align: center; margin-top: 5px;">
          ${Math.round(config.masterVolume * 100)}%
        </span>
      </div>
      
      <div class="audio-control" style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px;">BGM ボリューム</label>
        <input type="range" id="bgm-volume" min="0" max="100" value="${config.bgmVolume * 100}" 
               style="width: 100%; accent-color: #00ff88;">
        <span id="bgm-volume-value" style="display: block; text-align: center; margin-top: 5px;">
          ${Math.round(config.bgmVolume * 100)}%
        </span>
      </div>
      
      <div class="audio-control" style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px;">効果音 ボリューム</label>
        <input type="range" id="sfx-volume" min="0" max="100" value="${config.sfxVolume * 100}" 
               style="width: 100%; accent-color: #00ff88;">
        <span id="sfx-volume-value" style="display: block; text-align: center; margin-top: 5px;">
          ${Math.round(config.sfxVolume * 100)}%
        </span>
      </div>
      
      <div class="audio-control" style="text-align: center;">
        <button id="mute-toggle" style="
          background: ${config.muted ? '#ff4444' : '#00ff88'};
          color: #000;
          border: none;
          padding: 10px 20px;
          border-radius: 5px;
          font-weight: bold;
          cursor: pointer;
          width: 100%;
          font-size: 16px;
          transition: all 0.3s ease;
        ">
          ${config.muted ? '🔇 ミュート中' : '🔊 サウンドON'}
        </button>
      </div>
      
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #333; text-align: center; font-size: 12px; color: #666;">
        ※ 音声の初期化にはユーザー操作が必要です
      </div>
    `;
    
    // イベントリスナーの設定
    this.setupEventListeners();
  }
  
  // イベントリスナーの設定
  private setupEventListeners(): void {
    // マスターボリューム
    const masterVolume = document.getElementById('master-volume') as HTMLInputElement;
    const masterValue = document.getElementById('master-volume-value');
    if (masterVolume && masterValue) {
      masterVolume.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value) / 100;
        audioSystem.setMasterVolume(value);
        masterValue.textContent = `${Math.round(value * 100)}%`;
      });
    }
    
    // BGMボリューム
    const bgmVolume = document.getElementById('bgm-volume') as HTMLInputElement;
    const bgmValue = document.getElementById('bgm-volume-value');
    if (bgmVolume && bgmValue) {
      bgmVolume.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value) / 100;
        audioSystem.setBGMVolume(value);
        bgmValue.textContent = `${Math.round(value * 100)}%`;
      });
    }
    
    // 効果音ボリューム
    const sfxVolume = document.getElementById('sfx-volume') as HTMLInputElement;
    const sfxValue = document.getElementById('sfx-volume-value');
    if (sfxVolume && sfxValue) {
      sfxVolume.addEventListener('input', (e) => {
        const value = parseInt((e.target as HTMLInputElement).value) / 100;
        audioSystem.setSFXVolume(value);
        sfxValue.textContent = `${Math.round(value * 100)}%`;
        
        // テスト音を再生
        audioSystem.playSFX('ui_click', { volume: 0.5 });
      });
    }
    
    // ミュートトグル
    const muteToggle = document.getElementById('mute-toggle');
    if (muteToggle) {
      muteToggle.addEventListener('click', () => {
        audioSystem.toggleMute();
        this.updateContent();
      });
    }
  }
  
  // パネルの表示/非表示切り替え
  toggle(): void {
    if (!this.container) return;
    
    this.isOpen = !this.isOpen;
    this.container.style.display = this.isOpen ? 'block' : 'none';
    
    if (this.isOpen) {
      // パネルが開いたときにフェードイン
      this.container.style.opacity = '0';
      this.container.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        if (this.container) {
          this.container.style.transition = 'all 0.3s ease';
          this.container.style.opacity = '1';
          this.container.style.transform = 'translateY(0)';
        }
      }, 10);
    }
  }
  
  // パネルを閉じる
  close(): void {
    if (this.container && this.isOpen) {
      this.isOpen = false;
      this.container.style.display = 'none';
    }
  }
}

export const audioSettingsUI = AudioSettingsUI.getInstance();