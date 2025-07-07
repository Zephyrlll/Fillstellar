import { gameState } from './state.js';

export function addTimelineLog(message, type = 'event') {
    const logEntry = {
        id: Date.now() + Math.random(),
        year: Math.floor(gameState.gameYear),
        message: message,
        type: type,
        timestamp: Date.now()
    };
    
    // 新しいログエントリを先頭に追加
    gameState.timelineLog.unshift(logEntry);
    
    // 最大保持数を超えた場合、古いエントリを削除
    if (gameState.timelineLog.length > gameState.maxLogEntries) {
        gameState.timelineLog = gameState.timelineLog.slice(0, gameState.maxLogEntries);
    }
    
    // UIを更新
    updateTimelineLogDisplay();
}

function updateTimelineLogDisplay() {
    const logContainer = document.getElementById('timeline-log-entries');
    if (!logContainer) return;
    
    // 既存のエントリをクリア
    logContainer.innerHTML = '';
    
    // ログエントリを表示
    gameState.timelineLog.forEach(entry => {
        const logElement = document.createElement('div');
        logElement.className = 'timeline-log-entry';
        logElement.innerHTML = `
            <span class="log-year">${entry.year}年</span>
            <span class="log-message">${entry.message}</span>
        `;
        logContainer.appendChild(logElement);
    });
    
    // 最新のログエントリが見えるように、自動スクロールを一番上に
    const logContent = document.getElementById('timeline-log-content');
    if (logContent) {
        logContent.scrollTop = 0;
    }
}

export function clearTimelineLog() {
    gameState.timelineLog = [];
    updateTimelineLogDisplay();
}
