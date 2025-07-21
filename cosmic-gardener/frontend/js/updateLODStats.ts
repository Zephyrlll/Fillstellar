import { ui } from './ui.js';
import { LODManager } from './systems/lodManager.js';

let lastLODChanges = 0;
let lastUpdateTime = Date.now();

export function updateLODStatistics(): void {
    // Get LOD manager instance from window
    const lodManager = (window as any).lodManager as LODManager;
    if (!lodManager) return;
    
    const metrics = lodManager.getMetrics();
    const currentTime = Date.now();
    const deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
    
    // Update visible bodies count
    if (ui.lodVisibleBodies) {
        ui.lodVisibleBodies.textContent = metrics.visibleBodies.toString();
    }
    
    // Update culled bodies count
    if (ui.lodCulledBodies) {
        ui.lodCulledBodies.textContent = metrics.culledBodies.toString();
    }
    
    // Calculate LOD changes per second
    if (ui.lodChangesPerSec && deltaTime > 0) {
        const changesPerSec = (metrics.lodChanges - lastLODChanges) / deltaTime;
        ui.lodChangesPerSec.textContent = changesPerSec.toFixed(1);
        lastLODChanges = metrics.lodChanges;
    }
    
    lastUpdateTime = currentTime;
}