// Production Facilities Definition
import { gameState } from './state.js';
import { conversionEngine } from './conversionEngine.js';
import { addTimelineLog } from './timeline.js';
import { showMessage } from './ui.js';
export const PRODUCTION_FACILITIES = {
    // Tier 2 Production Facilities
    'energy_stabilizer': {
        id: 'energy_stabilizer',
        name: 'エネルギー安定化装置',
        type: 'converter',
        recipes: ['energy_stabilization'],
        level: 1,
        efficiency: 1.0,
        isActive: false,
        progress: 0,
        autoMode: false
    },
    'electromagnetic_separator': {
        id: 'electromagnetic_separator',
        name: '電磁遠心分離機',
        type: 'refinery',
        recipes: ['metal_refinement'],
        level: 1,
        efficiency: 1.0,
        isActive: false,
        progress: 0,
        autoMode: false
    },
    'high_pressure_synthesizer': {
        id: 'high_pressure_synthesizer',
        name: '高圧合成炉',
        type: 'synthesizer',
        recipes: ['polymer_synthesis'],
        level: 1,
        efficiency: 1.0,
        isActive: false,
        progress: 0,
        autoMode: false
    },
    'quantum_condenser': {
        id: 'quantum_condenser',
        name: '量子凝縮器',
        type: 'synthesizer',
        recipes: ['quantum_crystallization'],
        level: 1,
        efficiency: 1.0,
        isActive: false,
        progress: 0,
        autoMode: false
    },
    // Waste Management Facilities
    'waste_storage': {
        id: 'waste_storage',
        name: '廃棄物貯蔵庫',
        type: 'converter',
        recipes: [], // No recipes, just increases storage capacity
        level: 1,
        efficiency: 1.0,
        isActive: true,
        progress: 0,
        autoMode: false
    },
    'recycling_facility': {
        id: 'recycling_facility',
        name: 'リサイクル施設',
        type: 'converter',
        recipes: ['waste_recycling'],
        level: 1,
        efficiency: 0.5, // Low efficiency initially
        isActive: false,
        progress: 0,
        autoMode: false
    }
};
export const FACILITY_COSTS = {
    'energy_stabilizer': {
        resources: [
            { type: 'cosmicDust', amount: 10000 },
            { type: 'energy', amount: 5000 },
            { type: 'processedMetal', amount: 100 }
        ],
        buildTime: 60
    },
    'electromagnetic_separator': {
        resources: [
            { type: 'cosmicDust', amount: 15000 },
            { type: 'energy', amount: 7500 },
            { type: 'processedMetal', amount: 200 }
        ],
        buildTime: 90
    },
    'high_pressure_synthesizer': {
        resources: [
            { type: 'cosmicDust', amount: 20000 },
            { type: 'energy', amount: 10000 },
            { type: 'processedMetal', amount: 300 },
            { type: 'silicon', amount: 50 }
        ],
        buildTime: 120
    },
    'quantum_condenser': {
        resources: [
            { type: 'cosmicDust', amount: 50000 },
            { type: 'energy', amount: 25000 },
            { type: 'processedMetal', amount: 500 },
            { type: 'darkMatter', amount: 1000 }
        ],
        buildTime: 180
    },
    'waste_storage': {
        resources: [
            { type: 'cosmicDust', amount: 5000 },
            { type: 'processedMetal', amount: 50 }
        ],
        buildTime: 30
    },
    'recycling_facility': {
        resources: [
            { type: 'cosmicDust', amount: 25000 },
            { type: 'energy', amount: 15000 },
            { type: 'processedMetal', amount: 400 },
            { type: 'silicon', amount: 100 }
        ],
        buildTime: 150
    }
};
// Facility effects
export const FACILITY_EFFECTS = {
    'waste_storage': (level) => {
        // Each level increases waste storage capacity by 1000
        const baseCapacity = 1000;
        const additionalCapacity = level * 1000;
        gameState.wasteStorageCapacity = baseCapacity + additionalCapacity;
    }
};
// Check if player can afford a facility
export function canAffordFacility(facilityId) {
    const cost = FACILITY_COSTS[facilityId];
    if (!cost)
        return false;
    return cost.resources.every(requirement => {
        const resourceType = requirement.type;
        let available = 0;
        // Check basic resources
        if (resourceType in gameState.resources) {
            available = gameState.resources[resourceType];
        }
        // Check advanced resources
        else if (gameState.advancedResources && gameState.advancedResources[resourceType]) {
            available = gameState.advancedResources[resourceType].amount;
        }
        return available >= requirement.amount;
    });
}
// Deduct facility cost from resources
export function payForFacility(facilityId) {
    const cost = FACILITY_COSTS[facilityId];
    if (!cost || !canAffordFacility(facilityId))
        return false;
    cost.resources.forEach(requirement => {
        const resourceType = requirement.type;
        const amount = requirement.amount;
        // Deduct from basic resources
        if (resourceType in gameState.resources) {
            gameState.resources[resourceType] -= amount;
        }
        // Deduct from advanced resources
        else if (gameState.advancedResources && gameState.advancedResources[resourceType]) {
            gameState.advancedResources[resourceType].amount -= amount;
        }
    });
    return true;
}
// Add facility to the game
export function addFacilityToGame(facilityId) {
    const facility = PRODUCTION_FACILITIES[facilityId];
    if (!facility)
        return;
    // Add to conversion engine
    conversionEngine.addFacility({ ...facility });
    // Add to available facilities
    gameState.availableFacilities.add(facilityId);
    // Apply facility effects
    if (FACILITY_EFFECTS[facilityId]) {
        FACILITY_EFFECTS[facilityId](facility.level);
    }
    // Log the addition
    addTimelineLog(`${facility.name}が建設されました！`);
    showMessage(`${facility.name}の建設が完了しました！`, 2000);
}
