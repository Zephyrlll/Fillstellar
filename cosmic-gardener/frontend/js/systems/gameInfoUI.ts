import { dynamicEventSystem } from './dynamicEvents';
import { dailyChallenges } from './dailyChallenges';

class GameInfoUI {
    private container: HTMLElement | null = null;
    private updateInterval = 1000; // Update every second
    private lastUpdate = 0;
    private challengesCollapsed = false; // Start expanded for testing
    
    constructor() {
        this.createUI();
        this.loadUIState();
        this.initializeToggle();
    }
    
    private initializeToggle() {
        // Check saved visibility state
        const savedVisibility = localStorage.getItem('gameInfoUIVisible');
        const isVisible = savedVisibility === null ? true : savedVisibility === 'true';
        if (this.container && !isVisible) {
            this.container.style.display = 'none';
        }
    }
    
    private createUI() {
        // Create main container
        this.container = document.createElement('div');
        this.container.id = 'game-info-ui';
        this.container.style.cssText = `
            position: fixed;
            top: 120px;
            left: 20px;
            width: 280px;
            z-index: 9999;
            pointer-events: none;
        `;
        
        // Create events panel
        const eventsPanel = document.createElement('div');
        eventsPanel.id = 'active-events-panel';
        eventsPanel.style.cssText = `
            background: rgba(20, 20, 35, 0.95);
            border: 1px solid #4169E1;
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 10px;
            pointer-events: auto;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;
        
        // Create challenges panel with collapse functionality
        const challengesWrapper = document.createElement('div');
        challengesWrapper.style.cssText = `
            background: rgba(20, 20, 35, 0.95);
            border: 1px solid #4169E1;
            border-radius: 10px;
            overflow: hidden;
            pointer-events: auto;
            transition: all 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        `;
        
        // Create header that's always visible
        const challengesHeader = document.createElement('div');
        challengesHeader.id = 'challenges-header';
        challengesHeader.style.cssText = `
            padding: 15px;
            cursor: pointer;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(65, 105, 225, 0.1);
            border-bottom: 1px solid #4169E1;
        `;
        challengesHeader.onclick = () => this.toggleChallenges();
        
        // Create challenges content panel
        const challengesPanel = document.createElement('div');
        challengesPanel.id = 'daily-challenges-container';
        challengesPanel.style.cssText = `
            padding: 15px;
            max-height: 350px;
            overflow-y: auto;
            display: ${this.challengesCollapsed ? 'none' : 'block'};
        `;
        
        // Add CSS for smooth scrollbar
        const style = document.createElement('style');
        style.textContent = `
            #daily-challenges-container::-webkit-scrollbar {
                width: 6px;
            }
            #daily-challenges-container::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 3px;
            }
            #daily-challenges-container::-webkit-scrollbar-thumb {
                background: #4169E1;
                border-radius: 3px;
            }
            #daily-challenges-container::-webkit-scrollbar-thumb:hover {
                background: #5179F1;
            }
        `;
        document.head.appendChild(style);
        
        challengesWrapper.appendChild(challengesHeader);
        challengesWrapper.appendChild(challengesPanel);
        
        this.container.appendChild(eventsPanel);
        this.container.appendChild(challengesWrapper);
        document.body.appendChild(this.container);
        
        // Initialize header content
        this.updateChallengesHeader();
        // Initialize panel content if not collapsed
        if (!this.challengesCollapsed) {
            this.updateChallengesPanel();
        }
    }
    
    private toggleChallenges() {
        this.challengesCollapsed = !this.challengesCollapsed;
        const panel = document.getElementById('daily-challenges-container');
        if (panel) {
            panel.style.display = this.challengesCollapsed ? 'none' : 'block';
            // Update panel content when opening
            if (!this.challengesCollapsed) {
                this.updateChallengesPanel();
            }
        }
        this.saveUIState();
        this.updateChallengesHeader();
    }
    
    private saveUIState() {
        localStorage.setItem('gameInfoUIState', JSON.stringify({
            challengesCollapsed: this.challengesCollapsed
        }));
    }
    
    private loadUIState() {
        const saved = localStorage.getItem('gameInfoUIState');
        if (saved) {
            const state = JSON.parse(saved);
            this.challengesCollapsed = state.challengesCollapsed ?? true;
            const panel = document.getElementById('daily-challenges-container');
            if (panel) {
                panel.style.display = this.challengesCollapsed ? 'none' : 'block';
            }
        }
    }
    
    update(deltaTime: number) {
        this.lastUpdate += deltaTime * 1000;
        if (this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = 0;
        
        this.updateEventsPanel();
        this.updateChallengesHeader();
        if (!this.challengesCollapsed) {
            this.updateChallengesPanel();
        }
    }
    
    private updateEventsPanel() {
        const panel = document.getElementById('active-events-panel');
        if (!panel) return;
        
        const activeEvents = dynamicEventSystem.getActiveEvents();
        
        if (activeEvents.length === 0) {
            panel.style.display = 'none';
            return;
        }
        
        panel.style.display = 'block';
        
        const eventsHTML = activeEvents.map(({ event, remainingTime }) => `
            <div style="
                background: rgba(65, 105, 225, 0.2);
                border-left: 3px solid #FFD700;
                padding: 10px;
                margin: 5px 0;
                border-radius: 5px;
            ">
                <h4 style="color: #FFD700; margin: 0; font-size: 14px;">${event.name}</h4>
                <p style="color: #ccc; margin: 5px 0; font-size: 12px;">${event.description}</p>
                <p style="color: #87CEEB; margin: 0; font-size: 11px;">
                    残り時間: ${Math.floor(remainingTime)}秒
                </p>
            </div>
        `).join('');
        
        panel.innerHTML = `
            <h3 style="color: #FFD700; margin: 0 0 10px 0; font-size: 16px;">🌟 アクティブイベント</h3>
            ${eventsHTML}
        `;
    }
    
    private updateChallengesHeader() {
        const header = document.getElementById('challenges-header');
        if (!header) return;
        
        const challenges = dailyChallenges.getChallenges();
        const completedCount = challenges.filter(c => c.completed).length;
        const totalCount = challenges.length;
        
        header.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #87CEEB; font-size: 16px; font-weight: bold;">
                    📅 デイリーチャレンジ
                </span>
                <span style="
                    background: ${completedCount === totalCount ? '#4CAF50' : '#4169E1'};
                    color: white;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                ">
                    ${completedCount}/${totalCount}
                </span>
            </div>
            <span style="color: #87CEEB; font-size: 20px;">
                ${this.challengesCollapsed ? '▼' : '▲'}
            </span>
        `;
    }
    
    private updateChallengesPanel() {
        const panel = document.getElementById('daily-challenges-container');
        if (!panel) return;
        
        const challenges = dailyChallenges.getChallenges();
        console.log('[GameInfoUI] Updating challenges panel, challenges:', challenges);
        
        if (challenges.length === 0) {
            panel.innerHTML = '<p style="color: #aaa; text-align: center;">チャレンジを読み込み中...</p>';
            return;
        }
        
        const challengesHTML = challenges.map(challenge => {
            const completed = challenge.completed;
            const progress = challenge.progress;
            
            return `
                <div style="
                    background: rgba(65, 105, 225, 0.1);
                    border: 1px solid ${completed ? '#4CAF50' : '#4169E1'};
                    border-radius: 5px;
                    padding: 8px;
                    margin: 5px 0;
                    ${completed ? 'opacity: 0.7;' : ''}
                ">
                    <h4 style="color: ${completed ? '#4CAF50' : '#87CEEB'}; margin: 0; font-size: 13px;">
                        ${completed ? '✅ ' : '⭐ '}${challenge.name}
                    </h4>
                    <p style="color: #ccc; margin: 3px 0; font-size: 11px;">${challenge.description}</p>
                    ${progress && !completed ? `
                        <div style="
                            background: rgba(0, 0, 0, 0.3);
                            height: 12px;
                            border-radius: 6px;
                            overflow: hidden;
                            margin: 5px 0;
                        ">
                            <div style="
                                background: linear-gradient(90deg, #4169E1, #87CEEB);
                                height: 100%;
                                width: ${Math.min(100, (progress.current / progress.target) * 100)}%;
                                transition: width 0.3s;
                            "></div>
                        </div>
                        <p style="color: #aaa; margin: 0; font-size: 10px; text-align: center;">
                            ${progress.current.toLocaleString()} / ${progress.target.toLocaleString()}
                        </p>
                    ` : ''}
                    ${!completed ? `
                        <p style="color: #FFD700; margin: 5px 0 0 0; font-size: 11px;">
                            報酬: ${challenge.reward.amount} ${this.getResourceName(challenge.reward.type)}
                        </p>
                    ` : ''}
                </div>
            `;
        }).join('');
        
        panel.innerHTML = challengesHTML;
    }
    
    private getResourceName(type: string): string {
        const names: { [key: string]: string } = {
            cosmicDust: '宇宙の塵',
            energy: 'エネルギー',
            organicMatter: '有機物',
            biomass: 'バイオマス',
            darkMatter: 'ダークマター',
            thoughtPoints: '思考ポイント'
        };
        return names[type] || type;
    }
}

export const gameInfoUI = new GameInfoUI();