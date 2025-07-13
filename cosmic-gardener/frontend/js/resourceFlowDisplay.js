// Resource Flow Display - Real-time resource change visualization
import { ResourceType } from './resourceSystem.js';
import { CONVERSION_RECIPES } from './conversionRecipes.js';
import { gameState } from './state.js';
export class ResourceFlowDisplay {
    constructor() {
        this.activeFlows = new Map();
        this.displayContainer = null;
        this.updateInterval = 100; // Update every 100ms for smooth display
        this.intervalId = null;
        this.displayContainer = document.getElementById('active-flows-container');
        this.startDisplayLoop();
    }
    /**
     * Add a new conversion to track
     */
    addConversion(conversionId, recipeId, duration) {
        const recipe = CONVERSION_RECIPES[recipeId];
        if (!recipe)
            return;
        const flows = [];
        const currentTime = Date.now();
        // Add input flows (consumption)
        recipe.inputs.resources.forEach(input => {
            flows.push({
                type: input.type,
                amount: input.amount,
                rate: input.amount / (duration / 1000), // per second
                isInput: true,
                conversionId,
                startTime: currentTime
            });
        });
        // Add output flows (production)
        recipe.outputs.primary.resources.forEach(output => {
            flows.push({
                type: output.type,
                amount: output.amount,
                rate: output.amount / (duration / 1000), // per second
                isInput: false,
                conversionId,
                startTime: currentTime
            });
        });
        this.activeFlows.set(conversionId, flows);
        this.updateDisplay();
    }
    /**
     * Remove a conversion when it's completed
     */
    removeConversion(conversionId) {
        this.activeFlows.delete(conversionId);
        this.updateDisplay();
    }
    /**
     * Start the display update loop
     */
    startDisplayLoop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
        this.intervalId = setInterval(() => {
            this.updateDisplay();
        }, this.updateInterval);
    }
    /**
     * Update the visual display
     */
    updateDisplay() {
        if (!this.displayContainer)
            return;
        // Clear existing content
        this.displayContainer.innerHTML = '';
        if (this.activeFlows.size === 0) {
            this.displayContainer.innerHTML = `
                <div class="no-active-flows">
                    <p>💤 現在アクティブな変換はありません</p>
                    <p style="font-size: 0.8em; color: #888;">変換を開始するとここにリアルタイムでリソースの変動が表示されます</p>
                </div>
            `;
            return;
        }
        // Group flows by resource type for cleaner display
        const resourceFlows = new Map();
        // Process all active flows
        this.activeFlows.forEach((flows) => {
            flows.forEach(flow => {
                if (!resourceFlows.has(flow.type)) {
                    resourceFlows.set(flow.type, { consuming: [], producing: [] });
                }
                const resourceGroup = resourceFlows.get(flow.type);
                if (flow.isInput) {
                    resourceGroup.consuming.push(flow);
                }
                else {
                    resourceGroup.producing.push(flow);
                }
            });
        });
        // Render each resource type
        resourceFlows.forEach((flows, resourceType) => {
            this.renderResourceFlow(resourceType, flows);
        });
    }
    /**
     * Render a single resource flow item
     */
    renderResourceFlow(resourceType, flows) {
        if (!this.displayContainer)
            return;
        const resourceName = this.getResourceDisplayName(resourceType);
        const currentAmount = this.getCurrentResourceAmount(resourceType);
        // Calculate total rates
        const totalConsumingRate = flows.consuming.reduce((sum, flow) => sum + flow.rate, 0);
        const totalProducingRate = flows.producing.reduce((sum, flow) => sum + flow.rate, 0);
        const netRate = totalProducingRate - totalConsumingRate;
        // Create flow item element
        const flowItem = document.createElement('div');
        flowItem.className = `resource-flow-item ${netRate >= 0 ? 'producing' : 'consuming'}`;
        flowItem.innerHTML = `
            <div class="flow-resource-info">
                <div class="resource-name">${resourceName}</div>
                <div class="current-amount">現在: ${this.formatNumber(currentAmount)}</div>
            </div>
            
            <div class="flow-arrow">
                ${netRate >= 0 ? '📈' : '📉'}
            </div>
            
            <div class="flow-rate-info">
                <div class="flow-rate ${netRate >= 0 ? 'positive' : 'negative'}">
                    ${netRate >= 0 ? '+' : ''}${this.formatNumber(netRate)}/秒
                </div>
                ${this.renderDetailedRates(flows)}
            </div>
        `;
        this.displayContainer.appendChild(flowItem);
    }
    /**
     * Render detailed rates breakdown
     */
    renderDetailedRates(flows) {
        let html = '<div class="rate-breakdown">';
        if (flows.consuming.length > 0) {
            html += `<div class="consuming-rate">消費: -${this.formatNumber(flows.consuming.reduce((sum, flow) => sum + flow.rate, 0))}/秒</div>`;
        }
        if (flows.producing.length > 0) {
            html += `<div class="producing-rate">生産: +${this.formatNumber(flows.producing.reduce((sum, flow) => sum + flow.rate, 0))}/秒</div>`;
        }
        html += '</div>';
        return html;
    }
    /**
     * Get display name for resource type
     */
    getResourceDisplayName(type) {
        const names = {
            [ResourceType.COSMIC_DUST]: '宇宙の塵',
            [ResourceType.ENERGY]: 'エネルギー',
            [ResourceType.ORGANIC_MATTER]: '有機物',
            [ResourceType.BIOMASS]: 'バイオマス',
            [ResourceType.DARK_MATTER]: 'ダークマター',
            [ResourceType.THOUGHT_POINTS]: '思考ポイント',
            // Add more as needed
        };
        return names[type] || type;
    }
    /**
     * Get current amount of a resource
     */
    getCurrentResourceAmount(type) {
        switch (type) {
            case ResourceType.COSMIC_DUST:
                return gameState.resources.cosmicDust || 0;
            case ResourceType.ENERGY:
                return gameState.resources.energy || 0;
            case ResourceType.ORGANIC_MATTER:
                return gameState.resources.organicMatter || 0;
            case ResourceType.BIOMASS:
                return gameState.resources.biomass || 0;
            case ResourceType.DARK_MATTER:
                return gameState.resources.darkMatter || 0;
            case ResourceType.THOUGHT_POINTS:
                return gameState.resources.thoughtPoints || 0;
            default:
                return 0;
        }
    }
    /**
     * Format numbers for display
     */
    formatNumber(value) {
        if (value >= 1000000) {
            return (value / 1000000).toFixed(2) + 'M';
        }
        else if (value >= 1000) {
            return (value / 1000).toFixed(2) + 'K';
        }
        else {
            return value.toFixed(2);
        }
    }
    /**
     * Cleanup when not needed
     */
    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
// Global instance
export const resourceFlowDisplay = new ResourceFlowDisplay();
