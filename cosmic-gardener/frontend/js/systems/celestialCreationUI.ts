// 天体創造UI管理システム

import { CelestialBodyFactory } from '../celestialBodyFactory.js';
import { gameState, gameStateManager } from '../state.js';
import { showMessage } from '../ui.js';
import { soundManager } from '../sound.js';
import { addTimelineLog } from '../timeline.js';
import * as THREE from 'three';

export class CelestialCreationUI {
  private scrollContainer: HTMLElement;
  private toggleButton: HTMLElement;
  private menu: HTMLElement;
  private isOpen: boolean = false;
  private creationButtons: Map<string, HTMLButtonElement> = new Map();
  
  // 天体作成コスト
  private costs = {
    asteroid: 100,
    comet: 500,
    moon: 1000,
    dwarfPlanet: 2500,
    planet: 10000,
    star: 100000
  };

  constructor() {
    this.scrollContainer = document.getElementById('celestial-creation-scroll')!;
    this.toggleButton = document.getElementById('celestial-creation-toggle')!;
    this.menu = document.getElementById('celestial-creation-menu')!;
    
    this.initializeEventListeners();
    this.initializeCreationButtons();
    this.updateCostDisplays();
    this.updateButtonStates();
  }

  /**
   * イベントリスナーの初期化
   */
  private initializeEventListeners(): void {
    // トグルボタンのクリックイベント
    this.toggleButton.addEventListener('click', () => {
      this.toggleMenu();
    });

    // メニュー外クリックで閉じる
    document.addEventListener('click', (e) => {
      if (this.isOpen && 
          !this.scrollContainer.contains(e.target as Node) &&
          e.target !== this.toggleButton) {
        this.closeMenu();
      }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeMenu();
      }
    });
  }

  /**
   * 創造ボタンの初期化
   */
  private initializeCreationButtons(): void {
    const buttons = this.menu.querySelectorAll('.create-btn-modern');
    buttons.forEach((btn) => {
      const button = btn as HTMLButtonElement;
      const type = button.getAttribute('data-type');
      if (type) {
        this.creationButtons.set(type, button);
        button.addEventListener('click', () => this.handleCreation(type));
      }
    });
  }

  /**
   * メニューの開閉切り替え
   */
  private toggleMenu(): void {
    if (this.isOpen) {
      this.closeMenu();
    } else {
      this.openMenu();
    }
  }

  /**
   * メニューを開く
   */
  private openMenu(): void {
    this.isOpen = true;
    this.scrollContainer.classList.add('active');
    soundManager.playSound('ui_open');
    this.updateButtonStates();
  }

  /**
   * メニューを閉じる
   */
  private closeMenu(): void {
    this.isOpen = false;
    this.scrollContainer.classList.remove('active');
    soundManager.playSound('ui_close');
  }

  /**
   * 天体作成処理
   */
  private handleCreation(type: string): void {
    const cost = this.costs[type as keyof typeof this.costs];
    if (!cost) return;

    // リソースチェック
    if (gameState.resources.cosmicDust < cost) {
      showMessage(`宇宙の塵が不足しています。必要: ${cost}`, 'error');
      soundManager.playSound('error');
      return;
    }

    // 天体タイプ別の処理
    try {
      let created = false;
      
      switch (type) {
        case 'asteroid':
        case 'comet':
          created = this.createCelestialBody(type as any, cost);
          break;
        case 'moon':
        case 'dwarfPlanet':
          created = this.createCelestialBodyWithParent(type as any, cost);
          break;
        case 'planet':
          created = this.createPlanet(cost);
          break;
        case 'star':
          created = this.createStar(cost);
          break;
      }

      if (created) {
        // リソース消費
        gameStateManager.updateResource('cosmicDust', -cost);
        this.updateButtonStates();
        soundManager.playSound('celestial_create');
      }
    } catch (error) {
      console.error('[CELESTIAL_UI] Creation error:', error);
      showMessage('天体の作成に失敗しました', 'error');
    }
  }

  /**
   * 基本的な天体作成
   */
  private createCelestialBody(type: 'asteroid' | 'comet', cost: number): boolean {
    const position = this.getRandomPosition(200, 1000);
    const velocity = this.getRandomVelocity();
    
    const result = CelestialBodyFactory.create(type, {
      position,
      velocity
    });

    if (result.isOk) {
      gameState.scene.add(result.value);
      gameState.stars.push(result.value);
      
      addTimelineLog({
        message: `${type === 'asteroid' ? '小惑星' : '彗星'}が作成されました`,
        type: 'creation'
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * 親天体を必要とする天体の作成
   */
  private createCelestialBodyWithParent(type: 'moon' | 'dwarfPlanet', cost: number): boolean {
    // 親となる天体を探す
    const parent = gameState.stars.find(s => 
      s.userData.type === 'planet' || 
      (type === 'dwarfPlanet' && s.userData.type === 'star')
    );

    if (!parent) {
      showMessage(`${type === 'moon' ? '衛星' : '準惑星'}を作成するには惑星が必要です`, 'error');
      return false;
    }

    const orbitRadius = parent.userData.radius * (2 + Math.random() * 3);
    const angle = Math.random() * Math.PI * 2;
    const position = new THREE.Vector3(
      parent.position.x + Math.cos(angle) * orbitRadius,
      parent.position.y + (Math.random() - 0.5) * 10,
      parent.position.z + Math.sin(angle) * orbitRadius
    );

    const result = CelestialBodyFactory.create(type, {
      position,
      parent
    });

    if (result.isOk) {
      gameState.scene.add(result.value);
      gameState.stars.push(result.value);
      
      addTimelineLog({
        message: `${type === 'moon' ? '衛星' : '準惑星'}が${parent.userData.name}の周りに作成されました`,
        type: 'creation'
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * 惑星作成
   */
  private createPlanet(cost: number): boolean {
    const star = gameState.stars.find(s => s.userData.type === 'star');
    if (!star) {
      showMessage('惑星を作成するには恒星が必要です', 'error');
      return false;
    }

    const orbitRadius = 200 + Math.random() * 800;
    const angle = Math.random() * Math.PI * 2;
    const position = new THREE.Vector3(
      star.position.x + Math.cos(angle) * orbitRadius,
      star.position.y,
      star.position.z + Math.sin(angle) * orbitRadius
    );

    const result = CelestialBodyFactory.create('planet', {
      position,
      parent: star
    });

    if (result.isOk) {
      gameState.scene.add(result.value);
      gameState.stars.push(result.value);
      
      addTimelineLog({
        message: `新しい惑星が${star.userData.name}の周りに誕生しました`,
        type: 'creation'
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * 恒星作成
   */
  private createStar(cost: number): boolean {
    const position = this.getRandomPosition(1000, 2000);
    
    const result = CelestialBodyFactory.create('star', {
      position,
      velocity: new THREE.Vector3(0, 0, 0)
    });

    if (result.isOk) {
      gameState.scene.add(result.value);
      gameState.stars.push(result.value);
      
      addTimelineLog({
        message: `新しい恒星が宇宙に誕生しました！`,
        type: 'creation',
        important: true
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * ランダム位置の生成
   */
  private getRandomPosition(minRadius: number, maxRadius: number): THREE.Vector3 {
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.sin(phi) * Math.sin(theta),
      radius * Math.cos(phi)
    );
  }

  /**
   * ランダム速度の生成
   */
  private getRandomVelocity(): THREE.Vector3 {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    );
  }

  /**
   * コスト表示の更新
   */
  public updateCostDisplays(): void {
    Object.entries(this.costs).forEach(([type, cost]) => {
      const element = document.getElementById(`scroll-${type}Cost`);
      if (element) {
        element.textContent = cost.toString();
      }
    });
  }

  /**
   * ボタン状態の更新
   */
  public updateButtonStates(): void {
    const dust = gameState.resources.cosmicDust;
    const unlockedBodies = gameState.unlockedCelestialBodies || {};

    // 各ボタンの有効/無効状態を更新
    this.creationButtons.forEach((button, type) => {
      const cost = this.costs[type as keyof typeof this.costs];
      const canAfford = dust >= cost;
      
      // 研究状態の確認
      let isUnlocked = true;
      const container = button.closest('.creation-item-modern');
      
      switch (type) {
        case 'moon':
          isUnlocked = unlockedBodies.moon || false;
          break;
        case 'dwarfPlanet':
          isUnlocked = unlockedBodies.dwarfPlanet || false;
          break;
        case 'planet':
          isUnlocked = unlockedBodies.planet || false;
          break;
        case 'star':
          isUnlocked = unlockedBodies.star || false;
          break;
      }
      
      // 表示/非表示 - 常に表示
      if (container) {
        container.style.display = 'flex';
        
        // ロック状態のビジュアル表現
        if (!isUnlocked) {
          container.classList.add('locked');
        } else {
          container.classList.remove('locked');
        }
      }
      
      // ボタンの有効/無効
      button.disabled = !canAfford || !isUnlocked;
      
      // ボタンテキストの変更
      if (!isUnlocked) {
        button.textContent = 'ロック';
      } else if (!canAfford) {
        button.textContent = '不足';
      } else {
        button.textContent = '生成';
      }
    });
  }

  /**
   * 更新処理（フレーム毎に呼ばれる）
   */
  public update(): void {
    // 必要に応じてUI要素を更新
    if (this.isOpen) {
      this.updateButtonStates();
    }
  }

  /**
   * リサイズ処理
   */
  public handleResize(): void {
    // モバイル対応などのリサイズ処理
  }

  /**
   * クリーンアップ
   */
  public dispose(): void {
    this.creationButtons.clear();
  }
}

// シングルトンインスタンス
export const celestialCreationUI = new CelestialCreationUI();