import { gameState, gameStateManager } from './state.js';
export function addTimelineLog(message, type = 'event') {
    const logEntry = {
        id: Date.now() + Math.random(),
        year: Math.floor(gameState.gameYear),
        message: message,
        type: type,
        timestamp: Date.now()
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
    if (!logContainer)
        return;
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
