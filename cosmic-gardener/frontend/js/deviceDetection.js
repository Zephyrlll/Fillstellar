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
