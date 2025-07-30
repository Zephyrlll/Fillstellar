import { gameStateManager } from '../state';
import { showMessage } from '../ui';

interface Challenge {
    id: string;
    name: string;
    description: string;
    checkCondition: () => boolean;
    reward: {
        type: string;
        amount: number;
    };
    progress?: () => { current: number; target: number };
}

class DailyChallengeSystem {
    private challenges: Challenge[] = [];
    private completedToday: Set<string> = new Set();
    private lastResetDate: string = '';
    
    constructor() {
        console.log('[DailyChallenges] Initializing...');
        this.initializeChallenges();
        this.loadProgress();
        this.checkDailyReset();
        console.log('[DailyChallenges] Initialized with', this.challenges.length, 'challenges');
    }
    
    private initializeChallenges() {
        this.challenges = [
            {
                id: 'create_5_celestials',
                name: '天体創造者',
                description: '任意の天体を5個作成する',
                checkCondition: () => {
                    const state = gameStateManager.getState();
                    return state.stars.length >= 5;
                },
                reward: { type: 'energy', amount: 1000 },
                progress: () => {
                    const state = gameStateManager.getState();
                    return { current: state.stars.length, target: 5 };
                }
            },
            {
                id: 'collect_10k_dust',
                name: '塵収集家',
                description: '宇宙の塵を10,000集める',
                checkCondition: () => {
                    const state = gameStateManager.getState();
                    return state.resources.cosmicDust >= 10000;
                },
                reward: { type: 'darkMatter', amount: 5 },
                progress: () => {
                    const state = gameStateManager.getState();
                    return { current: Math.floor(state.resources.cosmicDust), target: 10000 };
                }
            },
            {
                id: 'evolve_life',
                name: '生命の守護者',
                description: '惑星に生命を誕生させる',
                checkCondition: () => {
                    const state = gameStateManager.getState();
                    return state.stars.some(star => 
                        star.userData.type === 'planet' && 
                        star.userData.hasLife === true
                    );
                },
                reward: { type: 'organicMatter', amount: 500 }
            },
            {
                id: 'reach_year_100',
                name: '時の旅人',
                description: 'ゲーム内年数100年に到達',
                checkCondition: () => {
                    const state = gameStateManager.getState();
                    return state.gameYear >= 100;
                },
                reward: { type: 'thoughtPoints', amount: 100 },
                progress: () => {
                    const state = gameStateManager.getState();
                    return { current: Math.floor(state.gameYear), target: 100 };
                }
            },
            {
                id: 'upgrade_dust_gen',
                name: 'アップグレーダー',
                description: '塵生成をレベル3までアップグレード',
                checkCondition: () => {
                    const state = gameStateManager.getState();
                    return state.dustUpgradeLevel >= 3;
                },
                reward: { type: 'energy', amount: 2000 },
                progress: () => {
                    const state = gameStateManager.getState();
                    return { current: state.dustUpgradeLevel, target: 3 };
                }
            }
        ];
    }
    
    private getTodayDateString(): string {
        const today = new Date();
        return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    }
    
    private checkDailyReset() {
        const today = this.getTodayDateString();
        if (this.lastResetDate !== today) {
            this.completedToday.clear();
            this.lastResetDate = today;
            this.saveProgress();
            showMessage('🌅 デイリーチャレンジがリセットされました！', 'info');
        }
    }
    
    update() {
        this.checkDailyReset();
        
        this.challenges.forEach(challenge => {
            if (!this.completedToday.has(challenge.id) && challenge.checkCondition()) {
                this.completeChallenge(challenge);
            }
        });
    }
    
    private completeChallenge(challenge: Challenge) {
        this.completedToday.add(challenge.id);
        
        // Apply reward
        gameStateManager.updateState(state => ({
            ...state,
            resources: {
                ...state.resources,
                [challenge.reward.type]: state.resources[challenge.reward.type] + challenge.reward.amount
            }
        }));
        
        showMessage(`✨ チャレンジ「${challenge.name}」完了！ +${challenge.reward.amount} ${this.getResourceName(challenge.reward.type)}`, 'success');
        
        this.saveProgress();
        this.updateUI();
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
    
    private saveProgress() {
        localStorage.setItem('dailyChallenges', JSON.stringify({
            completedToday: Array.from(this.completedToday),
            lastResetDate: this.lastResetDate
        }));
    }
    
    private loadProgress() {
        const saved = localStorage.getItem('dailyChallenges');
        if (saved) {
            const data = JSON.parse(saved);
            this.completedToday = new Set(data.completedToday || []);
            this.lastResetDate = data.lastResetDate || '';
        }
    }
    
    getChallenges() {
        const result = this.challenges.map(challenge => ({
            ...challenge,
            completed: this.completedToday.has(challenge.id),
            progress: challenge.progress ? challenge.progress() : undefined
        }));
        console.log('[DailyChallenges] getChallenges() returning', result.length, 'challenges');
        return result;
    }
    
    private updateUI() {
        const container = document.getElementById('daily-challenges-container');
        if (!container) return;
        
        const challengesHTML = this.getChallenges().map(challenge => {
            const completed = challenge.completed;
            const progress = challenge.progress;
            
            return `
                <div class="daily-challenge ${completed ? 'completed' : ''}" style="
                    background: rgba(26, 26, 46, 0.8);
                    border: 1px solid ${completed ? '#4CAF50' : '#4169E1'};
                    border-radius: 5px;
                    padding: 10px;
                    margin: 5px 0;
                    ${completed ? 'opacity: 0.7;' : ''}
                ">
                    <h4 style="color: ${completed ? '#4CAF50' : '#87CEEB'}; margin: 0;">
                        ${completed ? '✅ ' : ''}${challenge.name}
                    </h4>
                    <p style="color: #ccc; margin: 5px 0; font-size: 14px;">${challenge.description}</p>
                    ${progress && !completed ? `
                        <div style="background: #333; height: 20px; border-radius: 10px; overflow: hidden;">
                            <div style="
                                background: #4169E1;
                                height: 100%;
                                width: ${Math.min(100, (progress.current / progress.target) * 100)}%;
                                transition: width 0.3s;
                            "></div>
                        </div>
                        <p style="color: #aaa; margin: 5px 0; font-size: 12px; text-align: center;">
                            ${progress.current} / ${progress.target}
                        </p>
                    ` : ''}
                    <p style="color: #FFD700; margin: 5px 0; font-size: 14px;">
                        報酬: ${challenge.reward.amount} ${this.getResourceName(challenge.reward.type)}
                    </p>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <h3 style="color: #87CEEB;">デイリーチャレンジ</h3>
            ${challengesHTML}
        `;
    }
}

export const dailyChallenges = new DailyChallengeSystem();