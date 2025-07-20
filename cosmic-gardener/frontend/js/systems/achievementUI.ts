import { AchievementSystem } from './achievements.js';
import { AchievementCategory, AchievementProgress } from '../types/achievements.js';

export class AchievementUI {
  private container: HTMLDivElement | null = null;
  private achievementSystem: AchievementSystem;
  private isOpen: boolean = false;
  private currentCategory: AchievementCategory | 'all' = 'all';
  
  constructor(achievementSystem: AchievementSystem) {
    this.achievementSystem = achievementSystem;
  }
  
  init(): void {
    this.createToggleButton();
    this.createUI();
  }
  
  private createToggleButton(): void {
    const button = document.createElement('button');
    button.id = 'achievement-toggle';
    button.className = 'achievement-toggle-button';
    button.innerHTML = '🏆';
    button.title = '実績';
    
    // Show unlock count
    const progress = this.achievementSystem.getOverallProgress();
    const badge = document.createElement('span');
    badge.className = 'achievement-badge';
    badge.textContent = `${progress.unlocked}/${progress.total}`;
    button.appendChild(badge);
    
    button.addEventListener('click', () => this.toggle());
    document.body.appendChild(button);
    
    // Update badge periodically
    setInterval(() => {
      const progress = this.achievementSystem.getOverallProgress();
      badge.textContent = `${progress.unlocked}/${progress.total}`;
    }, 5000);
  }
  
  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'achievement-panel';
    this.container.className = 'achievement-panel';
    this.container.style.display = 'none';
    
    document.body.appendChild(this.container);
    this.render();
  }
  
  private render(): void {
    if (!this.container) return;
    
    const overallProgress = this.achievementSystem.getOverallProgress();
    
    this.container.innerHTML = `
      <div class="achievement-header">
        <h2>実績 (${overallProgress.unlocked}/${overallProgress.total})</h2>
        <button class="achievement-close" title="閉じる">×</button>
      </div>
      
      <div class="achievement-progress-bar">
        <div class="achievement-progress-fill" style="width: ${overallProgress.percentage}%"></div>
        <span class="achievement-progress-text">${Math.floor(overallProgress.percentage)}%</span>
      </div>
      
      <div class="achievement-categories">
        ${this.renderCategories()}
      </div>
      
      <div class="achievement-list">
        ${this.renderAchievements()}
      </div>
    `;
    
    // Setup event listeners
    const closeBtn = this.container.querySelector('.achievement-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    // Category buttons
    this.container.querySelectorAll('.category-button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const category = (e.target as HTMLElement).dataset.category as AchievementCategory | 'all';
        this.setCategory(category);
      });
    });
  }
  
  private renderCategories(): string {
    const categories: Array<{ id: AchievementCategory | 'all'; name: string; icon: string }> = [
      { id: 'all', name: 'すべて', icon: '📋' },
      { id: 'resource', name: '資源', icon: '💎' },
      { id: 'celestial', name: '天体', icon: '🌟' },
      { id: 'life', name: '生命', icon: '🌱' },
      { id: 'general', name: '一般', icon: '🎯' },
      { id: 'special', name: '特別', icon: '🎁' }
    ];
    
    return categories.map(cat => {
      const progress = cat.id === 'all' 
        ? this.achievementSystem.getOverallProgress()
        : this.achievementSystem.getCategoryProgress(cat.id);
      
      const isActive = this.currentCategory === cat.id;
      
      return `
        <button class="category-button ${isActive ? 'active' : ''}" data-category="${cat.id}">
          <span class="category-icon">${cat.icon}</span>
          <span class="category-name">${cat.name}</span>
          <span class="category-count">${progress.unlocked}/${progress.total}</span>
        </button>
      `;
    }).join('');
  }
  
  private renderAchievements(): string {
    const allProgress = this.achievementSystem.getAllProgress();
    
    // Filter by category
    const filtered = this.currentCategory === 'all' 
      ? allProgress
      : allProgress.filter(p => p.achievement.category === this.currentCategory);
    
    // Sort: unlocked first, then by tier/name
    filtered.sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      if (a.achievement.tier && b.achievement.tier) {
        return a.achievement.tier - b.achievement.tier;
      }
      return a.achievement.name.localeCompare(b.achievement.name);
    });
    
    return filtered.map(progress => this.renderAchievement(progress)).join('');
  }
  
  private renderAchievement(progress: AchievementProgress): string {
    const { achievement, unlocked, unlockedAt } = progress;
    
    // Hide hidden achievements that are not unlocked
    if (achievement.hidden && !unlocked) {
      return `
        <div class="achievement-item locked hidden">
          <div class="achievement-icon">❓</div>
          <div class="achievement-info">
            <div class="achievement-name">???</div>
            <div class="achievement-description">隠された実績</div>
          </div>
        </div>
      `;
    }
    
    const tierStars = achievement.tier ? '⭐'.repeat(achievement.tier) : '';
    const progressBar = !unlocked && progress.progress ? `
      <div class="achievement-progress">
        <div class="achievement-progress-bar">
          <div class="achievement-progress-fill" style="width: ${(progress.progress.current / progress.progress.target) * 100}%"></div>
        </div>
        <span class="achievement-progress-text">${progress.progress.current} / ${progress.progress.target}</span>
      </div>
    ` : '';
    
    const unlockedDate = unlockedAt ? new Date(unlockedAt).toLocaleDateString('ja-JP') : '';
    
    return `
      <div class="achievement-item ${unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon">${achievement.icon || '🏆'}</div>
        <div class="achievement-info">
          <div class="achievement-name">
            ${achievement.name} ${tierStars}
            ${unlocked ? `<span class="achievement-date">${unlockedDate}</span>` : ''}
          </div>
          <div class="achievement-description">${achievement.description}</div>
          ${progressBar}
          ${this.renderReward(achievement)}
        </div>
      </div>
    `;
  }
  
  private renderReward(achievement: any): string {
    if (!achievement.reward) return '';
    
    const rewards = [];
    
    if (achievement.reward.resources) {
      for (const [resource, amount] of Object.entries(achievement.reward.resources)) {
        rewards.push(`<span class="reward-resource">${this.getResourceName(resource)} +${amount}</span>`);
      }
    }
    
    if (achievement.reward.multipliers) {
      for (const [multiplier, value] of Object.entries(achievement.reward.multipliers)) {
        const permanent = achievement.reward.permanent ? ' (永続)' : '';
        rewards.push(`<span class="reward-multiplier">${this.getMultiplierName(multiplier)} ×${value}${permanent}</span>`);
      }
    }
    
    return rewards.length > 0 ? `<div class="achievement-rewards">報酬: ${rewards.join(' ')}</div>` : '';
  }
  
  private getResourceName(resource: string): string {
    const names: Record<string, string> = {
      cosmicDust: '宇宙の塵',
      energy: 'エネルギー',
      organicMatter: '有機物',
      biomass: 'バイオマス',
      darkMatter: 'ダークマター',
      thoughtPoints: '思考ポイント'
    };
    return names[resource] || resource;
  }
  
  private getMultiplierName(multiplier: string): string {
    const names: Record<string, string> = {
      dustGeneration: '塵生成',
      energyGeneration: 'エネルギー生成',
      organicMatter: '有機物生成',
      biomass: 'バイオマス生成',
      darkMatter: 'ダークマター生成',
      thoughtPoints: '思考ポイント生成',
      offlineEfficiency: 'オフライン効率',
      researchSpeed: '研究速度'
    };
    return names[multiplier] || multiplier;
  }
  
  private setCategory(category: AchievementCategory | 'all'): void {
    this.currentCategory = category;
    this.render();
  }
  
  toggle(): void {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  show(): void {
    if (!this.container) return;
    
    this.isOpen = true;
    this.container.style.display = 'block';
    
    // Clear newly unlocked
    this.achievementSystem.clearNewlyUnlocked();
    
    // Refresh display
    this.render();
    
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.classList.add('visible');
      }
    });
  }
  
  hide(): void {
    if (!this.container) return;
    
    this.isOpen = false;
    this.container.classList.remove('visible');
    
    setTimeout(() => {
      if (this.container && !this.isOpen) {
        this.container.style.display = 'none';
      }
    }, 300);
  }
  
  destroy(): void {
    const button = document.getElementById('achievement-toggle');
    if (button) {
      button.remove();
    }
    
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}