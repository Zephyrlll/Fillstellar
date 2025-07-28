/**
 * Planet Exploration Manager
 * 惑星探索システムのメインマネージャー
 */

import * as THREE from 'three';
import { gameState, gameStateManager } from '../../../state.js';
import { scene, camera, renderer, controls } from '../../../threeSetup.js';
import { CelestialBody } from '../../../types/celestial.js';
import { PlanetSurface } from './PlanetSurface.js';
import { PlayerController } from './PlayerController.js';
import { CameraController } from './CameraController.js';
import { PlanetExplorationUI } from '../ui/PlanetExplorationUI.js';

export enum GameMode {
  SPACE_VIEW = 'space',
  PLANET_SURFACE = 'planet'
}

export interface PlanetExplorationState {
  currentMode: GameMode;
  exploringPlanet: CelestialBody | null;
  player: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    inventory: Record<string, number>;
  };
  discoveredLocations: string[];
  builtStructures: string[];
}

export class PlanetExplorationManager {
  private static instance: PlanetExplorationManager;
  
  private planetSurface: PlanetSurface | null = null;
  private playerController: PlayerController | null = null;
  private cameraController: CameraController | null = null;
  private explorationUI: PlanetExplorationUI | null = null;
  
  private savedSpaceViewState: any = null;
  private animationFrameId: number | null = null;
  
  private constructor() {
    console.log('[PLANET_EXPLORATION] Manager initialized');
  }
  
  static getInstance(): PlanetExplorationManager {
    if (!PlanetExplorationManager.instance) {
      PlanetExplorationManager.instance = new PlanetExplorationManager();
    }
    return PlanetExplorationManager.instance;
  }
  
  /**
   * 惑星探索モードに入る
   */
  async enterPlanetExploration(planet: CelestialBody): Promise<void> {
    console.log('[PLANET_EXPLORATION] Entering exploration mode for planet:', planet.userData.name);
    
    try {
      // 1. 現在の宇宙視点の状態を保存
      this.saveSpaceViewState();
      
      // 2. ゲームモードを更新
      gameStateManager.updateState(state => ({
        ...state,
        currentMode: GameMode.PLANET_SURFACE,
        planetExploration: {
          isActive: true,
          currentPlanet: planet.userData.id,
          player: {
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            inventory: {}
          },
          discoveries: {
            locations: [],
            resources: []
          },
          structures: []
        }
      }));
      
      // 3. シーンをクリア
      this.clearScene();
      
      // 4. 惑星表面を生成
      await this.generatePlanetSurface(planet);
      
      // 5. プレイヤーを配置
      this.spawnPlayer();
      
      // 6. カメラを設定
      this.setupCamera();
      
      // 7. UIを切り替え
      this.switchToExplorationUI();
      
      // 8. 探索モードのアニメーションループを開始
      this.startExplorationLoop();
      
      console.log('[PLANET_EXPLORATION] Successfully entered exploration mode');
      
    } catch (error) {
      console.error('[PLANET_EXPLORATION] Failed to enter exploration mode:', error);
      this.exitPlanetExploration();
    }
  }
  
  /**
   * 宇宙視点に戻る
   */
  exitPlanetExploration(): void {
    console.log('[PLANET_EXPLORATION] Exiting exploration mode');
    
    // 1. 探索状態を保存
    this.saveExplorationState();
    
    // 2. アニメーションループを停止
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    // 3. リソースをクリーンアップ
    this.cleanup();
    
    // 4. 宇宙視点を復元
    this.restoreSpaceView();
    
    // 5. ゲームモードを更新
    gameStateManager.updateState(state => ({
      ...state,
      currentMode: GameMode.SPACE_VIEW,
      planetExploration: {
        ...state.planetExploration,
        isActive: false
      }
    }));
    
    console.log('[PLANET_EXPLORATION] Successfully exited exploration mode');
  }
  
  /**
   * 宇宙視点の状態を保存
   */
  private saveSpaceViewState(): void {
    this.savedSpaceViewState = {
      cameraPosition: camera.position.clone(),
      cameraRotation: camera.rotation.clone(),
      controlsTarget: controls.target.clone(),
      sceneChildren: scene.children.slice() // シャローコピー
    };
  }
  
  /**
   * シーンをクリア
   */
  private clearScene(): void {
    // すべての子要素を削除（ライトは保持）
    const objectsToRemove = scene.children.filter(child => 
      !(child instanceof THREE.Light)
    );
    
    objectsToRemove.forEach(obj => {
      scene.remove(obj);
      // メモリリークを防ぐためにdispose
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose();
        if (obj.material instanceof THREE.Material) {
          obj.material.dispose();
        }
      }
    });
  }
  
  /**
   * 惑星表面を生成
   */
  private async generatePlanetSurface(planet: CelestialBody): Promise<void> {
    this.planetSurface = new PlanetSurface(planet);
    await this.planetSurface.generate();
    scene.add(this.planetSurface.getMesh());
  }
  
  /**
   * プレイヤーを配置
   */
  private spawnPlayer(): void {
    if (!this.planetSurface) return;
    
    const spawnPosition = new THREE.Vector3(
      0, 
      this.planetSurface.getRadius() + 1, // 地表から1ユニット上
      0
    );
    
    this.playerController = new PlayerController(
      spawnPosition,
      this.planetSurface.getRadius()
    );
  }
  
  /**
   * カメラを設定
   */
  private setupCamera(): void {
    if (!this.playerController) return;
    
    this.cameraController = new CameraController(
      camera,
      this.playerController
    );
    
    // OrbitControlsを無効化
    controls.enabled = false;
  }
  
  /**
   * UIを切り替え
   */
  private switchToExplorationUI(): void {
    // 宇宙視点のUIを非表示
    const spaceUI = document.getElementById('game-info');
    if (spaceUI) spaceUI.style.display = 'none';
    
    // 探索UIを作成・表示
    this.explorationUI = new PlanetExplorationUI();
    this.explorationUI.show();
  }
  
  /**
   * 探索モードのアニメーションループ
   */
  private startExplorationLoop(): void {
    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      const deltaTime = (currentTime - lastTime) / 1000; // 秒に変換
      lastTime = currentTime;
      
      // プレイヤーとカメラの更新
      if (this.playerController) {
        this.playerController.update(deltaTime);
      }
      
      if (this.cameraController) {
        this.cameraController.update(deltaTime);
      }
      
      // UIの更新
      if (this.explorationUI) {
        this.explorationUI.update();
      }
      
      // レンダリング
      renderer.render(scene, camera);
      
      // 次のフレーム
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }
  
  /**
   * 探索状態を保存
   */
  private saveExplorationState(): void {
    if (!this.playerController) return;
    
    const position = this.playerController.getPosition();
    const rotation = this.playerController.getRotation();
    
    gameStateManager.updateState(state => ({
      ...state,
      planetExploration: {
        ...state.planetExploration,
        player: {
          ...state.planetExploration?.player,
          position: position.toArray() as [number, number, number],
          rotation: rotation.toArray() as [number, number, number]
        }
      }
    }));
  }
  
  /**
   * リソースのクリーンアップ
   */
  private cleanup(): void {
    this.planetSurface?.dispose();
    this.playerController?.dispose();
    this.cameraController?.dispose();
    this.explorationUI?.hide();
    
    this.planetSurface = null;
    this.playerController = null;
    this.cameraController = null;
    this.explorationUI = null;
  }
  
  /**
   * 宇宙視点を復元
   */
  private restoreSpaceView(): void {
    if (!this.savedSpaceViewState) return;
    
    // シーンをクリア
    this.clearScene();
    
    // 保存された子要素を復元
    this.savedSpaceViewState.sceneChildren.forEach((child: THREE.Object3D) => {
      scene.add(child);
    });
    
    // カメラを復元
    camera.position.copy(this.savedSpaceViewState.cameraPosition);
    camera.rotation.copy(this.savedSpaceViewState.cameraRotation);
    
    // コントロールを復元
    controls.target.copy(this.savedSpaceViewState.controlsTarget);
    controls.enabled = true;
    controls.update();
    
    // UIを復元
    const spaceUI = document.getElementById('game-info');
    if (spaceUI) spaceUI.style.display = '';
    
    this.savedSpaceViewState = null;
  }
  
  /**
   * 現在のモードを取得
   */
  getCurrentMode(): GameMode {
    return gameState.currentMode || GameMode.SPACE_VIEW;
  }
  
  /**
   * 探索中かどうか
   */
  isExploring(): boolean {
    return this.getCurrentMode() === GameMode.PLANET_SURFACE;
  }
}