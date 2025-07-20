/**
 * Tutorial UI
 * UI for tutorial selection and management
 */

import { tutorialSystem } from './tutorialSystem.js';
import { Tutorial, TutorialCategory } from '../types/tutorial.js';
import { animationSystem } from './simpleAnimations.js';

export class TutorialUI {
  private static instance: TutorialUI;
  private container: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  
  private constructor() {
    console.log('[TUTORIAL-UI] Initialized');
  }
  
  static getInstance(): TutorialUI {
    if (!TutorialUI.instance) {
      TutorialUI.instance = new TutorialUI();
    }
    return TutorialUI.instance;
  }
  
  init(): void {
    this.createUI();
    this.setupEventListeners();
  }
  
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'tutorial-list-ui';
    this.container.className = 'tutorial-list-ui hidden';
    this.container.innerHTML = `
      <div class="tutorial-list-header">
        <h2>チュートリアル</h2>
        <button class="tutorial-list-close" title="閉じる">×</button>
      </div>
      
      <div class="tutorial-list-content">
        <div class="tutorial-progress-overview">
          <h3>進捗状況</h3>
          <div class="tutorial-progress-bar">
            <div class="tutorial-progress-fill" id="tutorial-progress-fill"></div>
          </div>
          <div class="tutorial-progress-text" id="tutorial-progress-text">0/0 完了</div>
        </div>
        
        <div class="tutorial-categories">
          <button class="category-tab active" data-category="all">すべて</button>
          <button class="category-tab" data-category="basics">基本</button>
          <button class="category-tab" data-category="resources">資源</button>
          <button class="category-tab" data-category="celestial">天体</button>
          <button class="category-tab" data-category="advanced">上級</button>
        </div>
        
        <div class="tutorial-list" id="tutorial-list"></div>
      </div>
    `;
    
    document.body.appendChild(this.container);
    this.addStyles();
  }
  
  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .tutorial-list-ui {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        max-height: 80vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%);
        border: 2px solid #4a4aff;
        border-radius: 20px;
        box-shadow: 0 0 30px rgba(74, 74, 255, 0.5);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      
      .tutorial-list-ui.hidden {
        display: none;
      }
      
      .tutorial-list-header {
        padding: 20px;
        background: rgba(74, 74, 255, 0.1);
        border-bottom: 1px solid #4a4aff;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .tutorial-list-header h2 {
        margin: 0;
        color: #fff;
        font-size: 24px;
      }
      
      .tutorial-list-close {
        background: transparent;
        border: 1px solid #4a4aff;
        color: #fff;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        transition: all 0.3s;
      }
      
      .tutorial-list-close:hover {
        background: #4a4aff;
        transform: rotate(90deg);
      }
      
      .tutorial-list-content {
        flex: 1;
        padding: 20px;
        overflow-y: auto;
      }
      
      .tutorial-progress-overview {
        background: rgba(255, 255, 255, 0.05);
        padding: 20px;
        border-radius: 10px;
        margin-bottom: 20px;
      }
      
      .tutorial-progress-overview h3 {
        margin: 0 0 10px 0;
        color: #4a4aff;
        font-size: 16px;
      }
      
      .tutorial-progress-bar {
        width: 100%;
        height: 20px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 10px;
      }
      
      .tutorial-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #4a4aff 0%, #7a7aff 100%);
        transition: width 0.3s;
      }
      
      .tutorial-progress-text {
        text-align: center;
        color: #aaa;
        font-size: 14px;
      }
      
      .tutorial-categories {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      
      .category-tab {
        padding: 8px 16px;
        background: transparent;
        border: 1px solid #4a4aff;
        color: #aaa;
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .category-tab:hover {
        color: #fff;
        background: rgba(74, 74, 255, 0.2);
      }
      
      .category-tab.active {
        background: #4a4aff;
        color: #fff;
      }
      
      .tutorial-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      
      .tutorial-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        padding: 15px;
        cursor: pointer;
        transition: all 0.3s;
      }
      
      .tutorial-item:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateX(5px);
      }
      
      .tutorial-item.completed {
        opacity: 0.7;
      }
      
      .tutorial-item.completed .tutorial-item-status {
        color: #4caf50;
      }
      
      .tutorial-item.locked {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .tutorial-item.locked:hover {
        transform: none;
      }
      
      .tutorial-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
      }
      
      .tutorial-item-name {
        color: #fff;
        font-size: 16px;
        font-weight: bold;
      }
      
      .tutorial-item-status {
        font-size: 14px;
        color: #aaa;
      }
      
      .tutorial-item-description {
        color: #aaa;
        font-size: 14px;
        margin-bottom: 8px;
      }
      
      .tutorial-item-info {
        display: flex;
        gap: 15px;
        font-size: 12px;
        color: #666;
      }
      
      .tutorial-item-steps {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      
      .tutorial-item-category {
        display: flex;
        align-items: center;
        gap: 5px;
      }
    `;
    document.head.appendChild(style);
  }
  
  private setupEventListeners(): void {
    // Close button
    const closeBtn = this.container?.querySelector('.tutorial-list-close');
    closeBtn?.addEventListener('click', () => this.hide());
    
    // Category tabs
    this.container?.querySelectorAll('.category-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const category = (e.currentTarget as HTMLElement).dataset.category;
        if (category) this.filterByCategory(category);
      });
    });
  }
  
  show(): void {
    if (!this.container) return;
    
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this.render();
    
    animationSystem.fadeIn({
      targets: this.container,
      duration: 300
    });
  }
  
  hide(): void {
    if (!this.container) return;
    
    this.isOpen = false;
    
    animationSystem.fadeOut({
      targets: this.container,
      duration: 300,
      complete: () => {
        this.container?.classList.add('hidden');
      }
    });
  }
  
  private render(): void {
    if (!this.container) return;
    
    // Update progress
    const progress = tutorialSystem.getTutorialProgress();
    const progressFill = this.container.querySelector('#tutorial-progress-fill') as HTMLElement;
    const progressText = this.container.querySelector('#tutorial-progress-text');
    
    if (progressFill) {
      progressFill.style.width = `${progress.percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${progress.completed}/${progress.total} 完了`;
    }
    
    // Render tutorial list
    this.renderTutorials('all');
  }
  
  private renderTutorials(category: string): void {
    const listContainer = this.container?.querySelector('#tutorial-list');
    if (!listContainer) return;
    
    const tutorials = tutorialSystem.getAvailableTutorials();
    const completedTutorials = tutorialSystem['state'].completedTutorials;
    
    const filteredTutorials = category === 'all' 
      ? tutorials 
      : tutorials.filter(t => t.category === category);
    
    listContainer.innerHTML = filteredTutorials.map(tutorial => {
      const isCompleted = completedTutorials.has(tutorial.id);
      const isLocked = tutorial.requiredPhase !== undefined && 
                      tutorial.requiredPhase > 0; // Simplified check
      
      let className = 'tutorial-item';
      if (isCompleted) className += ' completed';
      if (isLocked && !isCompleted) className += ' locked';
      
      return `
        <div class="${className}" data-tutorial-id="${tutorial.id}">
          <div class="tutorial-item-header">
            <span class="tutorial-item-name">${tutorial.name}</span>
            <span class="tutorial-item-status">
              ${isCompleted ? '✓ 完了' : isLocked ? '🔒 ロック中' : '未完了'}
            </span>
          </div>
          <div class="tutorial-item-description">${tutorial.description}</div>
          <div class="tutorial-item-info">
            <div class="tutorial-item-steps">
              📝 ${tutorial.steps.length} ステップ
            </div>
            <div class="tutorial-item-category">
              📂 ${this.getCategoryLabel(tutorial.category)}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // Add click handlers
    listContainer.querySelectorAll('.tutorial-item').forEach(item => {
      const tutorialId = (item as HTMLElement).dataset.tutorialId;
      if (tutorialId && !item.classList.contains('locked')) {
        item.addEventListener('click', () => {
          this.hide();
          tutorialSystem.startTutorial(tutorialId);
        });
      }
    });
  }
  
  private filterByCategory(category: string): void {
    // Update active tab
    this.container?.querySelectorAll('.category-tab').forEach(tab => {
      if ((tab as HTMLElement).dataset.category === category) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    
    // Render filtered tutorials
    this.renderTutorials(category);
  }
  
  private getCategoryLabel(category: TutorialCategory): string {
    const labels: Record<TutorialCategory, string> = {
      [TutorialCategory.BASICS]: '基本',
      [TutorialCategory.RESOURCES]: '資源',
      [TutorialCategory.CELESTIAL]: '天体',
      [TutorialCategory.LIFE]: '生命',
      [TutorialCategory.RESEARCH]: '研究',
      [TutorialCategory.PRESTIGE]: 'プレステージ',
      [TutorialCategory.ADVANCED]: '上級'
    };
    
    return labels[category] || category;
  }
}

export const tutorialUI = TutorialUI.getInstance();