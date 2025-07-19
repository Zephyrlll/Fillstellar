import { gameState, gameStateManager } from './state.js';

// タイムラインログの更新頻度を制限
let lastLogTime = 0;
const LOG_THROTTLE_MS = 100; // 100ms = 0.1秒の間隔を開ける

export function addTimelineLog(message: string, type = 'event') {
    // 更新頻度の制限
    const now = Date.now();
    if (now - lastLogTime < LOG_THROTTLE_MS) {
        return; // スキップ
    }
    lastLogTime = now;
    
    const logEntry = {
        id: now + Math.random(),
        year: Math.floor(gameState.gameYear),
        message: message,
        type: type,
        timestamp: now
    };
    
    gameStateManager.updateState(state => {
        const newLog = [logEntry, ...state.timelineLog];
        return {
            ...state,
            timelineLog: newLog.slice(0, state.maxLogEntries)
        };
    });
    
    updateTimelineLogDisplay();
}

function updateTimelineLogDisplay() {
    const logContainer = document.getElementById('timeline-log-entries');
    if (!logContainer) return;
    
    logContainer.innerHTML = '';
    
    gameState.timelineLog.forEach(entry => {
        const logElement = document.createElement('div');
        logElement.className = 'timeline-log-entry';
        logElement.innerHTML = `
            <span class="log-year">${entry.year}年</span>
            <span class="log-message">${entry.message}</span>
        `;
        logContainer.appendChild(logElement);
    });
    
    const logContent = document.getElementById('timeline-log-content');
    if (logContent) {
        logContent.scrollTop = 0;
    }
}

export function clearTimelineLog() {
    gameStateManager.updateState(state => ({
        ...state,
        timelineLog: []
    }));
    updateTimelineLogDisplay();
}