import { gameStateManager } from '../state';
import { showMessage } from '../ui';

interface MinigameConfig {
    resourceType: string;
    baseReward: number;
    difficulty: number;
}

class ResourceMinigameSystem {
    private isActive = false;
    private currentGame: MinigameConfig | null = null;
    private gameContainer: HTMLElement | null = null;
    
    constructor() {
        this.createGameContainer();
    }
    
    private createGameContainer() {
        this.gameContainer = document.createElement('div');
        this.gameContainer.id = 'resource-minigame';
        this.gameContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(26, 26, 46, 0.95);
            border: 2px solid #4169E1;
            border-radius: 10px;
            padding: 20px;
            z-index: 10000;
            display: none;
            min-width: 400px;
            box-shadow: 0 0 30px rgba(65, 105, 225, 0.5);
        `;
        document.body.appendChild(this.gameContainer);
    }
    
    startMinigame(config: MinigameConfig) {
        if (this.isActive) return;
        
        this.isActive = true;
        this.currentGame = config;
        
        if (!this.gameContainer) return;
        
        // Create timing-based minigame
        this.gameContainer.innerHTML = `
            <h3 style="color: #87CEEB; text-align: center;">資源収集チャレンジ！</h3>
            <p style="color: #fff; text-align: center;">タイミングよくクリックして最大報酬を獲得！</p>
            <div style="position: relative; height: 50px; background: #333; border-radius: 25px; margin: 20px 0; overflow: hidden;">
                <div id="timing-bar" style="position: absolute; width: 20px; height: 100%; background: #4169E1; left: 0; transition: none;"></div>
                <div style="position: absolute; left: 45%; width: 10%; height: 100%; background: rgba(255, 215, 0, 0.3);"></div>
            </div>
            <div style="text-align: center;">
                <button id="timing-button" style="
                    padding: 10px 30px;
                    background: #4169E1;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                ">クリック！</button>
                <button id="skip-button" style="
                    padding: 10px 30px;
                    background: #666;
                    color: white;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-left: 10px;
                ">スキップ</button>
            </div>
            <div id="minigame-result" style="text-align: center; margin-top: 20px; color: #fff;"></div>
        `;
        
        this.gameContainer.style.display = 'block';
        
        const timingBar = document.getElementById('timing-bar');
        const timingButton = document.getElementById('timing-button');
        const skipButton = document.getElementById('skip-button');
        const resultDiv = document.getElementById('minigame-result');
        
        if (!timingBar || !timingButton || !skipButton || !resultDiv) return;
        
        let position = 0;
        let direction = 1;
        const speed = 2 + config.difficulty * 0.5;
        
        const animateBar = () => {
            if (!this.isActive) return;
            
            position += direction * speed;
            if (position >= 380 || position <= 0) {
                direction *= -1;
            }
            
            timingBar.style.left = position + 'px';
            requestAnimationFrame(animateBar);
        };
        
        animateBar();
        
        timingButton.onclick = () => {
            this.isActive = false;
            
            // Calculate reward based on position
            const perfectZone = position >= 170 && position <= 210;
            const goodZone = position >= 140 && position <= 240;
            
            let multiplier = 0.5;
            let message = '失敗...';
            let color = '#ff6b6b';
            
            if (perfectZone) {
                multiplier = 2.0;
                message = 'パーフェクト！！';
                color = '#FFD700';
            } else if (goodZone) {
                multiplier = 1.5;
                message = 'グッド！';
                color = '#4169E1';
            }
            
            const reward = Math.floor(config.baseReward * multiplier);
            
            resultDiv.innerHTML = `<span style="color: ${color}; font-size: 24px;">${message}</span><br>
                                   獲得: ${reward} ${this.getResourceName(config.resourceType)}`;
            
            // Apply reward
            this.applyReward(config.resourceType, reward);
            
            timingButton.style.display = 'none';
            skipButton.textContent = '閉じる';
        };
        
        skipButton.onclick = () => {
            this.closeMinigame();
            if (this.isActive) {
                // Give minimum reward for skipping
                this.applyReward(config.resourceType, Math.floor(config.baseReward * 0.3));
            }
        };
    }
    
    private applyReward(resourceType: string, amount: number) {
        gameStateManager.updateState(state => ({
            ...state,
            resources: {
                ...state.resources,
                [resourceType]: state.resources[resourceType] + amount
            }
        }));
        
        showMessage(`+${amount} ${this.getResourceName(resourceType)}を獲得！`, 'success');
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
    
    private closeMinigame() {
        this.isActive = false;
        this.currentGame = null;
        if (this.gameContainer) {
            this.gameContainer.style.display = 'none';
        }
    }
    
    // Trigger minigame randomly when collecting resources
    checkForMinigame(resourceType: string, baseAmount: number) {
        const chance = 0.1; // 10% chance
        if (Math.random() < chance && !this.isActive) {
            this.startMinigame({
                resourceType,
                baseReward: baseAmount * 10,
                difficulty: Math.min(5, gameStateManager.getState().gameYear / 100)
            });
        }
    }
}

export const resourceMinigame = new ResourceMinigameSystem();