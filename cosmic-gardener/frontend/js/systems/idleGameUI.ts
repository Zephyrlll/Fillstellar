import { SaveSystem } from './saveSystem.js';
import { gameState } from '../state.js';
import { OfflineCalculator } from './offlineProgress.js';
import { saveGame } from '../saveload.js';

// Initialize systems
const saveSystem = new SaveSystem();
const offlineCalculator = new OfflineCalculator();

// Format time for display
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) { // Less than 1 minute
    return '数秒前';
  } else if (diff < 3600000) { // Less than 1 hour
    const minutes = Math.floor(diff / 60000);
    return `${minutes}分前`;
  } else if (diff < 86400000) { // Less than 1 day
    const hours = Math.floor(diff / 3600000);
    return `${hours}時間前`;
  } else {
    return date.toLocaleString('ja-JP');
  }
}

// Update last save time display
function updateLastSaveDisplay(): void {
  const lastSaveTime = gameState.lastSaveTime;
  if (lastSaveTime) {
    const formattedTime = formatTime(lastSaveTime);
    
    // Update desktop display
    const desktopElement = document.getElementById('lastSaveTime');
    if (desktopElement) {
      desktopElement.textContent = formattedTime;
    }
    
    // Update mobile display
    const mobileElement = document.getElementById('mobile-lastSaveTime');
    if (mobileElement) {
      mobileElement.textContent = formattedTime;
    }
  }
}

// Initialize save/load UI
export function initializeSaveLoadUI(): void {
  // Desktop save button
  const saveButton = document.getElementById('saveGameButton');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        // Update game state timestamps
        gameState.lastSaveTime = Date.now();
        
        // Use the new save system
        await saveSystem.save(gameState);
        
        // Also save using the old system for compatibility
        saveGame();
        
        updateLastSaveDisplay();
      } catch (error) {
        console.error('[SAVE] Failed to save game:', error);
      }
    });
  }
  
  // Mobile save button
  const mobileSaveButton = document.getElementById('mobile-saveGameButton');
  if (mobileSaveButton) {
    mobileSaveButton.addEventListener('click', async () => {
      try {
        gameState.lastSaveTime = Date.now();
        await saveSystem.save(gameState);
        saveGame();
        updateLastSaveDisplay();
      } catch (error) {
        console.error('[SAVE] Failed to save game:', error);
      }
    });
  }
  
  // Desktop load button
  const loadButton = document.getElementById('loadGameButton');
  if (loadButton) {
    loadButton.addEventListener('click', async () => {
      if (confirm('現在の進行状況は失われます。本当にロードしますか？')) {
        try {
          const loadedState = await saveSystem.load();
          if (loadedState) {
            // Apply loaded state to game
            Object.assign(gameState, loadedState);
            
            // Reload the page to apply changes
            window.location.reload();
          }
        } catch (error) {
          console.error('[LOAD] Failed to load game:', error);
        }
      }
    });
  }
  
  // Mobile load button
  const mobileLoadButton = document.getElementById('mobile-loadGameButton');
  if (mobileLoadButton) {
    mobileLoadButton.addEventListener('click', async () => {
      if (confirm('現在の進行状況は失われます。本当にロードしますか？')) {
        try {
          const loadedState = await saveSystem.load();
          if (loadedState) {
            Object.assign(gameState, loadedState);
            window.location.reload();
          }
        } catch (error) {
          console.error('[LOAD] Failed to load game:', error);
        }
      }
    });
  }
  
  // Auto-save checkbox
  const autoSaveCheckbox = document.getElementById('autoSaveCheckbox') as HTMLInputElement;
  const mobileAutoSaveCheckbox = document.getElementById('mobile-autoSaveCheckbox') as HTMLInputElement;
  
  if (autoSaveCheckbox) {
    autoSaveCheckbox.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      if (enabled) {
        startAutoSave();
      } else {
        stopAutoSave();
      }
      
      // Sync mobile checkbox
      if (mobileAutoSaveCheckbox) {
        mobileAutoSaveCheckbox.checked = enabled;
      }
    });
  }
  
  if (mobileAutoSaveCheckbox) {
    mobileAutoSaveCheckbox.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      if (enabled) {
        startAutoSave();
      } else {
        stopAutoSave();
      }
      
      // Sync desktop checkbox
      if (autoSaveCheckbox) {
        autoSaveCheckbox.checked = enabled;
      }
    });
  }
  
  // Update last save display periodically
  setInterval(updateLastSaveDisplay, 5000);
  updateLastSaveDisplay();
  
  console.log('[IDLE] Save/Load UI initialized');
}

// Auto-save management
let autoSaveStarted = false;

function startAutoSave(): void {
  if (!autoSaveStarted) {
    saveSystem.startAutoSave(() => gameState);
    autoSaveStarted = true;
    console.log('[IDLE] Auto-save enabled');
  }
}

function stopAutoSave(): void {
  saveSystem.stopAutoSave();
  autoSaveStarted = false;
  console.log('[IDLE] Auto-save disabled');
}

// Export systems for use in other modules
export { saveSystem, offlineCalculator };