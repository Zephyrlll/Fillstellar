import { gameState } from './state.js';

export function addTimelineLog(message: string, type = 'event') {
    const logEntry = {
        id: Date.now() + Math.random(),
        year: Math.floor(gameState.gameYear),
        message: message,
        type: type,
        timestamp: Date.now()
    };
    
    gameState.timelineLog.unshift(logEntry);
    
    if (gameState.timelineLog.length > gameState.maxLogEntries) {
        gameState.timelineLog = gameState.timelineLog.slice(0, gameState.maxLogEntries);
    }
    
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
    gameState.timelineLog = [];
    updateTimelineLogDisplay();
}