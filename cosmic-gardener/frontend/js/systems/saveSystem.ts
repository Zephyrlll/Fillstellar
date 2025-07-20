import { GameState } from '../state.js';
import { SaveData, SaveMetadata, GameNotification, GAME_VERSION, AUTO_SAVE_INTERVAL, SAVE_COMPRESSION_THRESHOLD } from '../types/idle.js';

export class SaveSystem {
  private readonly DB_NAME = 'CosmicGardenerDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'saves';
  private readonly SAVE_KEY = 'cosmic_gardener_save';
  private db: IDBDatabase | null = null;
  private autoSaveInterval: number | null = null;
  private isSaving = false;
  private notificationCallback?: (notification: GameNotification) => void;

  constructor() {
    this.initializeDB();
  }

  private async initializeDB(): Promise<void> {
    try {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
      
      request.onerror = () => {
        console.error('[SAVE] Failed to open IndexedDB:', request.error);
        this.fallbackToLocalStorage();
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[SAVE] IndexedDB initialized successfully');
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    } catch (error) {
      console.error('[SAVE] IndexedDB initialization failed:', error);
      this.fallbackToLocalStorage();
    }
  }

  private fallbackToLocalStorage(): void {
    console.warn('[SAVE] Falling back to localStorage');
  }

  public setNotificationCallback(callback: (notification: GameNotification) => void): void {
    this.notificationCallback = callback;
  }

  private showNotification(type: GameNotification['type'], message: string): void {
    if (this.notificationCallback) {
      this.notificationCallback({
        id: crypto.randomUUID(),
        type,
        message,
        timestamp: Date.now(),
        duration: 3000
      });
    }
  }

  public async save(gameState: GameState, slotId: string = 'main'): Promise<void> {
    if (this.isSaving) {
      console.warn('[SAVE] Save already in progress, skipping');
      return;
    }

    this.isSaving = true;
    
    try {
      const saveData: SaveData = {
        gameState,
        lastSaveTime: Date.now(),
        version: GAME_VERSION,
        checksum: this.generateChecksum(gameState)
      };

      // Compress if needed
      const dataSize = JSON.stringify(saveData).length;
      const shouldCompress = dataSize > SAVE_COMPRESSION_THRESHOLD;
      
      if (this.db) {
        await this.saveToIndexedDB(slotId, saveData, shouldCompress);
      } else {
        await this.saveToLocalStorage(slotId, saveData, shouldCompress);
      }

      this.showNotification('success', 'Game saved successfully');
      console.log('[SAVE] Save completed successfully');
    } catch (error) {
      console.error('[SAVE] Save failed:', error);
      this.showNotification('error', 'Failed to save game');
      
      // Try backup save
      await this.createBackupSave(gameState);
    } finally {
      this.isSaving = false;
    }
  }

  private async saveToIndexedDB(slotId: string, saveData: SaveData, compress: boolean): Promise<void> {
    if (!this.db) throw new Error('IndexedDB not initialized');

    const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
    const store = transaction.objectStore(this.STORE_NAME);

    const dataToStore = compress ? await this.compressData(saveData) : saveData;
    
    const saveRecord = {
      id: slotId,
      data: dataToStore,
      compressed: compress,
      metadata: this.createMetadata(saveData)
    };

    return new Promise((resolve, reject) => {
      const request = store.put(saveRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async saveToLocalStorage(slotId: string, saveData: SaveData, compress: boolean): Promise<void> {
    try {
      const key = `${this.SAVE_KEY}_${slotId}`;
      const dataToStore = compress ? await this.compressData(saveData) : saveData;
      
      localStorage.setItem(key, JSON.stringify({
        data: dataToStore,
        compressed: compress,
        metadata: this.createMetadata(saveData)
      }));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.error('[SAVE] Storage quota exceeded');
        this.clearOldSaves();
        throw new Error('Storage full. Please delete old saves.');
      }
      throw error;
    }
  }

  public async load(slotId: string = 'main'): Promise<GameState | null> {
    try {
      let saveRecord;
      
      if (this.db) {
        saveRecord = await this.loadFromIndexedDB(slotId);
      } else {
        saveRecord = await this.loadFromLocalStorage(slotId);
      }

      if (!saveRecord) {
        console.log('[SAVE] No save data found');
        return null;
      }

      const saveData: SaveData = saveRecord.compressed 
        ? await this.decompressData(saveRecord.data)
        : saveRecord.data;

      // Validate save data
      if (!this.validateSaveData(saveData)) {
        console.error('[SAVE] Save data validation failed');
        this.showNotification('error', 'Save file corrupted');
        return await this.loadBackupSave();
      }

      // Check version compatibility
      if (saveData.version !== GAME_VERSION) {
        console.warn('[SAVE] Save version mismatch, attempting migration');
        return this.migrateSaveData(saveData);
      }

      console.log('[SAVE] Game loaded successfully');
      return saveData.gameState;
    } catch (error) {
      console.error('[SAVE] Load failed:', error);
      this.showNotification('error', 'Failed to load game');
      return await this.loadBackupSave();
    }
  }

  private async loadFromIndexedDB(slotId: string): Promise<any> {
    if (!this.db) return null;

    const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
    const store = transaction.objectStore(this.STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(slotId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async loadFromLocalStorage(slotId: string): Promise<any> {
    const key = `${this.SAVE_KEY}_${slotId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  public startAutoSave(gameStateGetter: () => GameState): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    this.autoSaveInterval = window.setInterval(() => {
      const gameState = gameStateGetter();
      this.save(gameState).catch(error => {
        console.error('[SAVE] Auto-save failed:', error);
      });
    }, AUTO_SAVE_INTERVAL);

    console.log('[SAVE] Auto-save started (interval: 30s)');
  }

  public stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('[SAVE] Auto-save stopped');
    }
  }

  private async compressData(data: any): Promise<string> {
    // Using built-in compression where available
    const jsonString = JSON.stringify(data);
    
    if ('CompressionStream' in window) {
      const stream = new Response(jsonString).body!;
      const compressedStream = stream.pipeThrough(new (window as any).CompressionStream('gzip'));
      const response = await new Response(compressedStream).blob();
      return await response.text();
    }
    
    // Fallback: Simple base64 encoding (no real compression)
    return btoa(jsonString);
  }

  private async decompressData(data: string): Promise<any> {
    if ('DecompressionStream' in window) {
      try {
        const stream = new Response(data).body!;
        const decompressedStream = stream.pipeThrough(new (window as any).DecompressionStream('gzip'));
        const response = await new Response(decompressedStream).text();
        return JSON.parse(response);
      } catch {
        // Fall through to base64 decode
      }
    }
    
    // Fallback: Simple base64 decoding
    return JSON.parse(atob(data));
  }

  private generateChecksum(gameState: GameState): string {
    // Simple checksum for validation
    const str = JSON.stringify({
      gameYear: gameState.gameYear,
      resources: {
        cosmicDust: gameState.cosmicDust,
        energy: gameState.energy,
        darkMatter: gameState.darkMatter
      }
    });
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private validateSaveData(saveData: SaveData): boolean {
    if (!saveData || !saveData.gameState) return false;
    if (!saveData.checksum) return true; // Allow old saves without checksum
    
    const calculatedChecksum = this.generateChecksum(saveData.gameState);
    return calculatedChecksum === saveData.checksum;
  }

  private createMetadata(saveData: SaveData): SaveMetadata {
    const gameState = saveData.gameState;
    return {
      id: crypto.randomUUID(),
      name: `Year ${gameState.gameYear}`,
      timestamp: saveData.lastSaveTime,
      gameYear: gameState.gameYear,
      totalPlayTime: 0, // Will be implemented later
      version: saveData.version
    };
  }

  private async createBackupSave(gameState: GameState): Promise<void> {
    try {
      const backupId = 'backup_' + Date.now();
      await this.save(gameState, backupId);
      console.log('[SAVE] Backup save created:', backupId);
    } catch (error) {
      console.error('[SAVE] Failed to create backup:', error);
    }
  }

  private async loadBackupSave(): Promise<GameState | null> {
    // Try to load the most recent backup
    // Implementation depends on how we store multiple saves
    console.log('[SAVE] Attempting to load backup save');
    return null;
  }

  private clearOldSaves(): void {
    // Clear old saves to free up space
    console.log('[SAVE] Clearing old saves to free up space');
    // Implementation would clear old backup saves
  }

  private migrateSaveData(saveData: SaveData): GameState {
    console.log('[SAVE] Migrating save data from version', saveData.version, 'to', GAME_VERSION);
    // Add migration logic here as needed
    return saveData.gameState;
  }

  public async deleteSave(slotId: string = 'main'): Promise<void> {
    try {
      if (this.db) {
        const transaction = this.db.transaction([this.STORE_NAME], 'readwrite');
        const store = transaction.objectStore(this.STORE_NAME);
        await new Promise((resolve, reject) => {
          const request = store.delete(slotId);
          request.onsuccess = () => resolve(undefined);
          request.onerror = () => reject(request.error);
        });
      } else {
        const key = `${this.SAVE_KEY}_${slotId}`;
        localStorage.removeItem(key);
      }
      
      this.showNotification('info', 'Save deleted');
      console.log('[SAVE] Save deleted:', slotId);
    } catch (error) {
      console.error('[SAVE] Failed to delete save:', error);
      this.showNotification('error', 'Failed to delete save');
    }
  }

  public async listSaves(): Promise<SaveMetadata[]> {
    try {
      const saves: SaveMetadata[] = [];
      
      if (this.db) {
        const transaction = this.db.transaction([this.STORE_NAME], 'readonly');
        const store = transaction.objectStore(this.STORE_NAME);
        
        const records = await new Promise<any[]>((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        records.forEach(record => {
          if (record.metadata) {
            saves.push(record.metadata);
          }
        });
      } else {
        // Check localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith(this.SAVE_KEY)) {
            const data = localStorage.getItem(key);
            if (data) {
              const parsed = JSON.parse(data);
              if (parsed.metadata) {
                saves.push(parsed.metadata);
              }
            }
          }
        }
      }
      
      return saves.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[SAVE] Failed to list saves:', error);
      return [];
    }
  }
}