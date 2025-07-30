// Research cost multiplier configuration
// This file applies global multipliers to research costs based on tier

export interface ResearchCostMultiplier {
  tier1: number;  // Basic research
  tier2: number;  // Intermediate research
  tier3: number;  // Advanced research
  tier4: number;  // Expert research
  tier5: number;  // Ultimate research
}

export const researchCostMultipliers: ResearchCostMultiplier = {
  tier1: 0.5,   // 50% cost reduction
  tier2: 0.7,   // 30% cost reduction
  tier3: 1.0,   // No change
  tier4: 1.0,   // No change
  tier5: 1.0    // No change
};

// Helper function to apply cost multiplier
export function applyResearchCostMultiplier(baseCost: number, tier: keyof ResearchCostMultiplier): number {
  return Math.ceil(baseCost * researchCostMultipliers[tier]);
}

// Helper to determine research tier based on cost
export function getResearchTier(baseCost: { [key: string]: number }): keyof ResearchCostMultiplier {
  const totalCost = Object.values(baseCost).reduce((sum, cost) => sum + cost, 0);
  
  if (totalCost <= 5) return 'tier1';
  if (totalCost <= 20) return 'tier2';
  if (totalCost <= 100) return 'tier3';
  if (totalCost <= 500) return 'tier4';
  return 'tier5';
}

// Apply multiplier to research item costs
export function adjustResearchCost(cost: { [key: string]: number }): { [key: string]: number } {
  const tier = getResearchTier(cost);
  const multiplier = researchCostMultipliers[tier];
  
  const adjustedCost: { [key: string]: number } = {};
  for (const [resource, amount] of Object.entries(cost)) {
    adjustedCost[resource] = Math.ceil(amount * multiplier);
  }
  
  return adjustedCost;
}