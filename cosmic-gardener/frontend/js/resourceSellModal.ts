// Resource Sell Modal for Fillstellar
// Provides UI for selling resources in the market

import { gameStateManager } from './state.js';
import { ResourceType, QualityTier, RESOURCE_METADATA } from './resourceSystem.js';
import { marketSystem } from './marketSystem.js';
import { currencyManager, CurrencyType } from './currencySystem.js';
import { updateUI } from './ui.js';

export interface SellModalOptions {
    resourceType?: ResourceType;
    onSellComplete?: (resourceType: ResourceType, quantity: number, earnings: number) => void;
    onClose?: () => void;
}

class ResourceSellModal {
    private modal: HTMLElement | null = null;
    private isOpen: boolean = false;
    private currentResourceType: ResourceType | null = null;
    private onSellCompleteCallback?: (resourceType: ResourceType, quantity: number, earnings: number) => void;
    private onCloseCallback?: () => void;

    constructor() {
        this.createModal();
        this.setupEventListeners();
    }

    private createModal(): void {
        console.log('[SELL_MODAL] Creating resource sell modal...');

        // Create modal container
        this.modal = document.createElement('div');
        this.modal.id = 'resource-sell-modal';
        this.modal.className = 'modal-overlay';
        this.modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            backdrop-filter: blur(5px);
        `;

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 2px solid #4a90e2;
            border-radius: 15px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            color: white;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
            position: relative;
        `;

        modalContent.innerHTML = `
            <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2 style="margin: 0; color: #4a90e2; font-size: 24px;">💰 Sell Resources</h2>
                <button id="sell-modal-close" style="
                    background: none;
                    border: none;
                    color: #ff6b6b;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px;
                    border-radius: 50%;
                    width: 35px;
                    height: 35px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                " title="Close">✕</button>
            </div>

            <div class="sell-content">
                <div class="resource-selection" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 10px; color: #b8c5d1;">Select Resource:</label>
                    <select id="resource-type-select" style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #4a90e2;
                        border-radius: 8px;
                        background: #2a2a3e;
                        color: white;
                        font-size: 16px;
                    ">
                        <option value="">Choose a resource...</option>
                    </select>
                </div>

                <div id="resource-details" style="display: none;">
                    <div class="resource-info" style="
                        background: rgba(74, 144, 226, 0.1);
                        border: 1px solid #4a90e2;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                    ">
                        <div style="display: flex; align-items: center; margin-bottom: 10px;">
                            <span id="resource-icon" style="font-size: 24px; margin-right: 10px;">📦</span>
                            <div>
                                <div id="resource-name" style="font-weight: bold; font-size: 18px;">Resource Name</div>
                                <div id="resource-description" style="color: #b8c5d1; font-size: 14px;">Resource description</div>
                            </div>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Available: <span id="available-amount" style="color: #4ecdc4;">0</span></span>
                            <span>Market Price: <span id="market-price" style="color: #f39c12;">0 💰</span></span>
                        </div>
                    </div>

                    <div class="quantity-selection" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; color: #b8c5d1;">Quantity to Sell:</label>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <input type="number" id="sell-quantity" min="1" step="1" value="1" style="
                                flex: 1;
                                padding: 10px;
                                border: 1px solid #4a90e2;
                                border-radius: 8px;
                                background: #2a2a3e;
                                color: white;
                                font-size: 16px;
                            ">
                            <button id="sell-25-percent" class="quick-amount-btn" data-percent="25">25%</button>
                            <button id="sell-50-percent" class="quick-amount-btn" data-percent="50">50%</button>
                            <button id="sell-all" class="quick-amount-btn" data-percent="100">All</button>
                        </div>
                    </div>

                    <div class="quality-selection" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; color: #b8c5d1;">Quality:</label>
                        <select id="quality-select" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #4a90e2;
                            border-radius: 8px;
                            background: #2a2a3e;
                            color: white;
                            font-size: 16px;
                        ">
                            <option value="${QualityTier.POOR}">Poor (×0.5)</option>
                            <option value="${QualityTier.STANDARD}" selected>Standard (×1.0)</option>
                            <option value="${QualityTier.HIGH_QUALITY}">High Quality (×1.5)</option>
                            <option value="${QualityTier.PERFECT}">Perfect (×2.5)</option>
                            <option value="${QualityTier.LEGENDARY}">Legendary (×5.0)</option>
                        </select>
                    </div>

                    <div class="currency-selection" style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; color: #b8c5d1;">Receive Payment In:</label>
                        <select id="currency-select" style="
                            width: 100%;
                            padding: 10px;
                            border: 1px solid #4a90e2;
                            border-radius: 8px;
                            background: #2a2a3e;
                            color: white;
                            font-size: 16px;
                        ">
                            <option value="${CurrencyType.COSMIC_CREDITS}">💰 Cosmic Credits</option>
                            <option value="${CurrencyType.QUANTUM_COINS}">🪙 Quantum Coins</option>
                            <option value="${CurrencyType.STELLAR_SHARDS}">✨ Stellar Shards</option>
                            <option value="${CurrencyType.VOID_TOKENS}">⚫ Void Tokens</option>
                        </select>
                    </div>

                    <div class="transaction-preview" style="
                        background: rgba(76, 205, 196, 0.1);
                        border: 1px solid #4ecdc4;
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                    ">
                        <div style="font-weight: bold; margin-bottom: 10px; color: #4ecdc4;">Transaction Preview:</div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Selling:</span>
                            <span id="preview-quantity">0 items</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Unit Price:</span>
                            <span id="preview-unit-price">0 💰</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 18px; color: #4ecdc4; border-top: 1px solid #4ecdc4; padding-top: 10px; margin-top: 10px;">
                            <span>Total Earnings:</span>
                            <span id="preview-total">0 💰</span>
                        </div>
                    </div>

                    <div class="modal-actions" style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancel-sell" style="
                            padding: 12px 24px;
                            border: 1px solid #666;
                            border-radius: 8px;
                            background: #444;
                            color: white;
                            cursor: pointer;
                            font-size: 16px;
                        ">Cancel</button>
                        <button id="confirm-sell" style="
                            padding: 12px 24px;
                            border: none;
                            border-radius: 8px;
                            background: linear-gradient(135deg, #4ecdc4, #44a08d);
                            color: white;
                            cursor: pointer;
                            font-size: 16px;
                            font-weight: bold;
                        ">Sell Resources</button>
                    </div>
                </div>
            </div>
        `;

        // Add CSS for quick amount buttons
        const style = document.createElement('style');
        style.textContent = `
            .quick-amount-btn {
                padding: 8px 12px;
                border: 1px solid #4a90e2;
                border-radius: 6px;
                background: #2a2a3e;
                color: #4a90e2;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            .quick-amount-btn:hover {
                background: #4a90e2;
                color: white;
            }
        `;
        document.head.appendChild(style);

        this.modal.appendChild(modalContent);
        document.body.appendChild(this.modal);

        console.log('[SELL_MODAL] Resource sell modal created');
    }

    private setupEventListeners(): void {
        if (!this.modal) return;

        // Close modal events
        const closeBtn = this.modal.querySelector('#sell-modal-close') as HTMLButtonElement;
        const cancelBtn = this.modal.querySelector('#cancel-sell') as HTMLButtonElement;
        
        closeBtn?.addEventListener('click', () => this.close());
        cancelBtn?.addEventListener('click', () => this.close());
        
        // Close on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Resource selection
        const resourceSelect = this.modal.querySelector('#resource-type-select') as HTMLSelectElement;
        resourceSelect?.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            // Convert string key to ResourceType enum value
            const resourceKey = target.value;
            const resourceType = Object.values(ResourceType).find(rt => rt === resourceKey);
            if (resourceType) {
                this.selectResource(resourceType as ResourceType);
            }
        });

        // Quantity controls
        const quantityInput = this.modal.querySelector('#sell-quantity') as HTMLInputElement;
        quantityInput?.addEventListener('input', () => this.updatePreview());

        const qualitySelect = this.modal.querySelector('#quality-select') as HTMLSelectElement;
        qualitySelect?.addEventListener('change', () => this.updatePreview());

        const currencySelect = this.modal.querySelector('#currency-select') as HTMLSelectElement;
        currencySelect?.addEventListener('change', () => this.updatePreview());

        // Quick amount buttons
        const quickBtns = this.modal.querySelectorAll('.quick-amount-btn');
        quickBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLButtonElement;
                const percent = parseInt(target.dataset.percent || '0');
                this.setQuantityPercent(percent);
            });
        });

        // Confirm sell
        const confirmBtn = this.modal.querySelector('#confirm-sell') as HTMLButtonElement;
        confirmBtn?.addEventListener('click', () => this.confirmSell());
    }

    open(options: SellModalOptions = {}): void {
        if (!this.modal) return;

        console.log('[SELL_MODAL] Opening sell modal...');
        
        this.currentResourceType = options.resourceType || null;
        this.onSellCompleteCallback = options.onSellComplete;
        this.onCloseCallback = options.onClose;

        this.populateResourceSelect();
        
        if (this.currentResourceType) {
            const resourceSelect = this.modal.querySelector('#resource-type-select') as HTMLSelectElement;
            // Ensure currentResourceType is a valid ResourceType enum value
            const validResourceType = Object.values(ResourceType).find(rt => rt === this.currentResourceType);
            if (validResourceType) {
                resourceSelect.value = validResourceType;
                this.selectResource(validResourceType as ResourceType);
            }
        }

        this.modal.style.display = 'flex';
        this.isOpen = true;
    }

    close(): void {
        if (!this.modal) return;

        console.log('[SELL_MODAL] Closing sell modal...');
        
        this.modal.style.display = 'none';
        this.isOpen = false;
        this.currentResourceType = null;

        // Hide resource details
        const detailsEl = this.modal.querySelector('#resource-details') as HTMLElement;
        detailsEl.style.display = 'none';

        // Call close callback
        if (this.onCloseCallback) {
            this.onCloseCallback();
        }
    }

    private populateResourceSelect(): void {
        const resourceSelect = this.modal?.querySelector('#resource-type-select') as HTMLSelectElement;
        if (!resourceSelect) return;

        // Clear existing options except the first one
        while (resourceSelect.children.length > 1) {
            resourceSelect.removeChild(resourceSelect.lastChild!);
        }

        // Add options for basic resources the player has
        const basicResourceTypes = [
            ResourceType.COSMIC_DUST,
            ResourceType.ENERGY,
            ResourceType.ORGANIC_MATTER,
            ResourceType.BIOMASS,
            ResourceType.DARK_MATTER,
            ResourceType.THOUGHT_POINTS
        ];
        
        const currentState = gameStateManager.getState();
        basicResourceTypes.forEach(resourceType => {
            const amount = currentState.resources[resourceType] || 0;
            if (amount > 0) {
                const metadata = RESOURCE_METADATA[resourceType];
                const option = document.createElement('option');
                option.value = resourceType;
                option.textContent = `${metadata.icon} ${metadata.name} (${Math.floor(amount).toLocaleString()})`;
                resourceSelect.appendChild(option);
            }
        });
    }

    private selectResource(resourceType: ResourceType): void {
        if (!resourceType || !this.modal) return;

        this.currentResourceType = resourceType;
        const metadata = RESOURCE_METADATA[resourceType];
        if (!metadata) return;

        // Show resource details
        const detailsEl = this.modal.querySelector('#resource-details') as HTMLElement;
        detailsEl.style.display = 'block';

        // Update resource info
        const iconEl = this.modal.querySelector('#resource-icon') as HTMLElement;
        const nameEl = this.modal.querySelector('#resource-name') as HTMLElement;
        const descEl = this.modal.querySelector('#resource-description') as HTMLElement;
        const availableEl = this.modal.querySelector('#available-amount') as HTMLElement;
        const priceEl = this.modal.querySelector('#market-price') as HTMLElement;

        iconEl.textContent = metadata.icon;
        nameEl.textContent = metadata.name;
        descEl.textContent = metadata.description;
        const currentState = gameStateManager.getState();
        availableEl.textContent = (currentState.resources[resourceType] || 0).toLocaleString();

        const marketPrice = marketSystem.getCurrentPrice(resourceType);
        priceEl.textContent = marketSystem.formatPrice(marketPrice);

        // Set max quantity
        const quantityInput = this.modal.querySelector('#sell-quantity') as HTMLInputElement;
        quantityInput.max = (currentState.resources[resourceType] || 0).toString();
        quantityInput.value = Math.min(1, currentState.resources[resourceType] || 0).toString();

        this.updatePreview();
    }

    private setQuantityPercent(percent: number): void {
        if (!this.currentResourceType || !this.modal) return;

        const currentState = gameStateManager.getState();
        const available = currentState.resources[this.currentResourceType] || 0;
        const quantity = Math.floor(available * percent / 100);
        
        const quantityInput = this.modal.querySelector('#sell-quantity') as HTMLInputElement;
        quantityInput.value = quantity.toString();
        
        this.updatePreview();
    }

    private updatePreview(): void {
        if (!this.currentResourceType || !this.modal) return;

        const quantityInput = this.modal.querySelector('#sell-quantity') as HTMLInputElement;
        const qualitySelect = this.modal.querySelector('#quality-select') as HTMLSelectElement;
        const currencySelect = this.modal.querySelector('#currency-select') as HTMLSelectElement;

        const quantity = parseInt(quantityInput.value) || 0;
        const quality = parseInt(qualitySelect.value) as QualityTier;
        const currency = currencySelect.value as CurrencyType;

        const unitPrice = marketSystem.getCurrentPrice(this.currentResourceType, quality);
        const totalPrice = currencyManager.convertResourceToCurrency(this.currentResourceType, quantity, currency);

        // Update preview elements
        const previewQuantityEl = this.modal.querySelector('#preview-quantity') as HTMLElement;
        const previewUnitPriceEl = this.modal.querySelector('#preview-unit-price') as HTMLElement;
        const previewTotalEl = this.modal.querySelector('#preview-total') as HTMLElement;

        previewQuantityEl.textContent = `${quantity.toLocaleString()} ${RESOURCE_METADATA[this.currentResourceType].name}`;
        previewUnitPriceEl.textContent = currencyManager.formatCurrency(currency, unitPrice);
        previewTotalEl.textContent = currencyManager.formatCurrency(currency, totalPrice);

        // Enable/disable sell button
        const sellBtn = this.modal.querySelector('#confirm-sell') as HTMLButtonElement;
        const currentState = gameStateManager.getState();
        const available = currentState.resources[this.currentResourceType] || 0;
        sellBtn.disabled = quantity <= 0 || quantity > available;
    }

    private confirmSell(): void {
        if (!this.currentResourceType || !this.modal) return;

        const quantityInput = this.modal.querySelector('#sell-quantity') as HTMLInputElement;
        const qualitySelect = this.modal.querySelector('#quality-select') as HTMLSelectElement;
        const currencySelect = this.modal.querySelector('#currency-select') as HTMLSelectElement;

        const quantity = parseInt(quantityInput.value) || 0;
        const quality = parseInt(qualitySelect.value) as QualityTier;
        const currency = currencySelect.value as CurrencyType;

        if (quantity <= 0) {
            alert('Please enter a valid quantity');
            return;
        }

        const currentState = gameStateManager.getState();
        const available = currentState.resources[this.currentResourceType] || 0;
        if (quantity > available) {
            alert('Insufficient resources');
            return;
        }

        // Calculate earnings
        const earnings = currencyManager.convertResourceToCurrency(this.currentResourceType, quantity, currency);

        // Perform the sale
        const success = currencyManager.sellResource(this.currentResourceType, quantity, currency);
        
        if (success) {
            console.log(`[SELL_MODAL] Successfully sold ${quantity} ${this.currentResourceType} for ${earnings} ${currency}`);
            
            // Update UI immediately after sale
            updateUI();
            
            // Call completion callback
            if (this.onSellCompleteCallback) {
                this.onSellCompleteCallback(this.currentResourceType, quantity, earnings);
            }

            // Show success message
            alert(`Successfully sold ${quantity.toLocaleString()} ${RESOURCE_METADATA[this.currentResourceType].name} for ${currencyManager.formatCurrency(currency, earnings)}`);
            
            this.close();
        } else {
            alert('Sale failed. Please try again.');
        }
    }

    isModalOpen(): boolean {
        return this.isOpen;
    }
}

// Export singleton instance
export const resourceSellModal = new ResourceSellModal();

// Export convenience function for backward compatibility
export function showResourceSellModal(options?: SellModalOptions): void {
    resourceSellModal.open(options);
}