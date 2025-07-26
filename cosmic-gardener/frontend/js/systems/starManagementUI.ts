// 恒星管理UI管理システム

import { soundManager } from '../sound.js';
import { gameState, gameStateManager } from '../state.js';
import type { CelestialBody, StarUserData } from '../state.js';

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
    soundManager.playSound('ui_open');
    this.updateStarList();
  }

  /**
   * パネルを閉じる
   */
  private closePanel(): void {
    this.isOpen = false;
    this.container.classList.remove('active');
    soundManager.playSound('ui_close');
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
      
      html += `
        <tr class="star-row" data-id="${userData.id}">
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

    // イベントリスナーを追加
    this.addTableEventListeners();
  }

  /**
   * テーブルのイベントリスナーを追加
   */
  private addTableEventListeners(): void {
    // ヘッダークリックでソート
    const headers = this.contentArea.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const sortKey = header.getAttribute('data-sort')!;
        if (this.sortColumn === sortKey) {
          this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          this.sortColumn = sortKey;
          this.sortDirection = 'asc';
        }
        this.updateStarList();
      });
    });

    // 行クリックでフォーカス
    const rows = this.contentArea.querySelectorAll('.star-row');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-id');
        const body = gameState.stars.find(s => s.userData.id === id);
        if (body) {
          gameStateManager.updateState(state => ({
            ...state,
            focusedObject: body
          }));
          soundManager.playSound('ui_click');
          // パネルを閉じる
          this.closePanel();
        }
      });
    });
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