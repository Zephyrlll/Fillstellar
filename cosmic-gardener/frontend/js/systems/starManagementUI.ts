// 恒星管理UI管理システム

import { soundManager } from '../sound.js';
import { gameState, gameStateManager } from '../state.js';
import type { CelestialBody, StarUserData } from '../state.js';
import { camera, controls } from '../threeSetup.js';
import * as THREE from 'three';

export class StarManagementUI {
  private container: HTMLElement;
  private toggleButton: HTMLElement;
  private panel: HTMLElement;
  private contentArea: HTMLElement;
  private isOpen: boolean = false;
  private sortColumn: string = 'name';
  private sortDirection: 'asc' | 'desc' = 'asc';
  
  constructor() {
    this.container = document.getElementById('star-management-container')!;
    this.toggleButton = document.getElementById('star-management-toggle')!;
    this.panel = document.getElementById('star-management-panel')!;
    this.contentArea = document.querySelector('.management-content-modern')!;
    
    this.initializeEventListeners();
  }

  /**
   * イベントリスナーの初期化
   */
  private initializeEventListeners(): void {
    // トグルボタンのクリックイベント
    this.toggleButton.addEventListener('click', () => {
      this.togglePanel();
    });

    // パネル外クリックで閉じる
    document.addEventListener('click', (e) => {
      if (this.isOpen && 
          !this.container.contains(e.target as Node) &&
          e.target !== this.toggleButton) {
        this.closePanel();
      }
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closePanel();
      }
    });

    // イベント委譲でテーブル行のクリックを処理
    this.contentArea.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // ヘッダーのクリック処理
      const header = target.closest('th[data-sort]');
      if (header) {
        const sortKey = header.getAttribute('data-sort')!;
        if (this.sortColumn === sortKey) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = sortKey;
          this.sortDirection = 'asc';
        }
        this.updateStarList();
        return;
      }
      
      // 行のクリック処理
      const row = target.closest('tr[data-id]');
      if (row) {
        const id = row.getAttribute('data-id');
        console.log('[STAR_MANAGEMENT] Row clicked, ID:', id);
        const body = gameState.stars.find(s => s.uuid === id);
        console.log('[STAR_MANAGEMENT] Found body:', body);
        
        if (body) {
          // デュアルビューシステムで宇宙タブに切り替える
          const dualViewSystem = (window as any).dualViewSystem;
          if (dualViewSystem) {
            console.log('[STAR_MANAGEMENT] Checking dual view system');
            const activeTab = dualViewSystem.tabManager?.getActiveTab();
            console.log('[STAR_MANAGEMENT] Active tab:', activeTab);
            
            if (activeTab !== 'space') {
              console.log('[STAR_MANAGEMENT] Switching to space tab');
              dualViewSystem.tabManager?.activateTab('space');
              // タブ切り替えのアニメーションを待つ
              setTimeout(() => {
                this.performFocus(body);
              }, 100);
              return;
            }
          }
          
          this.performFocus(body);
        }
      }
    });
  }

  /**
   * フォーカスを実行
   */
  private performFocus(body: CelestialBody): void {
    console.log('[STAR_MANAGEMENT] performFocus called for body:', body.userData.name);
    console.log('[STAR_MANAGEMENT] Body object:', body);
    console.log('[STAR_MANAGEMENT] Body userData:', body.userData);
    
    // フォーカスオブジェクトを設定する前の状態を確認
    console.log('[STAR_MANAGEMENT] Before update - focusedObject:', gameState.focusedObject);
    
    // フォーカスオブジェクトを設定
    gameStateManager.updateState(state => {
      console.log('[STAR_MANAGEMENT] Inside updateState - current focusedObject:', state.focusedObject);
      const newState = {
        ...state,
        focusedObject: body
      };
      console.log('[STAR_MANAGEMENT] Inside updateState - new focusedObject:', newState.focusedObject);
      return newState;
    });
    
    // 更新後の状態を確認
    setTimeout(() => {
      console.log('[STAR_MANAGEMENT] After update (delayed) - focusedObject:', gameState.focusedObject);
      console.log('[STAR_MANAGEMENT] After update (delayed) - focusedObject name:', gameState.focusedObject?.userData?.name);
    }, 100);
    
    // 直接カメラを移動
    this.focusCamera(body);
    
    console.log('[STAR_MANAGEMENT] Focus set:', {
      bodyName: body.userData.name,
      bodyPosition: body.position,
      focusedObject: gameState.focusedObject
    });
    
    soundManager.playUISound('click');
    // パネルを閉じる
    this.closePanel();
  }

  /**
   * パネルの開閉切り替え
   */
  private togglePanel(): void {
    if (this.isOpen) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  /**
   * パネルを開く
   */
  private openPanel(): void {
    this.isOpen = true;
    this.container.classList.add('active');
    soundManager.playUISound('tab');
    this.updateStarList();
  }

  /**
   * パネルを閉じる
   */
  private closePanel(): void {
    this.isOpen = false;
    this.container.classList.remove('active');
    soundManager.playUISound('tab');
  }

  /**
   * 表示/非表示の切り替え
   */
  public setVisible(visible: boolean): void {
    this.container.style.display = visible ? 'flex' : 'none';
    if (!visible && this.isOpen) {
      this.closePanel();
    }
  }

  /**
   * 更新処理（フレーム毎に呼ばれる）
   */
  public update(): void {
    // 必要に応じてUI要素を更新
    if (this.isOpen && Date.now() % 2000 < 16) {
      this.updateStarList();
    }
  }

  /**
   * 恒星リストの更新
   */
  private updateStarList(): void {
    if (!this.contentArea) return;

    const celestialBodies = gameState.stars.filter(s => 
      s.userData.type === 'star' || s.userData.type === 'black_hole'
    );

    if (celestialBodies.length === 0) {
      this.contentArea.innerHTML = '<p style="color: rgba(255, 255, 255, 0.6); text-align: center;">現在、管理対象の天体はありません。</p>';
      return;
    }

    // ソート処理
    celestialBodies.sort((a, b) => {
      const valA = (a.userData as any)[this.sortColumn];
      const valB = (b.userData as any)[this.sortColumn];
      let comparison = 0;
      
      if (valA > valB) {
        comparison = 1;
      } else if (valA < valB) {
        comparison = -1;
      }
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    // テーブル作成
    let html = `
      <table class="star-table-modern">
        <thead>
          <tr>
            <th data-sort="name" class="${this.sortColumn === 'name' ? `sort-${this.sortDirection}` : ''}">名前</th>
            <th data-sort="type" class="${this.sortColumn === 'type' ? `sort-${this.sortDirection}` : ''}">種類</th>
            <th data-sort="mass" class="${this.sortColumn === 'mass' ? `sort-${this.sortDirection}` : ''}">質量</th>
            <th data-sort="temperature" class="${this.sortColumn === 'temperature' ? `sort-${this.sortDirection}` : ''}">温度</th>
            <th data-sort="age" class="${this.sortColumn === 'age' ? `sort-${this.sortDirection}` : ''}">年齢</th>
          </tr>
        </thead>
        <tbody>
    `;

    celestialBodies.forEach(body => {
      const userData = body.userData;
      const typeText = userData.type === 'black_hole' ? 'ブラックホール' : 
        ((userData as StarUserData).spectralType || '恒星');
      
      // デバッグ: 恒星データの確認
      if (userData.type === 'star') {
        console.log('[STAR_MANAGEMENT] Star data:', {
          name: userData.name,
          temperature: (userData as StarUserData).temperature,
          spectralType: (userData as StarUserData).spectralType,
          age: (userData as StarUserData).age,
          lifespan: (userData as StarUserData).lifespan,
          fullUserData: userData
        });
      }
      
      html += `
        <tr data-id="${body.uuid}">
          <td>${userData.name || 'N/A'}</td>
          <td>${typeText}</td>
          <td>${(userData.mass as number).toExponential(2)}</td>
          <td>${(userData as StarUserData).temperature || '-'}</td>
          <td>${(userData as StarUserData).age ? 
            parseFloat((userData as StarUserData).age).toFixed(2) : '-'}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    this.contentArea.innerHTML = html;
    
    // イベントリスナーは既にinitializeEventListenersで設定済み（イベント委譲を使用）
  }


  /**
   * カメラを天体にフォーカス（直接移動）
   */
  private focusCamera(body: CelestialBody): void {
    console.log('[STAR_MANAGEMENT] focusCamera called for body:', body.userData.name);
    console.log('[STAR_MANAGEMENT] Body position:', body.position);
    console.log('[STAR_MANAGEMENT] Camera before:', camera.position.clone());
    console.log('[STAR_MANAGEMENT] Controls target before:', controls.target.clone());
    
    const targetPosition = body.position.clone();
    
    // 天体のサイズに基づいて適切な距離を計算
    const radius = body.userData.radius || 100;
    const distance = radius * 10; // 半径の10倍の距離
    
    // カメラの新しい位置を計算（天体の斜め上から見る）
    const offset = new THREE.Vector3(distance, distance * 0.5, distance);
    const newCameraPosition = targetPosition.clone().add(offset);
    
    console.log('[STAR_MANAGEMENT] Target position:', targetPosition);
    console.log('[STAR_MANAGEMENT] New camera position:', newCameraPosition);
    
    // カメラを即座に移動（アニメーションなし）
    camera.position.copy(newCameraPosition);
    
    // OrbitControlsのターゲットを更新
    controls.target.copy(targetPosition);
    controls.update();
    
    console.log('[STAR_MANAGEMENT] Camera after:', camera.position.clone());
    console.log('[STAR_MANAGEMENT] Controls target after:', controls.target.clone());
  }

  /**
   * クリーンアップ
   */
  public dispose(): void {
    // イベントリスナーの削除などが必要な場合
  }
}

// シングルトンインスタンス
export const starManagementUI = new StarManagementUI();