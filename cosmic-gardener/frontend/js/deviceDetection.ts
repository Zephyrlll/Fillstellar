import { gameState, gameStateManager } from './state.js';

// デバイス検出ユーティリティ
export function detectDevice(): void {
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
        
        gameStateManager.updateState(state => ({
            ...state,
            deviceInfo: {
                isMobile,
                isDesktop,
                screenWidth,
                screenHeight,
                userAgent,
                hasTouchSupport,
                lastDetectionTime: currentTime
            }
        }));
        
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
function adjustUIForDevice(): void {
    const { isMobile } = gameState.deviceInfo!;
    const body = document.body;
    
    // 既存のデバイス関連クラスを削除
    body.classList.remove('mobile-device', 'desktop-device');
    
    // 新しいデバイス情報に基づいてクラスを追加
    if (isMobile) {
        body.classList.add('mobile-device');
        console.log('📱 Mobile UI layout applied');
    } else {
        body.classList.add('desktop-device');
        console.log('💻 Desktop UI layout applied');
    }
}

// ウィンドウリサイズ時のデバイス再検出
export function setupDeviceDetection(): void {
    // 初回検出
    detectDevice();
    
    // リサイズ時の再検出（デバウンス付き）
    let resizeTimeout: ReturnType<typeof setTimeout>;
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
export function isMobileDevice(): boolean {
    return gameState.deviceInfo?.isMobile || false;
}

// デスクトップデバイスかどうかを判定
export function isDesktopDevice(): boolean {
    return gameState.deviceInfo?.isDesktop || true;
}

// モバイルデバイス向けナビゲーション更新
export function startMobileNavUpdates(): void {
    if (!isMobileDevice()) return;
    
    // モバイル向けナビゲーション調整
    const navElements = document.querySelectorAll('.nav-item');
    navElements.forEach(element => {
        (element as HTMLElement).style.fontSize = '14px';
        (element as HTMLElement).style.padding = '8px';
    });
    
    console.log('[MOBILE] Navigation updates applied');
}

// モバイルデバイス向けゲーム更新
export function startMobileGameUpdates(): void {
    if (!isMobileDevice()) return;
    
    // モバイル向けゲーム調整
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) {
        (gameContainer as HTMLElement).style.fontSize = '14px';
    }
    
    // タッチ操作の最適化
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.style.minHeight = '44px'; // タッチしやすい最小サイズ
        button.style.fontSize = '14px';
    });
    
    console.log('[MOBILE] Game updates applied');
}

// モバイルデバイス向け設定更新
export function startMobileSettingsUpdates(): void {
    if (!isMobileDevice()) return;
    
    // モバイル向け設定調整
    const settingsElements = document.querySelectorAll('.settings-item');
    settingsElements.forEach(element => {
        (element as HTMLElement).style.fontSize = '14px';
        (element as HTMLElement).style.padding = '12px';
    });
    
    console.log('[MOBILE] Settings updates applied');
}

// モバイルデバイス向け星管理更新
export function startMobileStarManagementUpdates(): void {
    if (!isMobileDevice()) return;
    
    // モバイル向け星管理調整
    const starElements = document.querySelectorAll('.star-item');
    starElements.forEach(element => {
        (element as HTMLElement).style.fontSize = '14px';
        (element as HTMLElement).style.padding = '10px';
    });
    
    console.log('[MOBILE] Star management updates applied');
}