import { GameState } from '../state.js';
import { OfflineProgress, ResourceGains, OfflineEvent, OfflineSummary, MAX_OFFLINE_TIME } from '../types/idle.js';

export class OfflineCalculator {
  private readonly MIN_OFFLINE_TIME = 1000; // 1 second minimum
  
  calculateProgress(gameState: GameState, lastSaveTime: number, currentTime: number = Date.now()): OfflineProgress {
    const duration = currentTime - lastSaveTime;
    
    // Skip if offline time is too short
    if (duration < this.MIN_OFFLINE_TIME) {
      return this.createEmptyProgress();
    }
    
    // Cap offline time at maximum
    const effectiveTime = Math.min(duration, MAX_OFFLINE_TIME);
    const cappedTime = duration > MAX_OFFLINE_TIME;
    
    console.log(`[OFFLINE] Calculating progress for ${this.formatDuration(effectiveTime)}`);
    
    // Calculate base resource gains
    const baseRates = this.calculateBaseRates(gameState);
    const resourceGains = this.calculateResourceGains(baseRates, effectiveTime);
    
    // Generate offline events
    const events = this.generateOfflineEvents(gameState, effectiveTime, resourceGains);
    
    // Apply event bonuses to resources
    const finalGains = this.applyEventBonuses(resourceGains, events);
    
    // Create summary
    const summary: OfflineSummary = {
      totalGains: finalGains,
      eventsCount: events.length,
      effectiveTime,
      cappedTime
    };
    
    return {
      duration: effectiveTime,
      resources: finalGains,
      events,
      summary
    };
  }
  
  private calculateBaseRates(gameState: GameState): ResourceGains {
    const rates: ResourceGains = {
      cosmicDust: 0,
      energy: 0,
      organicMatter: 0,
      biomass: 0,
      darkMatter: 0,
      thoughtPoints: 0
    };
    
    // Get achievement multipliers
    const multipliers = this.getAchievementMultipliers(gameState);
    
    // Base cosmic dust generation - 増加率を上げて待機時間を短縮
    rates.cosmicDust = 3 * (1 + gameState.dustUpgradeLevel * 0.5) * multipliers.dustGeneration;
    
    // Energy from stars - 生産率を上げる
    const stars = gameState.stars.filter(body => body.userData.type === 'star');
    rates.energy = stars.length * 1.0 * multipliers.energyGeneration;
    
    // Dark matter conversion
    if (gameState.darkMatterConverterLevel > 0) {
      rates.darkMatter = 0.1 * gameState.darkMatterConverterLevel * multipliers.darkMatter;
    }
    
    // Life-based resources
    const planetsWithLife = gameState.stars.filter(body => 
      body.userData.type === 'planet' && body.userData.hasLife
    );
    
    planetsWithLife.forEach(planet => {
      const lifeStage = planet.userData.lifeStage;
      switch (lifeStage) {
        case 'microbial':
          rates.organicMatter += 0.1 * multipliers.organicMatter;
          break;
        case 'plant':
          rates.organicMatter += 0.3 * multipliers.organicMatter;
          rates.biomass += 0.1 * multipliers.biomass;
          break;
        case 'animal':
          rates.biomass += 0.5 * multipliers.biomass;
          break;
        case 'intelligent':
          rates.thoughtPoints += 0.2 * multipliers.thoughtPoints;
          break;
      }
    });
    
    // Apply offline efficiency multiplier
    const offlineMultiplier = multipliers.offlineEfficiency;
    Object.keys(rates).forEach(key => {
      rates[key as keyof ResourceGains] *= offlineMultiplier;
    });
    
    return rates;
  }
  
  private getAchievementMultipliers(gameState: GameState): Record<string, number> {
    const multipliers: Record<string, number> = {
      dustGeneration: 1,
      energyGeneration: 1,
      organicMatter: 1,
      biomass: 1,
      darkMatter: 1,
      thoughtPoints: 1,
      offlineEfficiency: 1
    };
    
    // Get achievement multipliers from game state
    const achievementMultipliers = (gameState as any).achievementMultipliers || {};
    for (const [key, value] of Object.entries(achievementMultipliers)) {
      const baseKey = key.replace('_permanent', '');
      if (baseKey in multipliers) {
        multipliers[baseKey] *= value as number;
      }
    }
    
    return multipliers;
  }
  
  private calculateResourceGains(rates: ResourceGains, duration: number): ResourceGains {
    const seconds = duration / 1000;
    
    return {
      cosmicDust: Math.floor(rates.cosmicDust * seconds),
      energy: Math.floor(rates.energy * seconds),
      organicMatter: Math.floor(rates.organicMatter * seconds),
      biomass: Math.floor(rates.biomass * seconds),
      darkMatter: Math.floor(rates.darkMatter * seconds),
      thoughtPoints: Math.floor(rates.thoughtPoints * seconds)
    };
  }
  
  private generateOfflineEvents(gameState: GameState, duration: number, baseGains: ResourceGains): OfflineEvent[] {
    const events: OfflineEvent[] = [];
    const hours = duration / (1000 * 60 * 60);
    
    // Chance for star birth (1% per hour)
    const starBirthChance = 0.01 * hours;
    if (Math.random() < starBirthChance && baseGains.cosmicDust > 1000) {
      events.push({
        timestamp: Date.now() - Math.random() * duration,
        type: 'star_birth',
        description: 'A new star was born while you were away!',
        gains: {
          energy: Math.floor(baseGains.energy * 0.1)
        }
      });
    }
    
    // Chance for planet formation (2% per hour if enough resources)
    const planetChance = 0.02 * hours;
    if (Math.random() < planetChance && baseGains.cosmicDust > 500) {
      events.push({
        timestamp: Date.now() - Math.random() * duration,
        type: 'planet_formation',
        description: 'A new planet formed in your cosmic garden!',
        gains: {
          cosmicDust: -500 // Cost
        }
      });
    }
    
    // Life evolution events
    const planetsWithLife = gameState.stars.filter(body => 
      body.userData.type === 'planet' && body.userData.hasLife
    );
    
    planetsWithLife.forEach(planet => {
      const evolutionChance = 0.005 * hours; // 0.5% per hour per planet
      if (Math.random() < evolutionChance) {
        const currentStage = planet.userData.lifeStage || 'microbial';
        const nextStage = this.getNextLifeStage(currentStage);
        
        if (nextStage) {
          events.push({
            timestamp: Date.now() - Math.random() * duration,
            type: 'life_evolution',
            description: `Life evolved to ${nextStage} stage on ${planet.userData.name}!`,
            gains: this.getEvolutionBonus(nextStage)
          });
        }
      }
    });
    
    // Random resource bonus events (5% per hour)
    const bonusChance = 0.05 * hours;
    if (Math.random() < bonusChance) {
      const bonusType = this.getRandomResourceType();
      const bonusAmount = Math.floor(baseGains[bonusType] * 0.25);
      
      events.push({
        timestamp: Date.now() - Math.random() * duration,
        type: 'resource_bonus',
        description: `Cosmic anomaly granted bonus ${bonusType}!`,
        gains: {
          [bonusType]: bonusAmount
        }
      });
    }
    
    // Sort events by timestamp
    return events.sort((a, b) => a.timestamp - b.timestamp);
  }
  
  private applyEventBonuses(baseGains: ResourceGains, events: OfflineEvent[]): ResourceGains {
    const finalGains = { ...baseGains };
    
    events.forEach(event => {
      if (event.gains) {
        Object.entries(event.gains).forEach(([resource, amount]) => {
          finalGains[resource as keyof ResourceGains] += amount;
        });
      }
    });
    
    // Ensure no negative values
    Object.keys(finalGains).forEach(key => {
      finalGains[key as keyof ResourceGains] = Math.max(0, finalGains[key as keyof ResourceGains]);
    });
    
    return finalGains;
  }
  
  private getNextLifeStage(currentStage: string): string | null {
    const stages = ['microbial', 'plant', 'animal', 'intelligent'];
    const currentIndex = stages.indexOf(currentStage);
    
    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      return null;
    }
    
    return stages[currentIndex + 1];
  }
  
  private getEvolutionBonus(stage: string): Partial<ResourceGains> {
    switch (stage) {
      case 'plant':
        return { organicMatter: 100, biomass: 50 };
      case 'animal':
        return { biomass: 200, organicMatter: 50 };
      case 'intelligent':
        return { thoughtPoints: 100, energy: 100 };
      default:
        return {};
    }
  }
  
  private getRandomResourceType(): keyof ResourceGains {
    const types: (keyof ResourceGains)[] = [
      'cosmicDust', 'energy', 'organicMatter', 
      'biomass', 'darkMatter', 'thoughtPoints'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }
  
  private createEmptyProgress(): OfflineProgress {
    return {
      duration: 0,
      resources: {
        cosmicDust: 0,
        energy: 0,
        organicMatter: 0,
        biomass: 0,
        darkMatter: 0,
        thoughtPoints: 0
      },
      events: [],
      summary: {
        totalGains: {
          cosmicDust: 0,
          energy: 0,
          organicMatter: 0,
          biomass: 0,
          darkMatter: 0,
          thoughtPoints: 0
        },
        eventsCount: 0,
        effectiveTime: 0,
        cappedTime: false
      }
    };
  }
  
  private formatDuration(milliseconds: number): string {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  applyOfflineProgress(gameState: GameState, progress: OfflineProgress): void {
    // Apply resource gains
    gameState.cosmicDust += progress.resources.cosmicDust;
    gameState.energy += progress.resources.energy;
    gameState.organicMatter += progress.resources.organicMatter;
    gameState.biomass += progress.resources.biomass;
    gameState.darkMatter += progress.resources.darkMatter;
    gameState.thoughtPoints += progress.resources.thoughtPoints;
    
    // Update accumulators for smooth display
    if (gameState.resourceAccumulators) {
      gameState.resourceAccumulators.cosmicDust += progress.resources.cosmicDust;
      gameState.resourceAccumulators.energy += progress.resources.energy;
      gameState.resourceAccumulators.organicMatter += progress.resources.organicMatter;
      gameState.resourceAccumulators.biomass += progress.resources.biomass;
      gameState.resourceAccumulators.thoughtPoints += progress.resources.thoughtPoints;
      
      if (gameState.resourceAccumulators.darkMatter !== undefined) {
        gameState.resourceAccumulators.darkMatter += progress.resources.darkMatter;
      }
    }
    
    console.log('[OFFLINE] Applied offline progress:', progress.summary);
  }
  
  formatOfflineReport(progress: OfflineProgress): string {
    if (progress.duration === 0) {
      return '';
    }
    
    const duration = this.formatDuration(progress.duration);
    const gains = progress.summary.totalGains;
    
    let report = `Welcome back! You were away for ${duration}.\n\n`;
    
    // Resource gains
    report += 'Resources gained:\n';
    if (gains.cosmicDust > 0) report += `  Cosmic Dust: +${gains.cosmicDust}\n`;
    if (gains.energy > 0) report += `  Energy: +${gains.energy}\n`;
    if (gains.organicMatter > 0) report += `  Organic Matter: +${gains.organicMatter}\n`;
    if (gains.biomass > 0) report += `  Biomass: +${gains.biomass}\n`;
    if (gains.darkMatter > 0) report += `  Dark Matter: +${gains.darkMatter}\n`;
    if (gains.thoughtPoints > 0) report += `  Thought Points: +${gains.thoughtPoints}\n`;
    
    // Events
    if (progress.events.length > 0) {
      report += `\n${progress.events.length} event(s) occurred:\n`;
      progress.events.forEach(event => {
        report += `  • ${event.description}\n`;
      });
    }
    
    // Capped time warning
    if (progress.summary.cappedTime) {
      report += '\n⚠️ Offline time was capped at 12 hours maximum.';
    }
    
    return report;
  }
}