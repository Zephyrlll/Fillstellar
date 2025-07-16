// Advanced Resource Sell Modal System
import { currencyManager, formatCurrency } from './currencySystem.js';
import { marketSystem } from './marketSystem.js';
import { gameState } from './state.js';
import { showMessage } from './ui.js';
// Show resource sell modal
export function showResourceSellModal() {
    console.log('💰 Opening resource sell modal...');
    // Create modal if it doesn't exist
    let modal = document.getElementById('resourceSellModal');
    if (!modal) {
        modal = createResourceSellModal();
        document.body.appendChild(modal);
    }
    // Update modal content with current resources
    updateModalContent(modal);
    // Show modal
    modal.style.display = 'flex';
}
// Create the modal HTML structure
function createResourceSellModal() {
    const modal = document.createElement('div');
    modal.id = 'resourceSellModal';
    modal.className = 'resource-sell-modal';
    modal.innerHTML = `
        <div class="resource-sell-modal-content">
            <div class="resource-sell-modal-header">
                <h3>📈 銀河間取引所</h3>
                <button class="resource-sell-modal-close" onclick="closeResourceSellModal()">&times;</button>
            </div>
            <div class="resource-sell-modal-body">
                <div class="market-info-section">
                    <h4>🌟 市場情報</h4>
                    <div id="marketEventsDisplay"></div>
                </div>
                
                <div class="currency-display">
                    <h4>💰 現在の通貨</h4>
                    <div id="currencyDisplayGrid"></div>
                </div>
                
                <div class="resource-sell-section">
                    <h4>🛒 資源取引</h4>
                    <div class="market-filters">
                        <select id="resourceTypeFilter">
                            <option value="all">全ての資源</option>
                            <option value="basic">基本資源</option>
                            <option value="advanced">高度な資源</option>
                            <option value="profitable">利益率の高い資源</option>
                        </select>
                        <button id="refreshMarketButton" class="market-btn">相場更新</button>
                    </div>
                    <div id="resourceSellList"></div>
                </div>
                
                <div class="market-summary">
                    <h4>📊 取引サマリー</h4>
                    <div id="tradingSummary"></div>
                </div>
            </div>
        </div>
    `;
    // Add click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeResourceSellModal();
        }
    });
    // Add event listeners
    modal.addEventListener('change', (e) => {
        if (e.target.id === 'resourceTypeFilter') {
            updateResourceSellList(modal);
        }
    });
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'refreshMarketButton') {
            marketSystem.update();
            updateModalContent(modal);
            showMessage('市場情報を更新しました', 2000);
        }
    });
    return modal;
}
// Update modal content with current resources and currencies
function updateModalContent(modal) {
    updateMarketEvents(modal);
    updateCurrencyDisplay(modal);
    updateResourceSellList(modal);
    updateTradingSummary(modal);
}
// Update market events display
function updateMarketEvents(modal) {
    const eventsContainer = modal.querySelector('#marketEventsDisplay');
    if (!eventsContainer)
        return;
    const activeEvents = Array.from(marketSystem.activeEvents);
    if (activeEvents.length === 0) {
        eventsContainer.innerHTML = '<p class="no-events">現在、市場イベントは発生していません</p>';
        return;
    }
    const html = activeEvents.map(event => {
        const timeLeft = Math.max(0, (event.endTime || 0) - Date.now());
        const minutesLeft = Math.floor(timeLeft / 60000);
        const secondsLeft = Math.floor((timeLeft % 60000) / 1000);
        return `
            <div class="market-event">
                <div class="event-description">${event.description}</div>
                <div class="event-timer">残り: ${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}</div>
            </div>
        `;
    }).join('');
    eventsContainer.innerHTML = html;
}
// Update currency display
function updateCurrencyDisplay(modal) {
    const currencyGrid = modal.querySelector('#currencyDisplayGrid');
    if (!currencyGrid)
        return;
    const currencies = currencyManager.getAllCurrencies();
    const html = Object.entries(currencies).map(([currencyType, amount]) => {
        const definition = currencyManager.constructor.CURRENCY_DEFINITIONS?.[currencyType];
        if (!definition)
            return '';
        return `
            <div class="currency-item">
                <span class="currency-icon">${definition.icon}</span>
                <span class="currency-name">${definition.name}</span>
                <span class="currency-amount">${formatCurrency(amount, currencyType)}</span>
            </div>
        `;
    }).join('');
    currencyGrid.innerHTML = html;
}
// Update resource sell list
function updateResourceSellList(modal) {
    const resourceList = modal.querySelector('#resourceSellList');
    if (!resourceList)
        return;
    const filterElement = modal.querySelector('#resourceTypeFilter');
    const filter = (filterElement?.value || 'all');
    const html = [];
    // Get all tradeable resources
    const allResources = [];
    // Basic resources
    const basicResources = ['cosmicDust', 'energy', 'organicMatter', 'biomass', 'darkMatter', 'thoughtPoints'];
    basicResources.forEach(resourceType => {
        const amount = gameState.resources[resourceType] || 0;
        if (amount > 0) {
            allResources.push({ type: resourceType, amount: amount, category: 'basic' });
        }
    });
    // Advanced resources
    if (gameState.advancedResources) {
        Object.entries(gameState.advancedResources).forEach(([resourceType, resourceData]) => {
            if (resourceData && resourceData.amount > 0) {
                allResources.push({
                    type: resourceType,
                    amount: resourceData.amount,
                    category: 'advanced'
                });
            }
        });
    }
    // Filter resources
    const filteredResources = allResources.filter(resource => {
        if (filter === 'all')
            return true;
        if (filter === 'basic')
            return resource.category === 'basic';
        if (filter === 'advanced')
            return resource.category === 'advanced';
        if (filter === 'profitable') {
            const marketInfo = marketSystem.getMarketInfo(resource.type);
            return marketInfo && marketInfo.priceChange > 0;
        }
        return true;
    });
    // Sort by profitability
    filteredResources.sort((a, b) => {
        const aInfo = marketSystem.getMarketInfo(a.type);
        const bInfo = marketSystem.getMarketInfo(b.type);
        if (!aInfo || !bInfo)
            return 0;
        return bInfo.currentPrice - aInfo.currentPrice;
    });
    filteredResources.forEach(resource => {
        const marketInfo = marketSystem.getMarketInfo(resource.type);
        if (!marketInfo)
            return;
        const resourceName = getResourceDisplayName(resource.type);
        const priceChangeClass = marketInfo.priceChange >= 0 ? 'price-up' : 'price-down';
        const priceChangeIcon = marketInfo.priceChange >= 0 ? '📈' : '📉';
        const trendIcon = marketInfo.trend > 0.2 ? '🔥' : marketInfo.trend < -0.2 ? '❄️' : '';
        // Calculate potential earnings for different amounts
        const maxSellable = Math.min(Math.floor(resource.amount), marketInfo.remaining);
        const amounts = [1, 10, 100, maxSellable].filter(amt => amt > 0 && amt <= maxSellable);
        html.push(`
            <div class="resource-sell-item ${resource.category}">
                <div class="resource-sell-header">
                    <div class="resource-sell-name">
                        ${resourceName} ${trendIcon}
                        <span class="resource-category">[${resource.category}]</span>
                    </div>
                    <div class="market-indicators">
                        <span class="price-change ${priceChangeClass}">
                            ${priceChangeIcon} ${marketInfo.priceChange.toFixed(1)}%
                        </span>
                    </div>
                </div>
                
                <div class="resource-sell-details">
                    <div class="resource-stats">
                        <span>所持: <strong>${Math.floor(resource.amount)}</strong></span>
                        <span>現在価格: <strong>${marketInfo.currentPrice.toFixed(2)} CD</strong></span>
                        <span>今日の限界: <strong>${marketInfo.remaining}/${marketInfo.dailyLimit}</strong></span>
                    </div>
                    
                    <div class="volatility-bar">
                        <div class="volatility-label">変動性: ${(marketInfo.volatility * 100).toFixed(0)}%</div>
                        <div class="volatility-meter">
                            <div class="volatility-fill" style="width: ${Math.min(100, marketInfo.volatility * 200)}%"></div>
                        </div>
                    </div>
                </div>
                
                <div class="resource-sell-controls">
                    <div class="quick-sell-buttons">
                        ${amounts.map(amt => `
                            <button class="quick-sell-btn" 
                                    onclick="sellResource('${resource.type}', ${amt})"
                                    ${amt > marketInfo.remaining ? 'disabled' : ''}>
                                ${amt}個
                                <small>(${(amt * marketInfo.currentPrice).toFixed(0)} CD)</small>
                            </button>
                        `).join('')}
                    </div>
                    
                    <div class="custom-sell-section">
                        <input type="number" 
                               class="resource-sell-input" 
                               id="sell-${resource.type}" 
                               min="1" 
                               max="${maxSellable}" 
                               value="1"
                               placeholder="数量">
                        <button class="resource-sell-btn" 
                                onclick="sellResource('${resource.type}', document.getElementById('sell-${resource.type}').value)">
                            カスタム販売
                        </button>
                    </div>
                    
                    <div class="market-impact-warning" style="display: none;">
                        ⚠️ 大量販売により価格が下落する可能性があります
                    </div>
                </div>
            </div>
        `);
    });
    if (html.length === 0) {
        html.push('<p class="no-resources">選択されたカテゴリに販売可能な資源がありません</p>');
    }
    resourceList.innerHTML = html.join('');
    // Add input event listeners for market impact warnings
    filteredResources.forEach(resource => {
        const input = modal.querySelector(`#sell-${resource.type}`);
        const warning = input?.parentElement?.nextElementSibling;
        if (input && warning) {
            input.addEventListener('input', () => {
                const amount = parseInt(input.value) || 0;
                const marketInfo = marketSystem.getMarketInfo(resource.type);
                const impact = marketSystem.calculateMarketImpact(resource.type, amount);
                if (impact > 0.1) { // Show warning if impact > 10%
                    warning.style.display = 'block';
                    warning.textContent = `⚠️ 価格下落予想: -${(impact * 100).toFixed(1)}%`;
                }
                else {
                    warning.style.display = 'none';
                }
            });
        }
    });
}
// Sell a specific resource using market system
export function sellResource(resourceType, amount) {
    const sellAmount = parseInt(amount.toString());
    if (!sellAmount || sellAmount <= 0) {
        showMessage('販売量を正しく入力してください', 2000);
        return;
    }
    // Use the market system for selling
    const result = marketSystem.sellResource(resourceType, sellAmount);
    if (!result.success) {
        showMessage(result.message || '販売に失敗しました', 3000);
        return;
    }
    // Show detailed success message
    const resourceName = getResourceDisplayName(resourceType);
    const impactText = result.marketImpact && result.marketImpact > 0.05 ?
        ` (価格影響: -${(result.marketImpact * 100).toFixed(1)}%)` : '';
    showMessage(`${resourceName} x${sellAmount} を販売！ +${result.totalValue} CD${impactText}`, 4000);
    // Update modal content
    const modal = document.getElementById('resourceSellModal');
    if (modal) {
        updateModalContent(modal);
    }
}
// Update trading summary
function updateTradingSummary(modal) {
    const summaryContainer = modal.querySelector('#tradingSummary');
    if (!summaryContainer)
        return;
    const marketData = marketSystem.getAllMarketInfo();
    // Calculate summary statistics
    let totalDailyLimit = 0;
    let totalDailySold = 0;
    let highestPriceChange = { resource: '', change: -Infinity };
    let lowestPriceChange = { resource: '', change: Infinity };
    let mostVolatile = { resource: '', volatility: 0 };
    Object.entries(marketData).forEach(([resourceType, info]) => {
        if (!info)
            return;
        totalDailyLimit += info.dailyLimit;
        totalDailySold += info.dailySold;
        if (info.priceChange > highestPriceChange.change) {
            highestPriceChange = { resource: resourceType, change: info.priceChange };
        }
        if (info.priceChange < lowestPriceChange.change) {
            lowestPriceChange = { resource: resourceType, change: info.priceChange };
        }
        if (info.volatility > mostVolatile.volatility) {
            mostVolatile = { resource: resourceType, volatility: info.volatility };
        }
    });
    const utilizationRate = totalDailyLimit > 0 ? (totalDailySold / totalDailyLimit * 100) : 0;
    const html = `
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-label">本日の取引率</div>
                <div class="summary-value">${utilizationRate.toFixed(1)}%</div>
                <div class="summary-detail">${totalDailySold.toLocaleString()} / ${totalDailyLimit.toLocaleString()}</div>
            </div>
            
            <div class="summary-item">
                <div class="summary-label">最高値上昇</div>
                <div class="summary-value price-up">📈 ${highestPriceChange.change.toFixed(1)}%</div>
                <div class="summary-detail">${getResourceDisplayName(highestPriceChange.resource)}</div>
            </div>
            
            <div class="summary-item">
                <div class="summary-label">最大値下落</div>
                <div class="summary-value price-down">📉 ${lowestPriceChange.change.toFixed(1)}%</div>
                <div class="summary-detail">${getResourceDisplayName(lowestPriceChange.resource)}</div>
            </div>
            
            <div class="summary-item">
                <div class="summary-label">最高変動性</div>
                <div class="summary-value">⚡ ${(mostVolatile.volatility * 100).toFixed(0)}%</div>
                <div class="summary-detail">${getResourceDisplayName(mostVolatile.resource)}</div>
            </div>
        </div>
        
        <div class="market-tips">
            <h5>💡 取引のヒント</h5>
            <ul>
                <li>価格上昇中の資源は早めに売ると利益が出ます</li>
                <li>大量販売は価格下落を引き起こします</li>
                <li>市場イベント中は価格が大きく変動します</li>
                <li>販売限界は毎日リセットされます</li>
            </ul>
        </div>
    `;
    summaryContainer.innerHTML = html;
}
// Close modal
export function closeResourceSellModal() {
    const modal = document.getElementById('resourceSellModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
// Get display name for resource
function getResourceDisplayName(resourceType) {
    const names = {
        'cosmicDust': '宇宙の塵',
        'energy': 'エネルギー',
        'organicMatter': '有機物',
        'biomass': 'バイオマス',
        'darkMatter': 'ダークマター',
        'thoughtPoints': '思考ポイント',
        'processedMetal': '加工金属',
        'silicon': 'シリコン',
        'stabilizedEnergy': '安定化エネルギー',
        'refinedMetal': '精製金属',
        'rareElements': '希少元素',
        'highPolymer': '高分子ポリマー',
        'quantumCrystal': '量子結晶',
        'radioactiveWaste': '放射性廃棄物'
    };
    return names[resourceType] || resourceType;
}
// Export functions to window for HTML onclick handlers
window.showResourceSellModal = showResourceSellModal;
window.closeResourceSellModal = closeResourceSellModal;
window.sellResource = sellResource;
console.log('💰 Resource sell modal system loaded');
