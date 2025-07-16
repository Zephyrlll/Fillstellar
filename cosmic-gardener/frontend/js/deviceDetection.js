import { gameState } from './state.js';
// デバイス検出ユーティリティ
export function detectDevice() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || window.innerWidth <= 768
        || ('ontouchstart' in window);
    const isDesktop = !isMobile;
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const userAgent = navigator.userAgent;
    const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    // 前回の検出結果と比較
    const currentTime = Date.now();
    const lastDetection = gameState.deviceInfo;
    // 変更があった場合のみ更新
    if (!lastDetection ||
        lastDetection.isMobile !== isMobile ||
        lastDetection.screenWidth !== screenWidth ||
        lastDetection.screenHeight !== screenHeight ||
        currentTime - lastDetection.lastDetectionTime > 5000) { // 5秒以上経過した場合
        gameState.deviceInfo = {
            isMobile,
            isDesktop,
            screenWidth,
            screenHeight,
            userAgent,
            hasTouchSupport,
            lastDetectionTime: currentTime
        };
        console.log('📱 Device detected:', {
            isMobile,
            isDesktop,
            screenWidth,
            screenHeight,
            hasTouchSupport
        });
        // デバイス変更時にUIを調整
        adjustUIForDevice();
    }
}
// デバイスに応じたUI調整
function adjustUIForDevice() {
    const { isMobile } = gameState.deviceInfo;
    const body = document.body;
    // 既存のデバイス関連クラスを削除
    body.classList.remove('mobile-device', 'desktop-device');
    // 新しいデバイス情報に基づいてクラスを追加
    if (isMobile) {
        body.classList.add('mobile-device');
        console.log('📱 Mobile UI layout applied');
        
        // モバイル用パネルの初期化
        initializeMobilePanel();
    }
    else {
        body.classList.add('desktop-device');
        console.log('💻 Desktop UI layout applied');
    }
}

// モバイル用パネルの初期化
function initializeMobilePanel() {
    // UIエリアは完全に非表示にしたので、トグル機能は不要
    console.log('📱 Mobile panel initialization: UI area hidden, setting up nav features only');
    
    // ナビゲーションバーの情報を更新する関数
    updateMobileNavInfo();
    
    // ナビゲーションバーボタンのイベントリスナーを追加
    setupMobileNavButtons();
    
    // コンパクト情報パネルのセットアップ
    setupMobileCompactInfo();
    
    // モバイルタブナビゲーションのセットアップ
    setupMobileTabNavigation();
    
    // モバイル研究システムのセットアップ
    setupMobileResearchSystem();
    
    // モバイルゲームシステムのセットアップ
    setupMobileGameSystem();
    
    // モバイル設定システムのセットアップ
    setupMobileSettingsSystem();
    
    // モバイル恒星管理システムのセットアップ
    setupMobileStarManagementSystem();
    
    // 自動UI非表示機能のセットアップ
    setupAutoHideUI();
    
    console.log('📱 Mobile features initialized with navigation bar');
}

// 統計ログパネルの位置調整
function adjustStatsLogPosition(isMobilePanelCollapsed) {
    const statsLogContainer = document.getElementById('stats-log-container');
    if (!statsLogContainer) {
        console.warn('📱 Stats log container not found');
        return;
    }
    
    // モバイルでの表示を確実にする
    statsLogContainer.style.display = 'block';
    statsLogContainer.style.visibility = 'visible';
    
    if (isMobilePanelCollapsed) {
        // モバイルパネルが折りたたまれている場合：通常の位置（中央）
        statsLogContainer.style.left = '50%';
        statsLogContainer.style.transform = 'translateX(-50%)';
        console.log('📱 Stats log panel positioned normally (mobile panel collapsed)');
    } else {
        // モバイルパネルが展開されている場合：少し右にずらす
        statsLogContainer.style.left = '55%'; // 中央より少し右に
        statsLogContainer.style.transform = 'translateX(-50%)';
        console.log('📱 Stats log panel moved right (mobile panel expanded)');
    }
}

// ウィンドウリサイズ時のデバイス再検出
export function setupDeviceDetection() {
    // 初回検出
    detectDevice();
    
    // デバッグ: 要素の存在確認
    setTimeout(() => {
        const toggleBtn = document.getElementById('mobile-toggle-btn');
        const statsContainer = document.getElementById('stats-log-container');
        const uiArea = document.getElementById('ui-area');
        
        console.log('📱 Debug - Element check:', {
            toggleBtn: toggleBtn ? 'found' : 'NOT FOUND',
            statsContainer: statsContainer ? 'found' : 'NOT FOUND',
            uiArea: uiArea ? 'found' : 'NOT FOUND',
            isMobile: gameState.deviceInfo?.isMobile
        });
        
        if (gameState.deviceInfo?.isMobile) {
            if (toggleBtn) {
                console.log('📱 Toggle button styles:', {
                    display: getComputedStyle(toggleBtn).display,
                    visibility: getComputedStyle(toggleBtn).visibility,
                    position: getComputedStyle(toggleBtn).position,
                    top: getComputedStyle(toggleBtn).top,
                    left: getComputedStyle(toggleBtn).left
                });
            }
            
            if (statsContainer) {
                console.log('📱 Stats container styles:', {
                    display: getComputedStyle(statsContainer).display,
                    visibility: getComputedStyle(statsContainer).visibility,
                    position: getComputedStyle(statsContainer).position,
                    bottom: getComputedStyle(statsContainer).bottom,
                    left: getComputedStyle(statsContainer).left
                });
            }
        }
    }, 2000);
    
    // リサイズ時の再検出（デバウンス付き）
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            detectDevice();
        }, 250); // 250ms後に再検出
    });
    // 向き変更時の再検出
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            detectDevice();
        }, 100); // 100ms後に再検出
    });
}
// デバイス情報を取得
export function getDeviceInfo() {
    return gameState.deviceInfo;
}
// モバイルデバイスかどうかを判定
export function isMobileDevice() {
    return gameState.deviceInfo?.isMobile || false;
}
// デスクトップデバイスかどうかを判定
export function isDesktopDevice() {
    return gameState.deviceInfo?.isDesktop || true;
}

// モバイルナビゲーションバーの情報を更新
function updateMobileNavInfo() {
    if (!isMobileDevice()) return;
    
    const gameYearNav = document.getElementById('gameYear-nav');
    const dustValueNav = document.getElementById('dust-value-nav');
    const energyValueNav = document.getElementById('energy-value-nav');
    
    if (gameYearNav && gameState.gameYear !== undefined) {
        gameYearNav.textContent = Math.floor(gameState.gameYear).toLocaleString();
    }
    
    if (dustValueNav && gameState.cosmicDust !== undefined) {
        dustValueNav.textContent = Math.floor(gameState.cosmicDust).toLocaleString();
    }
    
    if (energyValueNav && gameState.energy !== undefined) {
        energyValueNav.textContent = Math.floor(gameState.energy).toLocaleString();
    }
}

// モバイルナビゲーションバー情報を定期的に更新
export function startMobileNavUpdates() {
    if (!isMobileDevice()) return;
    
    // 0.5秒ごとに更新
    setInterval(() => {
        updateMobileNavInfo();
        updateMobileCompactInfo();
    }, 500);
}

// モバイルナビゲーションバーボタンのセットアップ
function setupMobileNavButtons() {
    const productionBtnMobile = document.getElementById('productionToggleButton-mobile');
    const sellBtnMobile = document.getElementById('floatingResourceSellButton-mobile');
    
    if (productionBtnMobile) {
        productionBtnMobile.addEventListener('click', () => {
            // 既存の生産ボタンの機能を複製
            const originalBtn = document.getElementById('productionToggleButton');
            if (originalBtn) {
                originalBtn.click();
                console.log('📱 Production panel toggled via mobile nav');
            }
        });
    }
    
    if (sellBtnMobile) {
        sellBtnMobile.addEventListener('click', () => {
            // 既存の資源販売ボタンの機能を複製
            const originalBtn = document.getElementById('floatingResourceSellButton');
            if (originalBtn) {
                originalBtn.click();
                console.log('📱 Resource sell panel toggled via mobile nav');
            }
        });
    }
}

// モバイルコンパクト情報パネルのセットアップ
function setupMobileCompactInfo() {
    const infoToggle = document.getElementById('mobile-info-toggle');
    const compactPanel = document.getElementById('mobile-compact-info');
    const closeBtn = document.getElementById('mobile-compact-close');
    
    if (infoToggle && compactPanel) {
        infoToggle.addEventListener('click', () => {
            compactPanel.classList.toggle('active');
            updateMobileCompactInfo();
            console.log('📱 Compact info panel toggled');
        });
    }
    
    if (closeBtn && compactPanel) {
        closeBtn.addEventListener('click', () => {
            compactPanel.classList.remove('active');
            console.log('📱 Compact info panel closed');
        });
    }
}

// モバイルコンパクト情報パネルの値を更新
function updateMobileCompactInfo() {
    if (!isMobileDevice()) return;
    
    const populationValue = document.getElementById('mobile-population-value');
    const organicValue = document.getElementById('mobile-organic-value');
    const biomassValue = document.getElementById('mobile-biomass-value');
    const thoughtValue = document.getElementById('mobile-thought-value');
    const darkValue = document.getElementById('mobile-dark-value');
    
    if (populationValue && gameState.cachedTotalPopulation !== undefined) {
        populationValue.textContent = Math.floor(gameState.cachedTotalPopulation).toLocaleString();
    }
    
    if (organicValue && gameState.organicMatter !== undefined) {
        organicValue.textContent = Math.floor(gameState.organicMatter).toLocaleString();
    }
    
    if (biomassValue && gameState.biomass !== undefined) {
        biomassValue.textContent = Math.floor(gameState.biomass).toLocaleString();
    }
    
    if (thoughtValue && gameState.thoughtPoints !== undefined) {
        thoughtValue.textContent = Math.floor(gameState.thoughtPoints).toLocaleString();
    }
    
    if (darkValue && gameState.darkMatter !== undefined) {
        darkValue.textContent = Math.floor(gameState.darkMatter).toLocaleString();
    }
    
    const starCountValue = document.getElementById('mobile-star-count');
    if (starCountValue && gameState.stars !== undefined) {
        starCountValue.textContent = gameState.stars.length.toLocaleString();
    }
}

// モバイルタブナビゲーションのセットアップ
function setupMobileTabNavigation() {
    const tabs = {
        'gameTab-mobile': 'mobile-game-content',
        'researchTab-mobile': 'mobile-research-content',
        'optionsTab-mobile': 'mobile-options-content',
        'starTab-mobile': 'mobile-star-content'
    };
    
    Object.keys(tabs).forEach(tabId => {
        const tab = document.getElementById(tabId);
        if (tab) {
            tab.addEventListener('click', () => {
                // 全てのタブを非アクティブにする
                document.querySelectorAll('.mobile-tab').forEach(t => {
                    t.classList.remove('active-mobile-tab');
                });
                
                // 全てのコンテンツを非表示にする
                document.querySelectorAll('.mobile-content').forEach(c => {
                    c.classList.remove('active-mobile-content');
                });
                
                // 選択されたタブをアクティブにする
                tab.classList.add('active-mobile-tab');
                
                // 対応するコンテンツを表示する
                const contentId = tabs[tabId];
                const content = document.getElementById(contentId);
                if (content) {
                    content.classList.add('active-mobile-content');
                }
                
                // モーダルを表示
                showMobileModal();
                
                console.log(`📱 Mobile tab switched to: ${tabId}`);
            });
        }
    });
    
    // モーダル背景クリックで閉じる
    const contentArea = document.getElementById('mobile-content-area');
    if (contentArea) {
        contentArea.addEventListener('click', (e) => {
            if (e.target === contentArea) {
                closeMobileModal();
            }
        });
    }
}

// モーダル表示関数
function showMobileModal() {
    const contentArea = document.getElementById('mobile-content-area');
    if (contentArea) {
        contentArea.classList.add('active');
    }
}

// モーダル非表示関数（グローバル関数として定義）
window.closeMobileModal = function() {
    const contentArea = document.getElementById('mobile-content-area');
    if (contentArea) {
        contentArea.classList.remove('active');
    }
}

// 自動UI非表示機能のセットアップ
let uiHideTimer = null;
const UI_HIDE_DELAY = 3000; // 3秒後に自動非表示

function setupAutoHideUI() {
    if (!isMobileDevice()) return;
    
    const elements = [
        document.getElementById('mobile-nav-bar'),
        document.getElementById('mobile-tab-nav'),
        document.getElementById('stats-log-container')
    ];
    
    // タップで再表示
    document.addEventListener('touchstart', showUI);
    document.addEventListener('click', showUI);
    
    // 初期表示
    showUI();
    
    function showUI() {
        elements.forEach(el => {
            if (el) {
                el.style.opacity = '1';
                el.style.pointerEvents = 'auto';
            }
        });
        
        // 既存のタイマーをクリア
        if (uiHideTimer) {
            clearTimeout(uiHideTimer);
        }
        
        // 新しいタイマーを設定
        uiHideTimer = setTimeout(() => {
            elements.forEach(el => {
                if (el) {
                    el.style.opacity = '0.3';
                    el.style.pointerEvents = 'none';
                }
            });
            console.log('📱 UI auto-hidden for immersive experience');
        }, UI_HIDE_DELAY);
    }
}

// モバイル研究システムのセットアップ
function setupMobileResearchSystem() {
    if (!isMobileDevice()) return;
    
    // 研究項目の定義
    const researchItems = [
        {
            id: 'enhancedDust',
            cost: 1,
            stateKey: 'researchEnhancedDust',
            unlockKey: null
        },
        {
            id: 'advancedEnergy',
            cost: 2,
            stateKey: 'researchAdvancedEnergy',
            unlockKey: null
        },
        {
            id: 'moon',
            cost: 1,
            stateKey: null,
            unlockKey: 'moon'
        },
        {
            id: 'dwarfPlanet',
            cost: 2,
            stateKey: null,
            unlockKey: 'dwarfPlanet'
        },
        {
            id: 'planet',
            cost: 3,
            stateKey: null,
            unlockKey: 'planet'
        },
        {
            id: 'star',
            cost: 5,
            stateKey: null,
            unlockKey: 'star'
        }
    ];
    
    // 各研究項目のボタンにイベントリスナーを追加
    researchItems.forEach(item => {
        const button = document.getElementById(`mobile-research${item.id.charAt(0).toUpperCase() + item.id.slice(1)}Button`);
        if (button) {
            button.addEventListener('click', () => {
                performMobileResearch(item);
            });
        }
    });
    
    // 初期状態の更新
    updateMobileResearchDisplay();
    
    console.log('📱 Mobile research system initialized');
}

// モバイル研究の実行
function performMobileResearch(researchItem) {
    if (!gameState || gameState.darkMatter < researchItem.cost) {
        console.log('📱 Insufficient dark matter for research');
        return;
    }
    
    // 研究済みかチェック
    let isCompleted = false;
    if (researchItem.stateKey) {
        isCompleted = gameState[researchItem.stateKey];
    } else if (researchItem.unlockKey) {
        isCompleted = gameState.unlockedCelestialBodies[researchItem.unlockKey];
    }
    
    if (isCompleted) {
        console.log('📱 Research already completed');
        return;
    }
    
    // リソースを消費
    gameState.darkMatter -= researchItem.cost;
    gameState.resources.darkMatter -= researchItem.cost;
    
    // 研究を完了
    if (researchItem.stateKey) {
        gameState[researchItem.stateKey] = true;
    } else if (researchItem.unlockKey) {
        gameState.unlockedCelestialBodies[researchItem.unlockKey] = true;
    }
    
    // UI更新
    updateMobileResearchDisplay();
    if (typeof updateUI === 'function') {
        updateUI();
    }
    if (typeof saveGame === 'function') {
        saveGame();
    }
    
    console.log(`📱 Research completed: ${researchItem.id}`);
}

// モバイル研究表示の更新
function updateMobileResearchDisplay() {
    if (!isMobileDevice() || !gameState) return;
    
    const researchStates = [
        { id: 'enhancedDust', stateKey: 'researchEnhancedDust' },
        { id: 'advancedEnergy', stateKey: 'researchAdvancedEnergy' },
        { id: 'moon', unlockKey: 'moon' },
        { id: 'dwarfPlanet', unlockKey: 'dwarfPlanet' },
        { id: 'planet', unlockKey: 'planet' },
        { id: 'star', unlockKey: 'star' }
    ];
    
    researchStates.forEach(research => {
        const statusElement = document.getElementById(`mobile-research${research.id.charAt(0).toUpperCase() + research.id.slice(1)}Status`);
        const buttonElement = document.getElementById(`mobile-research${research.id.charAt(0).toUpperCase() + research.id.slice(1)}Button`);
        const itemElement = document.querySelector(`[data-research="${research.id}"]`);
        
        let isCompleted = false;
        if (research.stateKey) {
            isCompleted = gameState[research.stateKey];
        } else if (research.unlockKey) {
            isCompleted = gameState.unlockedCelestialBodies && gameState.unlockedCelestialBodies[research.unlockKey];
        }
        
        if (statusElement) {
            statusElement.textContent = isCompleted ? '完了' : '未完了';
            statusElement.className = isCompleted ? 'research-status-badge completed' : 'research-status-badge incomplete';
        }
        
        if (buttonElement) {
            const costs = { enhancedDust: 1, advancedEnergy: 2, moon: 1, dwarfPlanet: 2, planet: 3, star: 5 };
            const cost = costs[research.id];
            const canAfford = gameState.darkMatter >= cost;
            
            buttonElement.disabled = isCompleted || !canAfford;
            buttonElement.textContent = isCompleted ? '完了' : '研究する';
            buttonElement.className = isCompleted ? 'research-button completed' : 'research-button';
        }
        
        if (itemElement) {
            if (isCompleted) {
                itemElement.classList.add('completed');
            } else {
                itemElement.classList.remove('completed');
            }
        }
    });
}

// モバイル研究表示の定期更新を追加
export function startMobileResearchUpdates() {
    if (!isMobileDevice()) return;
    
    // 1秒ごとに研究表示を更新
    setInterval(updateMobileResearchDisplay, 1000);
}

// モバイルゲームシステムのセットアップ
function setupMobileGameSystem() {
    if (!isMobileDevice()) return;
    
    // 天体創造ボタンの設定
    const creationButtons = [
        { id: 'mobile-createAsteroidButton', type: 'asteroid', originalId: 'createAsteroidButton' },
        { id: 'mobile-createCometButton', type: 'comet', originalId: 'createCometButton' },
        { id: 'mobile-createMoonButton', type: 'moon', originalId: 'createMoonButton' },
        { id: 'mobile-createDwarfPlanetButton', type: 'dwarfPlanet', originalId: 'createDwarfPlanetButton' },
        { id: 'mobile-createPlanetButton', type: 'planet', originalId: 'createPlanetButton' },
        { id: 'mobile-createStarButton', type: 'star', originalId: 'createStarButton' }
    ];
    
    creationButtons.forEach(button => {
        const element = document.getElementById(button.id);
        if (element) {
            element.addEventListener('click', () => {
                // 既存のボタンの機能を複製
                const originalButton = document.getElementById(button.originalId);
                if (originalButton) {
                    originalButton.click();
                    console.log(`📱 ${button.type} creation triggered via mobile`);
                }
            });
        }
    });
    
    // アップグレードボタンの設定
    const upgradeButtons = [
        { id: 'mobile-upgradeDustButton', originalId: 'upgradeDustButton' },
        { id: 'mobile-upgradeDarkMatterConverterButton', originalId: 'upgradeDarkMatterConverterButton' }
    ];
    
    upgradeButtons.forEach(button => {
        const element = document.getElementById(button.id);
        if (element) {
            element.addEventListener('click', () => {
                // 既存のボタンの機能を複製
                const originalButton = document.getElementById(button.originalId);
                if (originalButton) {
                    originalButton.click();
                    console.log(`📱 Upgrade triggered via mobile: ${button.id}`);
                }
            });
        }
    });
    
    // 初期状態の更新
    updateMobileGameDisplay();
    
    console.log('📱 Mobile game system initialized');
}

// モバイルゲーム表示の更新
function updateMobileGameDisplay() {
    if (!isMobileDevice() || !gameState) return;
    
    // コスト表示の更新
    const costElements = [
        { id: 'mobile-asteroidCost', originalId: 'asteroidCostDisplay' },
        { id: 'mobile-cometCost', originalId: 'cometCostDisplay' },
        { id: 'mobile-moonCost', originalId: 'moonCostDisplay' },
        { id: 'mobile-dwarfPlanetCost', originalId: 'dwarfPlanetCostDisplay' },
        { id: 'mobile-planetCost', originalId: 'planetCostDisplay' },
        { id: 'mobile-starCost', originalId: 'starCostDisplay' }
    ];
    
    costElements.forEach(cost => {
        const mobileElement = document.getElementById(cost.id);
        const originalElement = document.getElementById(cost.originalId);
        if (mobileElement && originalElement) {
            mobileElement.textContent = originalElement.textContent;
        }
    });
    
    // アップグレードレベルの更新
    const levelElements = [
        { id: 'mobile-dustUpgradeLevel', originalId: 'dustUpgradeLevel' },
        { id: 'mobile-darkMatterConverterLevel', originalId: 'darkMatterConverterLevel' }
    ];
    
    levelElements.forEach(level => {
        const mobileElement = document.getElementById(level.id);
        const originalElement = document.getElementById(level.originalId);
        if (mobileElement && originalElement) {
            mobileElement.textContent = originalElement.textContent;
        }
    });
    
    // アップグレードコストの更新
    const upgradeCostElements = [
        { id: 'mobile-dustUpgradeCost', originalId: 'dustUpgradeCost' },
        { id: 'mobile-darkMatterConverterCost', originalId: 'darkMatterConverterCost' }
    ];
    
    upgradeCostElements.forEach(cost => {
        const mobileElement = document.getElementById(cost.id);
        const originalElement = document.getElementById(cost.originalId);
        if (mobileElement && originalElement) {
            mobileElement.textContent = originalElement.textContent;
        }
    });
    
    // 天体カウントの更新
    const starCountElement = document.getElementById('mobile-starCountDisplay');
    const planetCountElement = document.getElementById('mobile-planetCountDisplay');
    const celestialBodyCountElement = document.getElementById('mobile-celestialBodyCount');
    const lifeCountElement = document.getElementById('mobile-lifeCountDisplay');
    
    if (gameState.stars) {
        if (starCountElement) {
            starCountElement.textContent = gameState.stars.length.toLocaleString();
        }
        
        if (celestialBodyCountElement) {
            celestialBodyCountElement.textContent = gameState.stars.length.toLocaleString();
        }
        
        // 惑星数と生命体数をカウント
        let planetCount = 0;
        let lifeCount = 0;
        
        gameState.stars.forEach(star => {
            if (star.userData && star.userData.type === 'planet') {
                planetCount++;
                if (star.userData.hasLife) {
                    lifeCount++;
                }
            }
        });
        
        if (planetCountElement) {
            planetCountElement.textContent = planetCount.toLocaleString();
        }
        
        if (lifeCountElement) {
            lifeCountElement.textContent = lifeCount.toLocaleString();
        }
    }
    
    // 研究に基づく天体創造ボタンの表示/非表示
    const unlockMappings = [
        { elementId: 'mobile-moonCreation', unlockKey: 'moon' },
        { elementId: 'mobile-dwarfPlanetCreation', unlockKey: 'dwarfPlanet' },
        { elementId: 'mobile-planetCreation', unlockKey: 'planet' },
        { elementId: 'mobile-starCreation', unlockKey: 'star' }
    ];
    
    unlockMappings.forEach(mapping => {
        const element = document.getElementById(mapping.elementId);
        if (element && gameState.unlockedCelestialBodies) {
            const isUnlocked = gameState.unlockedCelestialBodies[mapping.unlockKey];
            element.style.display = isUnlocked ? 'flex' : 'none';
        }
    });
    
    // ボタンの有効/無効状態の更新
    updateMobileButtonStates();
}

// モバイルボタンの有効/無効状態を更新
function updateMobileButtonStates() {
    if (!isMobileDevice() || !gameState) return;
    
    // 天体創造ボタンの状態更新
    const creationButtonMappings = [
        { id: 'mobile-createAsteroidButton', originalId: 'createAsteroidButton' },
        { id: 'mobile-createCometButton', originalId: 'createCometButton' },
        { id: 'mobile-createMoonButton', originalId: 'createMoonButton' },
        { id: 'mobile-createDwarfPlanetButton', originalId: 'createDwarfPlanetButton' },
        { id: 'mobile-createPlanetButton', originalId: 'createPlanetButton' },
        { id: 'mobile-createStarButton', originalId: 'createStarButton' }
    ];
    
    creationButtonMappings.forEach(mapping => {
        const mobileButton = document.getElementById(mapping.id);
        const originalButton = document.getElementById(mapping.originalId);
        if (mobileButton && originalButton) {
            mobileButton.disabled = originalButton.disabled;
        }
    });
    
    // アップグレードボタンの状態更新
    const upgradeButtonMappings = [
        { id: 'mobile-upgradeDustButton', originalId: 'upgradeDustButton' },
        { id: 'mobile-upgradeDarkMatterConverterButton', originalId: 'upgradeDarkMatterConverterButton' }
    ];
    
    upgradeButtonMappings.forEach(mapping => {
        const mobileButton = document.getElementById(mapping.id);
        const originalButton = document.getElementById(mapping.originalId);
        if (mobileButton && originalButton) {
            mobileButton.disabled = originalButton.disabled;
        }
    });
}

// モバイルゲーム表示の定期更新を追加
export function startMobileGameUpdates() {
    if (!isMobileDevice()) return;
    
    // 0.5秒ごとにゲーム表示を更新
    setInterval(updateMobileGameDisplay, 500);
}

// モバイル設定システムのセットアップ
function setupMobileSettingsSystem() {
    if (!isMobileDevice()) return;
    
    // グラフィック設定
    setupMobileGraphicsSettings();
    
    // サウンド設定
    setupMobileSoundSettings();
    
    // ゲーム設定
    setupMobileGameSettings();
    
    // 初期状態の更新
    updateMobileSettingsDisplay();
    
    console.log('📱 Mobile settings system initialized');
}

// モバイルグラフィック設定のセットアップ
function setupMobileGraphicsSettings() {
    // デフォルト設定ボタン
    const defaultButton = document.getElementById('mobile-setDefaultGraphicsButton');
    if (defaultButton) {
        defaultButton.addEventListener('click', () => {
            setMobileDefaultGraphicsSettings();
            console.log('📱 Default graphics settings applied');
        });
    }
    
    // 解像度スケール
    const resolutionSelect = document.getElementById('mobile-resolutionScaleSelect');
    if (resolutionSelect) {
        resolutionSelect.addEventListener('change', (e) => {
            const originalSelect = document.getElementById('resolutionScaleSelect');
            if (originalSelect) {
                originalSelect.value = e.target.value;
                originalSelect.dispatchEvent(new Event('change'));
                console.log('📱 Resolution scale changed to:', e.target.value);
            }
            // 警告メッセージを更新
            updateResolutionWarning(e.target.value);
        });
        
        // 初期値の警告を設定（少し遅延させる）
        setTimeout(() => {
            updateResolutionWarning(resolutionSelect.value);
        }, 100);
    }
    
    // パーティクル密度
    const particleSelect = document.getElementById('mobile-particleDensitySelect');
    if (particleSelect) {
        particleSelect.addEventListener('change', (e) => {
            const originalSelect = document.getElementById('particleDensitySelect');
            if (originalSelect) {
                originalSelect.value = e.target.value;
                originalSelect.dispatchEvent(new Event('change'));
                console.log('📱 Particle density changed to:', e.target.value);
            }
        });
    }
    
    // フレームレート制限
    const frameRateSelect = document.getElementById('mobile-frameRateLimitSelect');
    if (frameRateSelect) {
        frameRateSelect.addEventListener('change', (e) => {
            const originalSelect = document.getElementById('frameRateLimitSelect');
            if (originalSelect) {
                originalSelect.value = e.target.value;
                originalSelect.dispatchEvent(new Event('change'));
                console.log('📱 Frame rate limit changed to:', e.target.value);
            }
        });
    }
    
    // ポストプロセッシング
    const postProcessingSelect = document.getElementById('mobile-postProcessingSelect');
    if (postProcessingSelect) {
        postProcessingSelect.addEventListener('change', (e) => {
            const originalSelect = document.getElementById('postProcessingSelect');
            if (originalSelect) {
                originalSelect.value = e.target.value;
                originalSelect.dispatchEvent(new Event('change'));
                console.log('📱 Post-processing changed to:', e.target.value);
            }
        });
    }
    
    // 描画距離
    const viewDistanceSelect = document.getElementById('mobile-viewDistanceSelect');
    if (viewDistanceSelect) {
        viewDistanceSelect.addEventListener('change', (e) => {
            const originalSelect = document.getElementById('viewDistanceSelect');
            if (originalSelect) {
                originalSelect.value = e.target.value;
                originalSelect.dispatchEvent(new Event('change'));
                console.log('📱 View distance changed to:', e.target.value);
            }
        });
    }
    
    // 動的品質調整
    const dynamicQualityCheckbox = document.getElementById('mobile-dynamicQualityCheckbox');
    if (dynamicQualityCheckbox) {
        dynamicQualityCheckbox.addEventListener('change', (e) => {
            const originalCheckbox = document.getElementById('dynamicQualityCheckbox');
            if (originalCheckbox) {
                originalCheckbox.checked = e.target.checked;
                originalCheckbox.dispatchEvent(new Event('change'));
                console.log('📱 Dynamic quality adjustment:', e.target.checked);
            }
        });
    }
    
    // 設定リセット
    const resetButton = document.getElementById('mobile-resetGraphicsButton');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            const originalButton = document.getElementById('resetGraphicsButton');
            if (originalButton) {
                originalButton.click();
                console.log('📱 Graphics settings reset');
            }
        });
    }
}

// モバイルサウンド設定のセットアップ
function setupMobileSoundSettings() {
    // マスター音量
    const masterVolumeSlider = document.getElementById('mobile-masterVolumeSlider');
    const masterVolumeValue = document.getElementById('mobile-masterVolumeValue');
    if (masterVolumeSlider && masterVolumeValue) {
        masterVolumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            masterVolumeValue.textContent = value;
            
            const originalSlider = document.getElementById('masterVolumeSlider');
            if (originalSlider) {
                originalSlider.value = value;
                originalSlider.dispatchEvent(new Event('input'));
            }
        });
    }
    
    // 環境音音量
    const ambientVolumeSlider = document.getElementById('mobile-ambientVolumeSlider');
    const ambientVolumeValue = document.getElementById('mobile-ambientVolumeValue');
    if (ambientVolumeSlider && ambientVolumeValue) {
        ambientVolumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            ambientVolumeValue.textContent = value;
            
            const originalSlider = document.getElementById('ambientVolumeSlider');
            if (originalSlider) {
                originalSlider.value = value;
                originalSlider.dispatchEvent(new Event('input'));
            }
        });
    }
    
    // 効果音音量
    const effectsVolumeSlider = document.getElementById('mobile-effectsVolumeSlider');
    const effectsVolumeValue = document.getElementById('mobile-effectsVolumeValue');
    if (effectsVolumeSlider && effectsVolumeValue) {
        effectsVolumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            effectsVolumeValue.textContent = value;
            
            const originalSlider = document.getElementById('effectsVolumeSlider');
            if (originalSlider) {
                originalSlider.value = value;
                originalSlider.dispatchEvent(new Event('input'));
            }
        });
    }
    
    // 3D音響
    const spatialAudioCheckbox = document.getElementById('mobile-spatialAudioCheckbox');
    if (spatialAudioCheckbox) {
        spatialAudioCheckbox.addEventListener('change', (e) => {
            const originalCheckbox = document.getElementById('spatialAudioCheckbox');
            if (originalCheckbox) {
                originalCheckbox.checked = e.target.checked;
                originalCheckbox.dispatchEvent(new Event('change'));
                console.log('📱 Spatial audio:', e.target.checked);
            }
        });
    }
    
    // ミュートボタン
    const muteButton = document.getElementById('mobile-muteToggleButton');
    if (muteButton) {
        muteButton.addEventListener('click', () => {
            const originalButton = document.getElementById('muteToggleButton');
            if (originalButton) {
                originalButton.click();
                console.log('📱 Mute toggled');
            }
        });
    }
}

// モバイルゲーム設定のセットアップ
function setupMobileGameSettings() {
    // 時間倍率
    const timeMultiplierSelect = document.getElementById('mobile-timeMultiplierSelect');
    if (timeMultiplierSelect) {
        timeMultiplierSelect.addEventListener('change', (e) => {
            const originalSelect = document.getElementById('timeMultiplierSelect');
            if (originalSelect) {
                originalSelect.value = e.target.value;
                originalSelect.dispatchEvent(new Event('change'));
                console.log('📱 Time multiplier changed to:', e.target.value);
            }
        });
    }
    
    // UIアニメーション
    const uiAnimationsSelect = document.getElementById('mobile-uiAnimationsSelect');
    if (uiAnimationsSelect) {
        uiAnimationsSelect.addEventListener('change', (e) => {
            const originalSelect = document.getElementById('uiAnimationsSelect');
            if (originalSelect) {
                originalSelect.value = e.target.value;
                originalSelect.dispatchEvent(new Event('change'));
                console.log('📱 UI animations changed to:', e.target.value);
            }
        });
    }
    
    // カメラリセット
    const resetCameraButton = document.getElementById('mobile-resetCameraButton');
    if (resetCameraButton) {
        resetCameraButton.addEventListener('click', () => {
            const originalButton = document.getElementById('resetCameraButton');
            if (originalButton) {
                originalButton.click();
                console.log('📱 Camera reset');
            }
        });
    }
}

// モバイル設定表示の更新
function updateMobileSettingsDisplay() {
    if (!isMobileDevice()) return;
    
    // パフォーマンス表示の更新
    const mobileFpsDisplay = document.getElementById('mobile-fpsDisplay');
    const mobileFrameTimeDisplay = document.getElementById('mobile-frameTimeDisplay');
    const mobileMemoryDisplay = document.getElementById('mobile-memoryDisplay');
    
    const originalFpsDisplay = document.getElementById('fpsDisplay');
    const originalFrameTimeDisplay = document.getElementById('frameTimeDisplay');
    const originalMemoryDisplay = document.getElementById('memoryDisplay');
    
    if (mobileFpsDisplay && originalFpsDisplay) {
        mobileFpsDisplay.textContent = originalFpsDisplay.textContent;
    }
    
    if (mobileFrameTimeDisplay && originalFrameTimeDisplay) {
        mobileFrameTimeDisplay.textContent = originalFrameTimeDisplay.textContent;
    }
    
    if (mobileMemoryDisplay && originalMemoryDisplay) {
        mobileMemoryDisplay.textContent = originalMemoryDisplay.textContent;
    }
    
    // 設定値の同期
    syncMobileSettingsWithOriginal();
    
    // 時間倍率の有効/無効状態を更新
    updateMobileTimeMultiplierOptions();
}

// モバイル設定を元の設定と同期
function syncMobileSettingsWithOriginal() {
    const settingMappings = [
        { mobileId: 'mobile-resolutionScaleSelect', originalId: 'resolutionScaleSelect' },
        { mobileId: 'mobile-particleDensitySelect', originalId: 'particleDensitySelect' },
        { mobileId: 'mobile-frameRateLimitSelect', originalId: 'frameRateLimitSelect' },
        { mobileId: 'mobile-postProcessingSelect', originalId: 'postProcessingSelect' },
        { mobileId: 'mobile-viewDistanceSelect', originalId: 'viewDistanceSelect' },
        { mobileId: 'mobile-timeMultiplierSelect', originalId: 'timeMultiplierSelect' },
        { mobileId: 'mobile-uiAnimationsSelect', originalId: 'uiAnimationsSelect' },
        { mobileId: 'mobile-dynamicQualityCheckbox', originalId: 'dynamicQualityCheckbox' },
        { mobileId: 'mobile-spatialAudioCheckbox', originalId: 'spatialAudioCheckbox' }
    ];
    
    settingMappings.forEach(mapping => {
        const mobileElement = document.getElementById(mapping.mobileId);
        const originalElement = document.getElementById(mapping.originalId);
        
        if (mobileElement && originalElement) {
            if (mobileElement.type === 'checkbox') {
                mobileElement.checked = originalElement.checked;
            } else {
                mobileElement.value = originalElement.value;
            }
        }
    });
    
    // 音量スライダーの同期
    const volumeMappings = [
        { mobileId: 'mobile-masterVolumeSlider', originalId: 'masterVolumeSlider', valueId: 'mobile-masterVolumeValue' },
        { mobileId: 'mobile-ambientVolumeSlider', originalId: 'ambientVolumeSlider', valueId: 'mobile-ambientVolumeValue' },
        { mobileId: 'mobile-effectsVolumeSlider', originalId: 'effectsVolumeSlider', valueId: 'mobile-effectsVolumeValue' }
    ];
    
    volumeMappings.forEach(mapping => {
        const mobileSlider = document.getElementById(mapping.mobileId);
        const originalSlider = document.getElementById(mapping.originalId);
        const valueDisplay = document.getElementById(mapping.valueId);
        
        if (mobileSlider && originalSlider) {
            mobileSlider.value = originalSlider.value;
            if (valueDisplay) {
                valueDisplay.textContent = originalSlider.value;
            }
        }
    });
}

// 時間倍率オプションの有効/無効状態を更新
function updateMobileTimeMultiplierOptions() {
    const mobileSelect = document.getElementById('mobile-timeMultiplierSelect');
    const originalSelect = document.getElementById('timeMultiplierSelect');
    
    if (mobileSelect && originalSelect) {
        // 元の選択肢の有効/無効状態をコピー
        const mobileOptions = mobileSelect.querySelectorAll('option');
        const originalOptions = originalSelect.querySelectorAll('option');
        
        mobileOptions.forEach((option, index) => {
            if (originalOptions[index]) {
                option.disabled = originalOptions[index].disabled;
                // 無効の場合は「(要アンロック)」を表示
                if (option.disabled && !option.textContent.includes('(要アンロック)')) {
                    option.textContent = option.textContent.replace(' (要アンロック)', '') + ' (要アンロック)';
                }
            }
        });
    }
}

// モバイル設定表示の定期更新を追加
export function startMobileSettingsUpdates() {
    if (!isMobileDevice()) return;
    
    // 1秒ごとに設定表示を更新
    setInterval(updateMobileSettingsDisplay, 1000);
}

// モバイル恒星管理システムのセットアップ
function setupMobileStarManagementSystem() {
    if (!isMobileDevice()) return;
    
    // ソート選択の設定
    const sortSelect = document.getElementById('mobile-star-sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            console.log('📱 Star list sort changed to:', e.target.value);
            updateMobileStarList();
        });
    }
    
    // フォーカス移動ボタンの設定
    const focusButton = document.getElementById('mobile-focus-star-button');
    if (focusButton) {
        focusButton.addEventListener('click', () => {
            if (gameState.focusedObject) {
                // カメラを選択された恒星に移動
                if (window.controls && window.controls.target) {
                    window.controls.target.copy(gameState.focusedObject.position);
                    console.log('📱 Camera focused on star:', gameState.focusedObject.userData.name);
                }
            }
        });
    }
    
    // リスト更新ボタンの設定
    const refreshButton = document.getElementById('mobile-refresh-star-list');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            updateMobileStarList();
            console.log('📱 Star list refreshed');
        });
    }
    
    // 初期状態の更新
    updateMobileStarList();
    
    console.log('📱 Mobile star management system initialized');
}

// モバイル恒星リストの更新
function updateMobileStarList() {
    if (!isMobileDevice() || !gameState) return;
    
    const starList = document.getElementById('mobile-star-list');
    const sortSelect = document.getElementById('mobile-star-sort-select');
    
    if (!starList) return;
    
    // 恒星とブラックホールを取得
    const celestialBodies = gameState.stars.filter(s => 
        s.userData.type === 'star' || s.userData.type === 'black_hole'
    );
    
    // 統計情報を更新
    updateMobileStarStatistics(celestialBodies);
    
    if (celestialBodies.length === 0) {
        starList.innerHTML = '<div class="mobile-star-empty"><p>現在、管理対象の恒星はありません。</p></div>';
        return;
    }
    
    // ソート
    const sortColumn = sortSelect ? sortSelect.value : 'name';
    celestialBodies.sort((a, b) => {
        const valA = a.userData[sortColumn];
        const valB = b.userData[sortColumn];
        
        if (valA == null && valB == null) return 0;
        if (valA == null) return 1;
        if (valB == null) return -1;
        
        if (typeof valA === 'string' && typeof valB === 'string') {
            return valA.localeCompare(valB);
        }
        
        return valA - valB;
    });
    
    // リストを生成
    starList.innerHTML = '';
    celestialBodies.forEach(body => {
        const starItem = createMobileStarItem(body);
        starList.appendChild(starItem);
    });
    
    // フォーカス状態を更新
    updateMobileFocusInfo();
}

// モバイル恒星アイテムの作成
function createMobileStarItem(body) {
    const userData = body.userData;
    const div = document.createElement('div');
    div.className = 'mobile-star-item';
    
    // 選択状態の確認
    if (gameState.focusedObject === body) {
        div.classList.add('selected');
    }
    
    // 種類の表示テキスト
    const typeText = userData.type === 'black_hole' ? 'ブラックホール' : 
                    (userData.spectralType || '恒星');
    
    div.innerHTML = `
        <div class="star-item-header">
            <span class="star-item-name">${userData.name || 'N/A'}</span>
            <span class="star-item-type">${typeText}</span>
        </div>
        <div class="star-item-details">
            <div class="star-detail-row">
                <span class="star-detail-label">質量:</span>
                <span class="star-detail-value">${userData.mass ? userData.mass.toExponential(2) : '-'}</span>
            </div>
            <div class="star-detail-row">
                <span class="star-detail-label">温度:</span>
                <span class="star-detail-value">${userData.temperature ? userData.temperature + 'K' : '-'}</span>
            </div>
            <div class="star-detail-row">
                <span class="star-detail-label">年齢:</span>
                <span class="star-detail-value">${userData.age ? parseFloat(userData.age).toFixed(2) + '億年' : '-'}</span>
            </div>
            <div class="star-detail-row">
                <span class="star-detail-label">寿命:</span>
                <span class="star-detail-value">${userData.lifespan ? userData.lifespan + '億年' : '-'}</span>
            </div>
        </div>
    `;
    
    // クリックイベント
    div.addEventListener('click', () => {
        // 他の選択を解除
        const allItems = document.querySelectorAll('.mobile-star-item');
        allItems.forEach(item => item.classList.remove('selected'));
        
        // 選択状態を設定
        div.classList.add('selected');
        gameState.focusedObject = body;
        
        // フォーカス情報を更新
        updateMobileFocusInfo();
        
        console.log('📱 Star selected:', userData.name);
    });
    
    return div;
}

// モバイル恒星統計の更新
function updateMobileStarStatistics(celestialBodies) {
    const starCountElement = document.getElementById('mobile-star-management-count');
    const blackholeCountElement = document.getElementById('mobile-blackhole-count');
    const totalMassElement = document.getElementById('mobile-total-mass');
    const avgTemperatureElement = document.getElementById('mobile-avg-temperature');
    
    if (!celestialBodies) return;
    
    const stars = celestialBodies.filter(body => body.userData.type === 'star');
    const blackholes = celestialBodies.filter(body => body.userData.type === 'black_hole');
    
    // 恒星数
    if (starCountElement) {
        starCountElement.textContent = stars.length.toLocaleString();
    }
    
    // ブラックホール数
    if (blackholeCountElement) {
        blackholeCountElement.textContent = blackholes.length.toLocaleString();
    }
    
    // 総質量
    if (totalMassElement) {
        const totalMass = celestialBodies.reduce((sum, body) => sum + (body.userData.mass || 0), 0);
        totalMassElement.textContent = totalMass.toExponential(2);
    }
    
    // 平均温度
    if (avgTemperatureElement) {
        const temperaturesStars = stars.filter(star => star.userData.temperature);
        if (temperaturesStars.length > 0) {
            const avgTemp = temperaturesStars.reduce((sum, star) => sum + star.userData.temperature, 0) / temperaturesStars.length;
            avgTemperatureElement.textContent = Math.round(avgTemp) + 'K';
        } else {
            avgTemperatureElement.textContent = '0K';
        }
    }
}

// モバイルフォーカス情報の更新
function updateMobileFocusInfo() {
    const focusNameElement = document.getElementById('mobile-focus-name');
    const focusDetailsElement = document.getElementById('mobile-focus-details');
    const focusButton = document.getElementById('mobile-focus-star-button');
    
    if (!gameState.focusedObject) {
        if (focusNameElement) focusNameElement.textContent = 'なし';
        if (focusDetailsElement) focusDetailsElement.style.display = 'none';
        if (focusButton) focusButton.disabled = true;
        return;
    }
    
    const userData = gameState.focusedObject.userData;
    const typeText = userData.type === 'black_hole' ? 'ブラックホール' : 
                    (userData.spectralType || '恒星');
    
    if (focusNameElement) {
        focusNameElement.textContent = userData.name || 'N/A';
    }
    
    if (focusDetailsElement) {
        focusDetailsElement.style.display = 'block';
        
        // 詳細情報を更新
        const focusTypeElement = document.getElementById('mobile-focus-type');
        const focusMassElement = document.getElementById('mobile-focus-mass');
        const focusTemperatureElement = document.getElementById('mobile-focus-temperature');
        const focusAgeElement = document.getElementById('mobile-focus-age');
        const focusLifespanElement = document.getElementById('mobile-focus-lifespan');
        
        if (focusTypeElement) focusTypeElement.textContent = typeText;
        if (focusMassElement) focusMassElement.textContent = userData.mass ? userData.mass.toExponential(2) : '-';
        if (focusTemperatureElement) focusTemperatureElement.textContent = userData.temperature ? userData.temperature + 'K' : '-';
        if (focusAgeElement) focusAgeElement.textContent = userData.age ? parseFloat(userData.age).toFixed(2) + '億年' : '-';
        if (focusLifespanElement) focusLifespanElement.textContent = userData.lifespan ? userData.lifespan + '億年' : '-';
    }
    
    if (focusButton) {
        focusButton.disabled = false;
    }
}

// モバイル恒星管理表示の定期更新を追加
export function startMobileStarManagementUpdates() {
    if (!isMobileDevice()) return;
    
    // 2秒ごとに恒星リストを更新
    setInterval(updateMobileStarList, 2000);
}

// モバイルデフォルトグラフィック設定を適用
// 解像度スケール警告を更新
function updateResolutionWarning(scaleValue) {
    const hintElement = document.getElementById('mobile-resolution-hint');
    if (!hintElement) return;
    
    const scale = parseInt(scaleValue);
    
    // 警告レベルとメッセージを決定
    let className = '';
    let message = '';
    
    if (scale >= 150) {
        className = 'danger';
        message = '🔥 バッテリー消耗が激しいです！発熱にご注意ください';
    } else if (scale >= 125) {
        className = 'warning';
        message = '⚠️ バッテリー消耗が多くなります';
    } else if (scale >= 100) {
        className = '';
        message = '💡 標準的な品質です';
    } else if (scale >= 75) {
        className = '';
        message = '🔋 バッテリー節約モードです';
    } else {
        className = '';
        message = '🚀 超省電力モードです';
    }
    
    // スタイルを更新
    hintElement.className = 'mobile-setting-hint ' + className;
    hintElement.textContent = message;
}

function setMobileDefaultGraphicsSettings() {
    if (!isMobileDevice()) return;
    
    // デフォルト設定値
    const defaultSettings = {
        resolutionScale: '100',
        particleDensity: '75',
        frameRateLimit: '30',
        postProcessing: 'high',
        viewDistance: 'far'
    };
    
    // モバイル設定を更新
    const mobileResolutionSelect = document.getElementById('mobile-resolutionScaleSelect');
    const mobileParticleSelect = document.getElementById('mobile-particleDensitySelect');
    const mobileFrameRateSelect = document.getElementById('mobile-frameRateLimitSelect');
    const mobilePostProcessingSelect = document.getElementById('mobile-postProcessingSelect');
    const mobileViewDistanceSelect = document.getElementById('mobile-viewDistanceSelect');
    
    if (mobileResolutionSelect) {
        mobileResolutionSelect.value = defaultSettings.resolutionScale;
        mobileResolutionSelect.dispatchEvent(new Event('change'));
        // 警告メッセージも更新
        updateResolutionWarning(defaultSettings.resolutionScale);
    }
    
    if (mobileParticleSelect) {
        mobileParticleSelect.value = defaultSettings.particleDensity;
        mobileParticleSelect.dispatchEvent(new Event('change'));
    }
    
    if (mobileFrameRateSelect) {
        mobileFrameRateSelect.value = defaultSettings.frameRateLimit;
        mobileFrameRateSelect.dispatchEvent(new Event('change'));
    }
    
    if (mobilePostProcessingSelect) {
        mobilePostProcessingSelect.value = defaultSettings.postProcessing;
        mobilePostProcessingSelect.dispatchEvent(new Event('change'));
    }
    
    if (mobileViewDistanceSelect) {
        mobileViewDistanceSelect.value = defaultSettings.viewDistance;
        mobileViewDistanceSelect.dispatchEvent(new Event('change'));
    }
    
    console.log('📱 Default graphics settings applied:', defaultSettings);
}
