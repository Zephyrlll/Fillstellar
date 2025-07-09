import { gameState, Achievement, CelestialBody, PlanetUserData } from './state.js';
import { saveGame } from './saveload.js';
import { showMessage } from './ui.js';

export function checkAchievements() {
    // 初期化中は実績チェックをスキップ
    if (gameState.isInitializing) {
        return;
    }
    
    gameState.achievements.forEach(achievement => {
        if (achievement.isCompleted) return;

        let currentProgress = 0;
        let shouldComplete = false;

        switch (achievement.id) {
            case 'first_star':
                // 初期恒星を除外して、プレイヤーが作成した恒星のみをカウント
                currentProgress = gameState.stars.filter(s => 
                    s.userData.type === 'star' && 
                    s.userData.name !== 'Starter Star'
                ).length;
                shouldComplete = currentProgress >= 1;
                break;

            case 'first_planet':
                currentProgress = gameState.stars.filter(s => s.userData.type === 'planet').length;
                shouldComplete = currentProgress >= 1;
                break;

            case 'population_milestone':
                currentProgress = gameState.cachedTotalPopulation || 0;
                shouldComplete = currentProgress >= 1000000;
                break;

            case 'star_collector':
                // 初期恒星を除外して、プレイヤーが作成した恒星のみをカウント
                currentProgress = gameState.stars.filter(s => 
                    s.userData.type === 'star' && 
                    s.userData.name !== 'Starter Star'
                ).length;
                shouldComplete = currentProgress >= 10;
                break;

            case 'cosmic_dust_hoarder':
                currentProgress = Math.floor(gameState.cosmicDust);
                shouldComplete = currentProgress >= 100000;
                break;

            case 'intelligent_life':
                currentProgress = gameState.stars.filter(s => 
                    s.userData.type === 'planet' && 
                    (s.userData as PlanetUserData).lifeStage === 'intelligent'
                ).length;
                shouldComplete = currentProgress >= 1;
                break;

            case 'research_complete':
                currentProgress = [
                    gameState.researchPopulationEfficiency,
                    gameState.researchResourceMultiplier,
                    gameState.researchLifeSpawnRate,
                    gameState.researchEvolutionSpeed
                ].filter(Boolean).length;
                shouldComplete = currentProgress >= 1;
                break;

            case 'time_master':
                currentProgress = Math.floor(gameState.gameYear);
                shouldComplete = currentProgress >= 100;
                break;
        }

        // プログレスを更新
        if (achievement.maxProgress) {
            achievement.progress = Math.min(currentProgress, achievement.maxProgress);
        }

        // 実績達成チェック
        if (shouldComplete && !achievement.isCompleted) {
            completeAchievement(achievement);
        }
    });
}

function completeAchievement(achievement: Achievement) {
    achievement.isCompleted = true;
    achievement.unlockedAt = Date.now();
    
    // 報酬の付与
    if (achievement.reward) {
        switch (achievement.reward.type) {
            case 'cosmicDust':
                gameState.cosmicDust += achievement.reward.amount;
                break;
            case 'energy':
                gameState.energy += achievement.reward.amount;
                break;
            case 'darkMatter':
                gameState.darkMatter += achievement.reward.amount;
                break;
            case 'thoughtPoints':
                gameState.thoughtPoints += achievement.reward.amount;
                break;
        }
    }

    // 通知表示
    showMessage(`🏆 実績解除: ${achievement.name}! 報酬: ${achievement.reward?.amount || 0} ${getResourceName(achievement.reward?.type || '')}`);
    
    // セーブ
    saveGame();
}

function getResourceName(type: string): string {
    const names: { [key: string]: string } = {
        cosmicDust: '宇宙の塵',
        energy: 'エネルギー',
        darkMatter: 'ダークマター',
        thoughtPoints: '思考ポイント'
    };
    return names[type] || type;
}

export function getAchievementProgress(): { completed: number; total: number; percentage: number } {
    const completed = gameState.achievements.filter(a => a.isCompleted).length;
    const total = gameState.achievements.length;
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { completed, total, percentage };
}

