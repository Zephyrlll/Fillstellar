import { OfflineProgress } from '../types/idle.js';
import { formatNumber } from '../utils.js';

export class OfflineReportModal {
  private modalElement: HTMLDivElement | null = null;
  private progress: OfflineProgress;
  
  constructor(progress: OfflineProgress) {
    this.progress = progress;
  }
  
  show(): void {
    if (this.modalElement) {
      this.hide();
    }
    
    this.modalElement = this.createModal();
    document.body.appendChild(this.modalElement);
    
    // Fade in animation
    requestAnimationFrame(() => {
      if (this.modalElement) {
        this.modalElement.classList.add('visible');
      }
    });
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hide();
    }, 10000);
  }
  
  hide(): void {
    if (this.modalElement) {
      this.modalElement.classList.remove('visible');
      setTimeout(() => {
        if (this.modalElement) {
          this.modalElement.remove();
          this.modalElement = null;
        }
      }, 300); // Wait for fade out animation
    }
  }
  
  private createModal(): HTMLDivElement {
    const modal = document.createElement('div');
    modal.className = 'offline-report-modal';
    modal.innerHTML = this.generateContent();
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hide();
      }
    });
    
    // Click close button
    const closeBtn = modal.querySelector('.close-button');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hide());
    }
    
    return modal;
  }
  
  private generateContent(): string {
    const { duration, resources, events, summary } = this.progress;
    
    if (duration === 0) {
      return '';
    }
    
    const durationText = this.formatDuration(duration);
    const gains = summary.totalGains;
    
    let content = `
      <div class="offline-report-content">
        <button class="close-button">×</button>
        <h2>おかえりなさい！</h2>
        <p class="offline-duration">${durationText}の間、宇宙の庭は成長を続けていました。</p>
        
        <div class="resource-gains">
          <h3>獲得した資源</h3>
          <div class="resource-list">
    `;
    
    // Add resource gains
    if (gains.cosmicDust > 0) {
      content += this.createResourceItem('宇宙の塵', gains.cosmicDust, 'cosmic-dust');
    }
    if (gains.energy > 0) {
      content += this.createResourceItem('エネルギー', gains.energy, 'energy');
    }
    if (gains.organicMatter > 0) {
      content += this.createResourceItem('有機物', gains.organicMatter, 'organic-matter');
    }
    if (gains.biomass > 0) {
      content += this.createResourceItem('バイオマス', gains.biomass, 'biomass');
    }
    if (gains.darkMatter > 0) {
      content += this.createResourceItem('ダークマター', gains.darkMatter, 'dark-matter');
    }
    if (gains.thoughtPoints > 0) {
      content += this.createResourceItem('思考ポイント', gains.thoughtPoints, 'thought-points');
    }
    
    content += `
          </div>
        </div>
    `;
    
    // Add events if any
    if (events.length > 0) {
      content += `
        <div class="offline-events">
          <h3>発生したイベント</h3>
          <div class="event-list">
      `;
      
      events.forEach(event => {
        const icon = this.getEventIcon(event.type);
        content += `
          <div class="event-item ${event.type}">
            <span class="event-icon">${icon}</span>
            <span class="event-description">${event.description}</span>
          </div>
        `;
      });
      
      content += `
          </div>
        </div>
      `;
    }
    
    // Add warning if time was capped
    if (summary.cappedTime) {
      content += `
        <div class="offline-warning">
          <span class="warning-icon">⚠️</span>
          <span>オフライン時間は最大12時間に制限されています。</span>
        </div>
      `;
    }
    
    content += `
        <button class="ok-button" onclick="this.parentElement.parentElement.querySelector('.close-button').click()">
          確認
        </button>
      </div>
    `;
    
    return content;
  }
  
  private createResourceItem(name: string, amount: number, cssClass: string): string {
    return `
      <div class="resource-item ${cssClass}">
        <span class="resource-name">${name}</span>
        <span class="resource-amount">+${formatNumber(amount)}</span>
      </div>
    `;
  }
  
  private getEventIcon(type: string): string {
    switch (type) {
      case 'star_birth': return '⭐';
      case 'planet_formation': return '🌍';
      case 'life_evolution': return '🌱';
      case 'resource_bonus': return '✨';
      default: return '📌';
    }
  }
  
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}日 ${hours % 24}時間`;
    } else if (hours > 0) {
      return `${hours}時間 ${minutes % 60}分`;
    } else if (minutes > 0) {
      return `${minutes}分`;
    } else {
      return `${seconds}秒`;
    }
  }
}