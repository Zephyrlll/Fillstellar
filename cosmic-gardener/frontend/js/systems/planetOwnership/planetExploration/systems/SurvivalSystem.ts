import * as BABYLON from '@babylonjs/core';

export interface SurvivalStats {
    health: number;
    maxHealth: number;
    oxygen: number;
    maxOxygen: number;
    temperature: number;
    hunger: number;
    maxHunger: number;
}

export interface EnvironmentalFactors {
    isIndoors: boolean;
    temperature: number;
    oxygenLevel: number;
    timeOfDay: number;
    weather: 'clear' | 'foggy' | 'windy' | 'storm';
}

export class SurvivalSystem {
    private stats: SurvivalStats;
    private scene: BABYLON.Scene;
    private ui: HTMLDivElement;
    private warningShown: { [key: string]: boolean } = {};
    
    // 定数
    private readonly OXYGEN_DEPLETION_RATE = 0.5; // 毎秒の消費量
    private readonly OXYGEN_RECOVERY_RATE = 2.0; // 基地内での回復速度
    private readonly HUNGER_DEPLETION_RATE = 0.1; // 毎秒の消費量
    private readonly COLD_DAMAGE_THRESHOLD = -10; // 寒さダメージの閾値
    private readonly HEAT_DAMAGE_THRESHOLD = 40; // 暑さダメージの閾値
    
    constructor(scene: BABYLON.Scene) {
        this.scene = scene;
        this.stats = {
            health: 100,
            maxHealth: 100,
            oxygen: 100,
            maxOxygen: 100,
            temperature: 20, // 快適な温度
            hunger: 100,
            maxHunger: 100
        };
        
        this.createUI();
    }
    
    private createUI(): void {
        this.ui = document.createElement('div');
        this.ui.id = 'survivalUI';
        this.ui.style.cssText = `
            position: absolute;
            top: 60px;
            right: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px;
            font-family: Arial;
            border-radius: 5px;
            min-width: 200px;
        `;
        
        this.updateUI();
        document.body.appendChild(this.ui);
    }
    
    private updateUI(): void {
        const healthColor = this.getHealthColor(this.stats.health / this.stats.maxHealth);
        const oxygenColor = this.getOxygenColor(this.stats.oxygen / this.stats.maxOxygen);
        const hungerColor = this.getHungerColor(this.stats.hunger / this.stats.maxHunger);
        const tempColor = this.getTemperatureColor(this.stats.temperature);
        
        this.ui.innerHTML = `
            <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>❤️ 体力</span>
                    <span>${Math.floor(this.stats.health)}/${this.stats.maxHealth}</span>
                </div>
                <div style="background: #333; height: 6px; border-radius: 3px; overflow: hidden;">
                    <div style="background: ${healthColor}; height: 100%; width: ${(this.stats.health / this.stats.maxHealth) * 100}%; transition: width 0.3s;"></div>
                </div>
            </div>
            
            <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>💨 酸素</span>
                    <span>${Math.floor(this.stats.oxygen)}/${this.stats.maxOxygen}</span>
                </div>
                <div style="background: #333; height: 6px; border-radius: 3px; overflow: hidden;">
                    <div style="background: ${oxygenColor}; height: 100%; width: ${(this.stats.oxygen / this.stats.maxOxygen) * 100}%; transition: width 0.3s;"></div>
                </div>
            </div>
            
            <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>🍖 満腹度</span>
                    <span>${Math.floor(this.stats.hunger)}/${this.stats.maxHunger}</span>
                </div>
                <div style="background: #333; height: 6px; border-radius: 3px; overflow: hidden;">
                    <div style="background: ${hungerColor}; height: 100%; width: ${(this.stats.hunger / this.stats.maxHunger) * 100}%; transition: width 0.3s;"></div>
                </div>
            </div>
            
            <div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>🌡️ 体温</span>
                    <span style="color: ${tempColor};">${Math.floor(this.stats.temperature)}°C</span>
                </div>
            </div>
        `;
    }
    
    private getHealthColor(ratio: number): string {
        if (ratio > 0.6) return '#4CAF50';
        if (ratio > 0.3) return '#FFC107';
        return '#F44336';
    }
    
    private getOxygenColor(ratio: number): string {
        if (ratio > 0.6) return '#03A9F4';
        if (ratio > 0.3) return '#FFC107';
        return '#F44336';
    }
    
    private getHungerColor(ratio: number): string {
        if (ratio > 0.6) return '#8BC34A';
        if (ratio > 0.3) return '#FFC107';
        return '#FF5722';
    }
    
    private getTemperatureColor(temp: number): string {
        if (temp < this.COLD_DAMAGE_THRESHOLD) return '#03A9F4';
        if (temp > this.HEAT_DAMAGE_THRESHOLD) return '#FF5722';
        if (temp < 10 || temp > 30) return '#FFC107';
        return '#4CAF50';
    }
    
    public update(deltaTime: number, factors: EnvironmentalFactors): void {
        // 酸素の更新
        if (factors.isIndoors) {
            // 基地内では酸素が回復
            this.stats.oxygen = Math.min(
                this.stats.maxOxygen,
                this.stats.oxygen + this.OXYGEN_RECOVERY_RATE * deltaTime
            );
        } else {
            // 外では酸素が減少
            this.stats.oxygen = Math.max(
                0,
                this.stats.oxygen - this.OXYGEN_DEPLETION_RATE * deltaTime
            );
            
            // 酸素不足によるダメージ
            if (this.stats.oxygen <= 0) {
                this.takeDamage(2 * deltaTime, '酸素不足');
            } else if (this.stats.oxygen < 20) {
                this.showWarning('oxygen', '⚠️ 酸素残量が少なくなっています！');
            }
        }
        
        // 満腹度の更新
        this.stats.hunger = Math.max(
            0,
            this.stats.hunger - this.HUNGER_DEPLETION_RATE * deltaTime
        );
        
        // 空腹によるダメージ
        if (this.stats.hunger <= 0) {
            this.takeDamage(1 * deltaTime, '空腹');
        } else if (this.stats.hunger < 20) {
            this.showWarning('hunger', '⚠️ お腹が空いています！');
        }
        
        // 体温の更新
        this.updateTemperature(deltaTime, factors);
        
        // 温度によるダメージ
        if (this.stats.temperature < this.COLD_DAMAGE_THRESHOLD) {
            this.takeDamage(1.5 * deltaTime, '低体温症');
        } else if (this.stats.temperature > this.HEAT_DAMAGE_THRESHOLD) {
            this.takeDamage(1.5 * deltaTime, '熱中症');
        }
        
        // 天候によるダメージ
        if (!factors.isIndoors && factors.weather === 'storm') {
            this.takeDamage(0.5 * deltaTime, '嵐');
        }
        
        // UI更新（0.1秒ごと）
        if (Math.floor(Date.now() / 100) % 1 === 0) {
            this.updateUI();
        }
    }
    
    private updateTemperature(deltaTime: number, factors: EnvironmentalFactors): void {
        let targetTemp = factors.temperature;
        
        // 室内では快適な温度に調整
        if (factors.isIndoors) {
            targetTemp = 22;
        } else {
            // 時間帯による温度調整
            const hour = factors.timeOfDay;
            if (hour >= 0 && hour < 6) {
                targetTemp -= 10; // 夜は寒い
            } else if (hour >= 12 && hour < 16) {
                targetTemp += 10; // 昼は暑い
            }
            
            // 天候による温度調整
            switch (factors.weather) {
                case 'storm':
                    targetTemp -= 5;
                    break;
                case 'windy':
                    targetTemp -= 3;
                    break;
                case 'foggy':
                    targetTemp -= 2;
                    break;
            }
        }
        
        // 徐々に目標温度に近づく
        const tempDiff = targetTemp - this.stats.temperature;
        this.stats.temperature += tempDiff * 0.1 * deltaTime;
    }
    
    private takeDamage(amount: number, source: string): void {
        this.stats.health = Math.max(0, this.stats.health - amount);
        
        if (this.stats.health <= 0) {
            this.onDeath();
        } else if (this.stats.health < 20) {
            this.showWarning('health', '⚠️ 体力が危険な状態です！');
        }
    }
    
    private showWarning(type: string, message: string): void {
        if (!this.warningShown[type]) {
            this.warningShown[type] = true;
            
            const warning = document.createElement('div');
            warning.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(255, 0, 0, 0.9);
                color: white;
                padding: 20px 30px;
                border-radius: 10px;
                font-size: 18px;
                font-weight: bold;
                z-index: 10000;
                animation: pulse 0.5s ease-in-out 3;
            `;
            warning.textContent = message;
            document.body.appendChild(warning);
            
            // アニメーション用CSS
            if (!document.getElementById('survivalWarningStyle')) {
                const style = document.createElement('style');
                style.id = 'survivalWarningStyle';
                style.textContent = `
                    @keyframes pulse {
                        0% { transform: translate(-50%, -50%) scale(1); }
                        50% { transform: translate(-50%, -50%) scale(1.1); }
                        100% { transform: translate(-50%, -50%) scale(1); }
                    }
                `;
                document.head.appendChild(style);
            }
            
            setTimeout(() => {
                warning.remove();
                setTimeout(() => {
                    delete this.warningShown[type];
                }, 10000); // 10秒後に再度警告可能に
            }, 3000);
        }
    }
    
    private onDeath(): void {
        console.log('[SURVIVAL] Player died!');
        
        // 死亡画面を表示
        const deathScreen = document.createElement('div');
        deathScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 100000;
        `;
        deathScreen.innerHTML = `
            <h1 style="font-size: 48px; margin-bottom: 20px;">ミッション失敗</h1>
            <p style="font-size: 20px; margin-bottom: 40px;">あなたは惑星探査中に命を落としました</p>
            <button onclick="location.reload()" style="
                background: #F44336;
                color: white;
                border: none;
                padding: 15px 30px;
                font-size: 18px;
                border-radius: 5px;
                cursor: pointer;
            ">リスタート</button>
        `;
        document.body.appendChild(deathScreen);
    }
    
    // 回復メソッド
    public heal(amount: number): void {
        this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
    }
    
    public restoreOxygen(amount: number): void {
        this.stats.oxygen = Math.min(this.stats.maxOxygen, this.stats.oxygen + amount);
    }
    
    public eat(amount: number): void {
        this.stats.hunger = Math.min(this.stats.maxHunger, this.stats.hunger + amount);
    }
    
    // ゲッター
    public getStats(): SurvivalStats {
        return { ...this.stats };
    }
    
    public isAlive(): boolean {
        return this.stats.health > 0;
    }
    
    public getNeedsAttention(): string[] {
        const needs: string[] = [];
        
        if (this.stats.health < 30) needs.push('health');
        if (this.stats.oxygen < 30) needs.push('oxygen');
        if (this.stats.hunger < 30) needs.push('hunger');
        if (this.stats.temperature < 10 || this.stats.temperature > 30) needs.push('temperature');
        
        return needs;
    }
    
    // セーブ/ロード
    public save(): any {
        return {
            stats: { ...this.stats }
        };
    }
    
    public load(data: any): void {
        if (data && data.stats) {
            this.stats = { ...data.stats };
            this.updateUI();
        }
    }
    
    public dispose(): void {
        if (this.ui && this.ui.parentNode) {
            this.ui.parentNode.removeChild(this.ui);
        }
    }
}