/**
 * Audio System
 * BGMと効果音の管理システム
 */

import { gameStateManager } from '../state.js';
import { phaseManager } from './phaseManager.js';

export interface AudioConfig {
  masterVolume: number;
  bgmVolume: number;
  sfxVolume: number;
  muted: boolean;
}

export interface BGMTrack {
  id: string;
  name: string;
  url: string;
  type: 'ambient' | 'action' | 'achievement' | 'menu';
  phaseRange?: [number, number]; // 再生するフェーズ範囲
}

export interface SoundEffect {
  id: string;
  name: string;
  url: string;
  volume?: number;
  loop?: boolean;
}

export class AudioSystem {
  private static instance: AudioSystem;
  private audioContext: AudioContext;
  private masterGain: GainNode;
  private bgmGain: GainNode;
  private sfxGain: GainNode;
  
  private currentBGM: AudioBufferSourceNode | null = null;
  private bgmBuffer: Map<string, AudioBuffer> = new Map();
  private sfxBuffer: Map<string, AudioBuffer> = new Map();
  
  private config: AudioConfig = {
    masterVolume: 0.7,
    bgmVolume: 0.5,
    sfxVolume: 0.8,
    muted: false
  };
  
  private bgmTracks: BGMTrack[] = [
    {
      id: 'cosmic_ambient_1',
      name: 'Cosmic Serenity',
      url: '/audio/bgm/cosmic_serenity.mp3',
      type: 'ambient',
      phaseRange: [0, 2]
    },
    {
      id: 'stellar_birth',
      name: 'Birth of Stars',
      url: '/audio/bgm/stellar_birth.mp3',
      type: 'ambient',
      phaseRange: [3, 5]
    },
    {
      id: 'galactic_symphony',
      name: 'Galactic Symphony',
      url: '/audio/bgm/galactic_symphony.mp3',
      type: 'ambient',
      phaseRange: [6, 10]
    },
    {
      id: 'achievement_fanfare',
      name: 'Achievement Unlocked',
      url: '/audio/bgm/achievement.mp3',
      type: 'achievement'
    },
    {
      id: 'prestige_theme',
      name: 'Big Bang Theme',
      url: '/audio/bgm/prestige.mp3',
      type: 'action'
    }
  ];
  
  private soundEffects: SoundEffect[] = [
    // 天体作成音
    { id: 'create_asteroid', name: 'Asteroid Creation', url: '/audio/sfx/asteroid_create.mp3' },
    { id: 'create_comet', name: 'Comet Creation', url: '/audio/sfx/comet_create.mp3' },
    { id: 'create_moon', name: 'Moon Creation', url: '/audio/sfx/moon_create.mp3' },
    { id: 'create_planet', name: 'Planet Creation', url: '/audio/sfx/planet_create.mp3' },
    { id: 'create_star', name: 'Star Creation', url: '/audio/sfx/star_create.mp3' },
    { id: 'create_blackhole', name: 'Black Hole Creation', url: '/audio/sfx/blackhole_create.mp3' },
    
    // 資源関連
    { id: 'collect_resource', name: 'Resource Collection', url: '/audio/sfx/collect.mp3', volume: 0.3 },
    { id: 'convert_resource', name: 'Resource Conversion', url: '/audio/sfx/convert.mp3', volume: 0.5 },
    
    // UI操作音
    { id: 'ui_click', name: 'UI Click', url: '/audio/sfx/click.mp3', volume: 0.2 },
    { id: 'ui_hover', name: 'UI Hover', url: '/audio/sfx/hover.mp3', volume: 0.1 },
    { id: 'ui_open', name: 'Panel Open', url: '/audio/sfx/panel_open.mp3', volume: 0.3 },
    { id: 'ui_close', name: 'Panel Close', url: '/audio/sfx/panel_close.mp3', volume: 0.3 },
    
    // 特殊効果音
    { id: 'achievement_unlock', name: 'Achievement', url: '/audio/sfx/achievement.mp3' },
    { id: 'research_complete', name: 'Research Complete', url: '/audio/sfx/research_complete.mp3' },
    { id: 'prestige_activate', name: 'Prestige', url: '/audio/sfx/prestige.mp3' },
    { id: 'life_evolve', name: 'Life Evolution', url: '/audio/sfx/evolution.mp3' }
  ];
  
  private constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // ゲインノードの設定
    this.masterGain = this.audioContext.createGain();
    this.bgmGain = this.audioContext.createGain();
    this.sfxGain = this.audioContext.createGain();
    
    this.bgmGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.audioContext.destination);
    
    this.loadConfig();
    this.updateVolumes();
    
    // フェーズ変更時のBGM切り替え
    phaseManager.onUnlock((event) => {
      this.checkBGMChange();
    });
    
    console.log('[AUDIO] System initialized');
  }
  
  static getInstance(): AudioSystem {
    if (!AudioSystem.instance) {
      AudioSystem.instance = new AudioSystem();
    }
    return AudioSystem.instance;
  }
  
  // 初期化（ユーザーインタラクション後に呼ぶ）
  async init(): Promise<void> {
    // AudioContextの再開
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    // BGMのプリロード
    await this.preloadBGM();
    
    // 基本的な効果音のプリロード
    await this.preloadEssentialSFX();
    
    // BGM開始
    this.startBGM();
  }
  
  // BGMのプリロード
  private async preloadBGM(): Promise<void> {
    const loadPromises = this.bgmTracks.map(async (track) => {
      try {
        const response = await fetch(track.url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.bgmBuffer.set(track.id, audioBuffer);
      } catch (error) {
        console.warn(`[AUDIO] Failed to load BGM: ${track.id}`, error);
      }
    });
    
    await Promise.all(loadPromises);
  }
  
  // 必須効果音のプリロード
  private async preloadEssentialSFX(): Promise<void> {
    const essentialSFX = ['ui_click', 'collect_resource', 'create_asteroid'];
    
    const loadPromises = this.soundEffects
      .filter(sfx => essentialSFX.includes(sfx.id))
      .map(async (sfx) => {
        try {
          const response = await fetch(sfx.url);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
          this.sfxBuffer.set(sfx.id, audioBuffer);
        } catch (error) {
          console.warn(`[AUDIO] Failed to load SFX: ${sfx.id}`, error);
        }
      });
    
    await Promise.all(loadPromises);
  }
  
  // BGMの開始
  private startBGM(): void {
    const currentPhase = phaseManager.getPhaseState().currentPhase;
    const track = this.selectBGMForPhase(currentPhase);
    
    if (track && this.bgmBuffer.has(track.id)) {
      this.playBGM(track.id);
    }
  }
  
  // フェーズに応じたBGM選択
  private selectBGMForPhase(phase: number): BGMTrack | null {
    const tracks = this.bgmTracks.filter(track => {
      if (!track.phaseRange) return false;
      return phase >= track.phaseRange[0] && phase <= track.phaseRange[1];
    });
    
    return tracks.length > 0 ? tracks[0] : null;
  }
  
  // BGMの再生
  playBGM(trackId: string, fadeIn: boolean = true): void {
    if (this.config.muted) return;
    
    const buffer = this.bgmBuffer.get(trackId);
    if (!buffer) {
      // バッファがない場合は動的にロード
      this.loadAndPlayBGM(trackId);
      return;
    }
    
    // 現在のBGMをフェードアウト
    if (this.currentBGM) {
      this.fadeOutBGM();
    }
    
    // 新しいBGMを再生
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    
    const bgmGain = this.audioContext.createGain();
    source.connect(bgmGain);
    bgmGain.connect(this.bgmGain);
    
    if (fadeIn) {
      bgmGain.gain.setValueAtTime(0, this.audioContext.currentTime);
      bgmGain.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 2);
    }
    
    source.start(0);
    this.currentBGM = source;
  }
  
  // BGMの動的ロードと再生
  private async loadAndPlayBGM(trackId: string): Promise<void> {
    const track = this.bgmTracks.find(t => t.id === trackId);
    if (!track) return;
    
    try {
      const response = await fetch(track.url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.bgmBuffer.set(track.id, audioBuffer);
      this.playBGM(trackId);
    } catch (error) {
      console.error(`[AUDIO] Failed to load BGM: ${trackId}`, error);
    }
  }
  
  // BGMのフェードアウト
  private fadeOutBGM(): void {
    if (!this.currentBGM) return;
    
    const source = this.currentBGM;
    const fadeGain = this.audioContext.createGain();
    
    // 再接続
    source.disconnect();
    source.connect(fadeGain);
    fadeGain.connect(this.bgmGain);
    
    fadeGain.gain.setValueAtTime(1, this.audioContext.currentTime);
    fadeGain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 1);
    
    setTimeout(() => {
      source.stop();
      source.disconnect();
    }, 1000);
    
    this.currentBGM = null;
  }
  
  // 効果音の再生
  async playSFX(effectId: string, options?: { volume?: number; pitch?: number }): Promise<void> {
    if (this.config.muted) return;
    
    let buffer = this.sfxBuffer.get(effectId);
    
    // バッファがない場合は動的にロード
    if (!buffer) {
      const sfx = this.soundEffects.find(s => s.id === effectId);
      if (!sfx) return;
      
      try {
        const response = await fetch(sfx.url);
        const arrayBuffer = await response.arrayBuffer();
        buffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.sfxBuffer.set(effectId, buffer);
      } catch (error) {
        console.warn(`[AUDIO] Failed to load SFX: ${effectId}`, error);
        return;
      }
    }
    
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    
    // ピッチ調整
    if (options?.pitch) {
      source.playbackRate.setValueAtTime(options.pitch, this.audioContext.currentTime);
    }
    
    // ボリューム調整
    const gainNode = this.audioContext.createGain();
    const sfx = this.soundEffects.find(s => s.id === effectId);
    const volume = options?.volume ?? sfx?.volume ?? 1.0;
    gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
    
    source.connect(gainNode);
    gainNode.connect(this.sfxGain);
    
    source.start(0);
  }
  
  // BGM変更チェック
  private checkBGMChange(): void {
    const currentPhase = phaseManager.getPhaseState().currentPhase;
    const newTrack = this.selectBGMForPhase(currentPhase);
    
    if (newTrack && (!this.currentBGM || !this.isPlayingTrack(newTrack.id))) {
      this.playBGM(newTrack.id);
    }
  }
  
  // 特定のトラックが再生中かチェック
  private isPlayingTrack(trackId: string): boolean {
    // 現在の実装では正確に判定できないためfalseを返す
    return false;
  }
  
  // ボリューム設定
  setMasterVolume(volume: number): void {
    this.config.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
    this.saveConfig();
  }
  
  setBGMVolume(volume: number): void {
    this.config.bgmVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
    this.saveConfig();
  }
  
  setSFXVolume(volume: number): void {
    this.config.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumes();
    this.saveConfig();
  }
  
  toggleMute(): void {
    this.config.muted = !this.config.muted;
    this.updateVolumes();
    this.saveConfig();
    
    if (this.config.muted && this.currentBGM) {
      this.currentBGM.stop();
      this.currentBGM = null;
    } else if (!this.config.muted) {
      this.startBGM();
    }
  }
  
  // ボリューム更新
  private updateVolumes(): void {
    const masterVolume = this.config.muted ? 0 : this.config.masterVolume;
    this.masterGain.gain.setValueAtTime(masterVolume, this.audioContext.currentTime);
    this.bgmGain.gain.setValueAtTime(this.config.bgmVolume, this.audioContext.currentTime);
    this.sfxGain.gain.setValueAtTime(this.config.sfxVolume, this.audioContext.currentTime);
  }
  
  // 設定の保存/読み込み
  private saveConfig(): void {
    localStorage.setItem('audioConfig', JSON.stringify(this.config));
  }
  
  private loadConfig(): void {
    const saved = localStorage.getItem('audioConfig');
    if (saved) {
      try {
        this.config = { ...this.config, ...JSON.parse(saved) };
      } catch (error) {
        console.error('[AUDIO] Failed to load config:', error);
      }
    }
  }
  
  // システムの破棄
  dispose(): void {
    if (this.currentBGM) {
      this.currentBGM.stop();
      this.currentBGM.disconnect();
    }
    
    this.bgmBuffer.clear();
    this.sfxBuffer.clear();
    
    this.masterGain.disconnect();
    this.bgmGain.disconnect();
    this.sfxGain.disconnect();
  }
}

export const audioSystem = AudioSystem.getInstance();