// Production Chain Visualization UI
import { gameState } from './state.js';
import { conversionEngine } from './conversionEngine.js';
import { RESOURCE_METADATA, ResourceType } from './resourceSystem.js';
import { getResourceTier, getTierColor } from './resourceTiers.js';
export class ProductionChainUI {
    container = null;
    chainView;
    isVisible = false;
    constructor() {
        this.chainView = {
            nodes: new Map(),
            connections: []
        };
    }
    // Create the production chain UI
    createUI() {
        // Create container
        this.container = document.createElement('div');
        this.container.id = 'production-chain-view';
        this.container.className = 'production-chain-container';
        this.container.style.display = 'none';
        // Header
        const header = document.createElement('div');
        header.className = 'production-chain-header';
        header.innerHTML = `
            <h3>生産チェーン</h3>
            <button class="close-btn" id="production-chain-close-btn">×</button>
        `;
        // Content area
        const content = document.createElement('div');
        content.className = 'production-chain-content';
        // Controls
        const controls = document.createElement('div');
        controls.className = 'production-chain-controls';
        controls.innerHTML = `
            <button id="production-chain-refresh-btn">更新</button>
            <button id="production-chain-toggle-mode-btn">表示切替</button>
            <span class="efficiency-indicator">総合効率: <span id="chain-efficiency">100%</span></span>
        `;
        // Chain display area
        const chainDisplay = document.createElement('div');
        chainDisplay.id = 'chain-display';
        chainDisplay.className = 'chain-display';
        // Waste status bar
        const wasteStatus = document.createElement('div');
        wasteStatus.className = 'waste-status-bar';
        wasteStatus.innerHTML = `
            <div class="waste-label">廃棄物貯蔵: </div>
            <div class="waste-progress">
                <div id="waste-fill" class="waste-fill"></div>
                <span id="waste-percentage">0%</span>
            </div>
        `;
        // Assemble
        content.appendChild(controls);
        content.appendChild(chainDisplay);
        content.appendChild(wasteStatus);
        this.container.appendChild(header);
        this.container.appendChild(content);
        // Add to document
        document.body.appendChild(this.container);
        // Add styles
        this.addStyles();
        // Setup event listeners
        this.setupEventListeners();
    }
    setupEventListeners() {
        const closeBtn = document.getElementById('production-chain-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        const refreshBtn = document.getElementById('production-chain-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
        const toggleModeBtn = document.getElementById('production-chain-toggle-mode-btn');
        if (toggleModeBtn) {
            toggleModeBtn.addEventListener('click', () => this.toggleMode());
        }
    }
    // Add CSS styles
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .production-chain-container {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 80%;
                height: 80%;
                background: rgba(0, 0, 0, 0.95);
                border: 2px solid #333;
                border-radius: 10px;
                z-index: 10000;
                color: white;
                font-family: 'Noto Sans JP', sans-serif;
            }
            
            .production-chain-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border-bottom: 1px solid #333;
            }
            
            .production-chain-header h3 {
                margin: 0;
                font-size: 1.5em;
            }
            
            .close-btn {
                background: transparent;
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
            }
            
            .production-chain-content {
                height: calc(100% - 60px);
                display: flex;
                flex-direction: column;
                padding: 15px;
            }
            
            .production-chain-controls {
                display: flex;
                gap: 10px;
                margin-bottom: 15px;
                align-items: center;
            }
            
            .production-chain-controls button {
                padding: 5px 15px;
                background: #2a2a2a;
                border: 1px solid #555;
                color: white;
                cursor: pointer;
                border-radius: 3px;
            }
            
            .production-chain-controls button:hover {
                background: #3a3a3a;
            }
            
            .efficiency-indicator {
                margin-left: auto;
                font-size: 14px;
            }
            
            #chain-efficiency {
                color: #4CAF50;
                font-weight: bold;
            }
            
            .chain-display {
                flex: 1;
                background: #1a1a1a;
                border: 1px solid #333;
                border-radius: 5px;
                padding: 20px;
                overflow: auto;
                font-family: monospace;
            }
            
            .chain-node {
                margin: 10px 0;
                padding: 10px;
                background: #2a2a2a;
                border-radius: 5px;
                border-left: 4px solid #666;
            }
            
            .chain-node.tier-1 { border-left-color: #ffffff; }
            .chain-node.tier-2 { border-left-color: #4169e1; }
            .chain-node.tier-3 { border-left-color: #9400d3; }
            
            .chain-node.active {
                background: #2a3a2a;
                box-shadow: 0 0 5px rgba(76, 175, 80, 0.5);
            }
            
            .chain-node.bottleneck {
                background: #3a2a2a;
                box-shadow: 0 0 5px rgba(255, 193, 7, 0.5);
            }
            
            .node-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 5px;
            }
            
            .node-name {
                font-weight: bold;
                font-size: 14px;
            }
            
            .node-status {
                font-size: 12px;
                padding: 2px 8px;
                border-radius: 3px;
            }
            
            .node-status.idle { background: #555; }
            .node-status.active { background: #4CAF50; }
            .node-status.bottleneck { background: #FFC107; }
            
            .node-flow {
                font-size: 12px;
                color: #aaa;
                margin-top: 5px;
            }
            
            .flow-arrow {
                color: #666;
                margin: 0 5px;
            }
            
            .waste-status-bar {
                margin-top: 15px;
                padding: 10px;
                background: #2a2a2a;
                border-radius: 5px;
            }
            
            .waste-label {
                margin-bottom: 5px;
                font-size: 14px;
            }
            
            .waste-progress {
                position: relative;
                width: 100%;
                height: 20px;
                background: #1a1a1a;
                border-radius: 10px;
                overflow: hidden;
            }
            
            .waste-fill {
                height: 100%;
                background: linear-gradient(90deg, #4CAF50 0%, #FFC107 80%, #f44336 95%);
                transition: width 0.3s ease;
                width: 0%;
            }
            
            #waste-percentage {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                font-size: 12px;
                font-weight: bold;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            }
        `;
        document.head.appendChild(style);
    }
    // Show the production chain view
    show() {
        if (!this.container) {
            this.createUI();
        }
        this.container.style.display = 'block';
        this.isVisible = true;
        this.refresh();
    }
    // Hide the production chain view
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
        this.isVisible = false;
    }
    // Toggle visibility
    toggle() {
        if (this.isVisible) {
            this.hide();
        }
        else {
            this.show();
        }
    }
    // Refresh the chain view
    refresh() {
        if (!this.isVisible)
            return;
        this.buildChainData();
        this.renderChain();
        this.updateWasteStatus();
        this.updateEfficiency();
    }
    // Build the chain data from current game state
    buildChainData() {
        this.chainView.nodes.clear();
        this.chainView.connections = [];
        // Add resource nodes
        const resources = Object.keys(gameState.resources);
        resources.forEach(key => {
            const amount = gameState.resources[key];
            if (amount > 0) {
                const resourceType = this.getResourceTypeFromKey(key);
                if (resourceType) {
                    const metadata = RESOURCE_METADATA[resourceType];
                    const tier = getResourceTier(resourceType);
                    this.chainView.nodes.set(resourceType, {
                        id: resourceType,
                        type: 'resource',
                        name: metadata.name,
                        tier: tier,
                        outputs: []
                    });
                }
            }
        });
        // Add advanced resources
        if (gameState.advancedResources) {
            Object.entries(gameState.advancedResources).forEach(([type, storage]) => {
                if (storage.amount > 0) {
                    const metadata = RESOURCE_METADATA[type];
                    if (metadata) {
                        const tier = getResourceTier(type);
                        this.chainView.nodes.set(type, {
                            id: type,
                            type: 'resource',
                            name: metadata.name,
                            tier: tier,
                            outputs: []
                        });
                    }
                }
            });
        }
        // Add active conversions and their recipes
        const activeConversions = conversionEngine.getActiveConversions();
        activeConversions.forEach(conversion => {
            const recipe = conversion.recipe;
            // Add recipe node
            const recipeNode = {
                id: recipe.id,
                type: 'recipe',
                name: recipe.name,
                inputs: recipe.inputs.resources.map(r => r.type),
                outputs: recipe.outputs.resources.map(r => r.type),
                efficiency: conversion.facility?.efficiency || 1.0,
                status: 'active'
            };
            this.chainView.nodes.set(recipe.id, recipeNode);
            // Add connections
            recipe.inputs.resources.forEach(input => {
                this.chainView.connections.push({
                    from: input.type,
                    to: recipe.id,
                    amount: input.amount
                });
            });
            recipe.outputs.resources.forEach(output => {
                this.chainView.connections.push({
                    from: recipe.id,
                    to: output.type,
                    amount: output.amount
                });
            });
            // Add byproducts
            if (recipe.byproducts) {
                recipe.byproducts.forEach(byproduct => {
                    this.chainView.connections.push({
                        from: recipe.id,
                        to: byproduct.type,
                        amount: byproduct.amount
                    });
                });
            }
            // Add waste
            if (recipe.waste) {
                this.chainView.connections.push({
                    from: recipe.id,
                    to: recipe.waste.type,
                    amount: recipe.waste.amount
                });
            }
        });
    }
    // Convert game state key to ResourceType
    getResourceTypeFromKey(key) {
        const mapping = {
            'cosmicDust': ResourceType.COSMIC_DUST,
            'energy': ResourceType.ENERGY,
            'organicMatter': ResourceType.ORGANIC_MATTER,
            'biomass': ResourceType.BIOMASS,
            'darkMatter': ResourceType.DARK_MATTER,
            'thoughtPoints': ResourceType.THOUGHT_POINTS
        };
        return mapping[key] || null;
    }
    // Render the chain
    renderChain() {
        const display = document.getElementById('chain-display');
        if (!display)
            return;
        let html = '';
        // Group nodes by type
        const resourceNodes = Array.from(this.chainView.nodes.values()).filter(n => n.type === 'resource');
        const recipeNodes = Array.from(this.chainView.nodes.values()).filter(n => n.type === 'recipe');
        // Render active recipes
        if (recipeNodes.length > 0) {
            html += '<div class="chain-section"><h4>アクティブな生産:</h4>';
            recipeNodes.forEach(node => {
                const tierClass = node.tier ? `tier-${node.tier}` : '';
                const statusClass = node.status || 'idle';
                html += `
                    <div class="chain-node ${tierClass} ${statusClass}">
                        <div class="node-header">
                            <span class="node-name">${node.name}</span>
                            <span class="node-status ${statusClass}">${this.getStatusText(statusClass)}</span>
                        </div>
                        <div class="node-flow">
                            ${this.renderNodeFlow(node)}
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        // Render resource summary
        html += '<div class="chain-section"><h4>資源の流れ:</h4>';
        html += this.renderResourceFlow();
        html += '</div>';
        display.innerHTML = html;
    }
    // Render node flow
    renderNodeFlow(node) {
        let flow = '';
        if (node.inputs && node.inputs.length > 0) {
            const inputNames = node.inputs.map(id => {
                const resourceNode = this.chainView.nodes.get(id);
                return resourceNode ? resourceNode.name : id;
            }).join(' + ');
            flow += inputNames;
        }
        flow += ' <span class="flow-arrow">→</span> ';
        if (node.outputs && node.outputs.length > 0) {
            const outputNames = node.outputs.map(id => {
                const resourceNode = this.chainView.nodes.get(id);
                return resourceNode ? resourceNode.name : id;
            }).join(' + ');
            flow += outputNames;
        }
        if (node.efficiency && node.efficiency !== 1.0) {
            flow += ` <span style="color: #FFC107">(効率: ${Math.round(node.efficiency * 100)}%)</span>`;
        }
        return flow;
    }
    // Render resource flow summary
    renderResourceFlow() {
        let html = '<div style="font-size: 12px; line-height: 1.8;">';
        // Calculate net resource flow
        const resourceFlow = new Map();
        this.chainView.connections.forEach(conn => {
            const fromNode = this.chainView.nodes.get(conn.from);
            const toNode = this.chainView.nodes.get(conn.to);
            if (fromNode?.type === 'recipe' && toNode?.type === 'resource') {
                // Production
                const current = resourceFlow.get(conn.to) || 0;
                resourceFlow.set(conn.to, current + (conn.amount || 0));
            }
            else if (fromNode?.type === 'resource' && toNode?.type === 'recipe') {
                // Consumption
                const current = resourceFlow.get(conn.from) || 0;
                resourceFlow.set(conn.from, current - (conn.amount || 0));
            }
        });
        resourceFlow.forEach((flow, resourceId) => {
            const node = this.chainView.nodes.get(resourceId);
            if (node) {
                const flowClass = flow > 0 ? 'positive' : flow < 0 ? 'negative' : 'neutral';
                const flowText = flow > 0 ? `+${flow}` : `${flow}`;
                const tierColor = node.tier ? getTierColor(node.tier) : '#666';
                html += `
                    <div style="margin: 2px 0;">
                        <span style="color: ${tierColor}">${node.name}</span>: 
                        <span class="flow-${flowClass}" style="color: ${flow > 0 ? '#4CAF50' : '#f44336'}">${flowText}/分</span>
                    </div>
                `;
            }
        });
        html += '</div>';
        return html;
    }
    // Get status text
    getStatusText(status) {
        const statusMap = {
            'idle': '待機中',
            'active': '稼働中',
            'bottleneck': 'ボトルネック'
        };
        return statusMap[status] || status;
    }
    // Update waste status
    updateWasteStatus() {
        const wasteStatus = conversionEngine.getWasteStatus();
        const wasteFill = document.getElementById('waste-fill');
        const wastePercentage = document.getElementById('waste-percentage');
        if (wasteFill && wastePercentage) {
            wasteFill.style.width = `${wasteStatus.percentage}%`;
            wastePercentage.textContent = `${Math.round(wasteStatus.percentage)}%`;
            // Change color based on percentage
            if (wasteStatus.percentage > 95) {
                wastePercentage.style.color = '#f44336';
            }
            else if (wasteStatus.percentage > 80) {
                wastePercentage.style.color = '#FFC107';
            }
            else {
                wastePercentage.style.color = '#4CAF50';
            }
        }
    }
    // Update overall efficiency
    updateEfficiency() {
        const efficiencySpan = document.getElementById('chain-efficiency');
        if (!efficiencySpan)
            return;
        // Calculate average facility efficiency
        const facilities = conversionEngine.getAllFacilities();
        if (facilities.length === 0) {
            efficiencySpan.textContent = '100%';
            return;
        }
        const totalEfficiency = facilities.reduce((sum, facility) => sum + facility.efficiency, 0);
        const avgEfficiency = totalEfficiency / facilities.length;
        efficiencySpan.textContent = `${Math.round(avgEfficiency * 100)}%`;
        // Color based on efficiency
        if (avgEfficiency < 0.5) {
            efficiencySpan.style.color = '#f44336';
        }
        else if (avgEfficiency < 0.8) {
            efficiencySpan.style.color = '#FFC107';
        }
        else {
            efficiencySpan.style.color = '#4CAF50';
        }
    }
    // Toggle display mode (future feature)
    toggleMode() {
        // Placeholder for future graph/text mode toggle
        this.refresh();
    }
}
// Create global instance
export const productionChainUI = new ProductionChainUI();
