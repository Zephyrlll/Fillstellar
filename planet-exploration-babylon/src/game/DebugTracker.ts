import * as BABYLON from '@babylonjs/core';

export class DebugTracker {
    private static instance: DebugTracker;
    private logs: string[] = [];
    private avatarPositionHistory: { time: number; position: BABYLON.Vector3; source: string }[] = [];
    private startTime: number = Date.now();
    
    static getInstance(): DebugTracker {
        if (!DebugTracker.instance) {
            DebugTracker.instance = new DebugTracker();
        }
        return DebugTracker.instance;
    }
    
    log(source: string, message: string, data?: any): void {
        const timestamp = Date.now() - this.startTime;
        const logEntry = `[${timestamp}ms] [${source}] ${message}`;
        
        console.log(logEntry, data);
        this.logs.push(logEntry);
        
        if (data && data instanceof Error) {
            console.error(data.stack);
        }
    }
    
    trackAvatarPosition(position: BABYLON.Vector3, source: string): void {
        const timestamp = Date.now() - this.startTime;
        const entry = {
            time: timestamp,
            position: position.clone(),
            source: source
        };
        
        this.avatarPositionHistory.push(entry);
        
        // 位置が大きく変わった場合は警告
        if (this.avatarPositionHistory.length > 1) {
            const prev = this.avatarPositionHistory[this.avatarPositionHistory.length - 2];
            const distanceChange = position.subtract(prev.position).length();
            
            if (distanceChange > 10) {
                console.error(`[DEBUG_TRACKER] LARGE POSITION CHANGE DETECTED!`);
                console.error(`  From: ${prev.position} (${prev.source} at ${prev.time}ms)`);
                console.error(`  To: ${position} (${source} at ${timestamp}ms)`);
                console.error(`  Distance change: ${distanceChange}`);
                console.error(`  Time delta: ${timestamp - prev.time}ms`);
            }
        }
    }
    
    printSummary(): void {
        console.log('=== DEBUG TRACKER SUMMARY ===');
        console.log('Total logs:', this.logs.length);
        console.log('Avatar position history:', this.avatarPositionHistory.length);
        
        console.log('\n=== AVATAR POSITION TIMELINE ===');
        this.avatarPositionHistory.forEach((entry, i) => {
            console.log(`${i}: [${entry.time}ms] ${entry.source}: ${entry.position} (distance: ${entry.position.length()})`);
        });
    }
}