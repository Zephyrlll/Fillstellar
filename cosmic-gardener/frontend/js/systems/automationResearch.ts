/**
 * Automation Research Tree
 * 自動化研究ツリー
 */

import { AutomationResearch, AutomationType, ConditionType } from '../types/automation.js';
import { ResearchItem } from '../types/research.js';

// 自動化研究を通常の研究形式に変換
export function convertToResearchItem(autoResearch: AutomationResearch): ResearchItem {
  try {
    return {
      id: autoResearch.id,
      name: autoResearch.name,
      description: autoResearch.description,
      icon: autoResearch.icon || '🤖',
      cost: autoResearch.cost,
      duration: autoResearch.duration, // This is optional in ResearchItem
      category: 'automation',
      requirements: autoResearch.prerequisites || [], // Map prerequisites to requirements with fallback
      unlocks: [], // Automation research doesn't directly unlock other research
      effects: [
        {
          type: 'unlock_feature', // Use existing effect type
          value: `automation_${autoResearch.id}`,
          customEffect: () => {
            // 自動化効果を適用（automationManagerで処理）
            console.log(`[AUTOMATION-RESEARCH] Applying effects for ${autoResearch.id}`);
            applyAutomationResearchEffect(autoResearch.id);
          }
        }
      ]
    };
  } catch (error) {
    console.error('[AUTOMATION-RESEARCH] Failed to convert research item:', autoResearch.id, error);
    // Return a minimal valid ResearchItem on error
    return {
      id: autoResearch.id,
      name: autoResearch.name || 'Unknown Research',
      description: autoResearch.description || '',
      category: 'automation',
      cost: {},
      requirements: [],
      unlocks: [],
      effects: []
    };
  }
}

// 自動化研究定義
export const automationResearchItems: AutomationResearch[] = [
  // === 基礎自動化 ===
  {
    id: 'auto_basics',
    name: '基礎自動化',
    description: '基本的な自動化機能をアンロックします',
    icon: '🤖',
    cost: { thoughtPoints: 100 },
    duration: 30,
    prerequisites: [],
    effects: {
      unlockFeature: AutomationType.CELESTIAL_CREATION,
      additionalOptions: ['basic_automation_ui']
    }
  },
  
  // === 天体作成自動化 ===
  {
    id: 'auto_celestial_advanced',
    name: '高度な天体作成',
    description: '複数の条件を組み合わせた天体作成が可能になります',
    icon: '🌟',
    cost: { thoughtPoints: 200, energy: 1000 },
    duration: 60,
    prerequisites: ['auto_basics'],
    effects: {
      newConditionTypes: [ConditionType.SPACE_DENSITY, ConditionType.TIME_ELAPSED],
      additionalOptions: ['multiple_conditions']
    }
  },
  
  {
    id: 'auto_celestial_efficiency',
    name: '効率的な天体配置',
    description: '天体作成の間隔を20%短縮し、配置を最適化します',
    icon: '⚡',
    cost: { thoughtPoints: 300, cosmicDust: 5000 },
    duration: 90,
    prerequisites: ['auto_celestial_advanced'],
    effects: {
      efficiencyBonus: {
        intervalMultiplier: 0.8
      },
      additionalOptions: ['smart_positioning']
    }
  },
  
  // === 資源変換自動化 ===
  {
    id: 'auto_resource_balancing',
    name: '資源バランシング',
    description: '資源の自動変換機能をアンロックします',
    icon: '⚖️',
    cost: { thoughtPoints: 150, energy: 500 },
    duration: 45,
    prerequisites: ['auto_basics'],
    effects: {
      unlockFeature: AutomationType.RESOURCE_CONVERSION,
      additionalOptions: ['resource_targets']
    }
  },
  
  {
    id: 'auto_resource_optimization',
    name: '変換最適化',
    description: '資源変換の効率を30%向上させます',
    icon: '📊',
    cost: { thoughtPoints: 400, organicMatter: 1000 },
    duration: 120,
    prerequisites: ['auto_resource_balancing'],
    effects: {
      efficiencyBonus: {
        resourceEfficiency: 1.3
      }
    }
  },
  
  // === 研究自動化 ===
  {
    id: 'auto_research_queue',
    name: '研究キューシステム',
    description: '研究を自動的に進行させるキューシステムをアンロックします',
    icon: '🔬',
    cost: { thoughtPoints: 250 },
    duration: 60,
    prerequisites: ['auto_basics'],
    effects: {
      unlockFeature: AutomationType.RESEARCH_PROGRESSION,
      additionalOptions: ['research_queue_ui']
    }
  },
  
  {
    id: 'auto_research_suggestions',
    name: 'AI研究アシスタント',
    description: 'AIが最適な研究を自動的に提案・追加します',
    icon: '🧠',
    cost: { thoughtPoints: 500, scientificThoughts: 100 },
    duration: 150,
    prerequisites: ['auto_research_queue'],
    effects: {
      additionalOptions: ['auto_suggestions']
    }
  },
  
  // === 並列処理 ===
  {
    id: 'auto_parallel_processing',
    name: '並列処理',
    description: '複数の自動化タスクを同時に実行できるようになります',
    icon: '🔀',
    cost: { thoughtPoints: 600, energy: 3000 },
    duration: 180,
    prerequisites: ['auto_celestial_efficiency', 'auto_resource_optimization', 'auto_research_suggestions'],
    effects: {
      efficiencyBonus: {
        maxParallelTasks: 3
      }
    }
  },
  
  // === マスター自動化 ===
  {
    id: 'auto_master_control',
    name: 'マスター自動化制御',
    description: 'すべての自動化システムの効率を50%向上させます',
    icon: '👑',
    cost: { thoughtPoints: 1000, energy: 10000, darkMatter: 100 },
    duration: 300,
    prerequisites: ['auto_parallel_processing'],
    effects: {
      efficiencyBonus: {
        intervalMultiplier: 0.5,
        conditionCheckSpeed: 2.0,
        resourceEfficiency: 1.5
      }
    }
  }
];

// 研究効果適用関数
export function applyAutomationResearchEffect(researchId: string): void {
  try {
    const research = automationResearchItems.find(r => r.id === researchId);
    if (!research) {
      console.warn('[AUTOMATION-RESEARCH] Research not found:', researchId);
      return;
    }
    
    // Unlock corresponding automation features through unlockManager
    const unlockManager = (window as any).unlockManager;
    if (unlockManager) {
      switch (researchId) {
        case 'auto_basics':
          // Unlock celestial automation with basic automation
          setTimeout(() => {
            unlockManager.unlock('automation_celestial');
          }, 100);
          break;
        case 'auto_resource_balancing':
          setTimeout(() => {
            unlockManager.unlock('automation_resource');
          }, 100);
          break;
        case 'auto_research_queue':
          setTimeout(() => {
            unlockManager.unlock('automation_research');
          }, 100);
          break;
      }
    }
    
    // automationManagerをインポートして効果を適用
    import('./automationManager.js').then(({ automationManager }) => {
      try {
        const effects = research.effects;
        
        // 機能アンロック
        if (effects.unlockFeature) {
          switch (effects.unlockFeature) {
            case AutomationType.CELESTIAL_CREATION:
              automationManager.updateState({
                celestialAutoCreate: {
                  ...automationManager.getState().celestialAutoCreate,
                  enabled: true
                }
              });
              console.log('[AUTOMATION-RESEARCH] Enabled celestial auto-creation');
              break;
              
            case AutomationType.RESOURCE_CONVERSION:
              automationManager.updateState({
                resourceBalancer: {
                  ...automationManager.getState().resourceBalancer,
                  enabled: true
                }
              });
              console.log('[AUTOMATION-RESEARCH] Enabled resource balancing');
              break;
              
            case AutomationType.RESEARCH_PROGRESSION:
              automationManager.updateState({
                researchQueue: {
                  ...automationManager.getState().researchQueue,
                  enabled: true
                }
              });
              console.log('[AUTOMATION-RESEARCH] Enabled research queue');
              break;
          }
        }
        
        // 効率ボーナス
        if (effects.efficiencyBonus) {
          automationManager.applyEfficiencyUpgrade(effects.efficiencyBonus);
          console.log('[AUTOMATION-RESEARCH] Applied efficiency bonus:', effects.efficiencyBonus);
        }
        
        // 追加オプション
        if (effects.additionalOptions) {
          console.log(`[AUTOMATION-RESEARCH] Unlocked options:`, effects.additionalOptions);
          // UIで処理される
        }
        
        // 新しい条件タイプ
        if (effects.newConditionTypes) {
          console.log(`[AUTOMATION-RESEARCH] Unlocked condition types:`, effects.newConditionTypes);
          // UIで処理される
        }
      } catch (error) {
        console.error('[AUTOMATION-RESEARCH] Failed to apply research effects:', error);
      }
    }).catch(error => {
      console.error('[AUTOMATION-RESEARCH] Failed to import automation manager:', error);
    });
  } catch (error) {
    console.error('[AUTOMATION-RESEARCH] Failed to apply automation research effect:', error);
  }
}