import { gameState } from './state.js';

export class PerformanceMonitor {
    private lastFrameTime: number = 0;
    private frameCount: number = 0;
    private fpsUpdateInterval: number = 1000; // 1 second
    private lastFpsUpdate: number = 0;
    private maxHistoryPoints: number = 60; // Store last 60 seconds of data
    
    private memoryUpdateInterval: number = 5000; // 5 seconds
    private lastMemoryUpdate: number = 0;
    
    private frameTimeHistory: number[] = [];
    private maxFrameTimeHistory: number = 120; // Store last 120 frames
    
    constructor() {
        this.detectDeviceInfo();
        this.startMonitoring();
    }
    
    // Start the monitoring process
    startMonitoring(): void {
        this.lastFrameTime = performance.now();
        this.lastFpsUpdate = this.lastFrameTime;
        this.lastMemoryUpdate = this.lastFrameTime;
    }
    
    // Called once per frame to update performance metrics
    update(): void {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        // Update frame time
        gameState.graphics.performance.frameTime = deltaTime;
        this.frameTimeHistory.push(deltaTime);
        if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
            this.frameTimeHistory.shift();
        }
        
        this.frameCount++;
        
        // Update FPS every second
        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            gameState.graphics.performance.fps = fps;
            
            // Update average FPS (simple moving average)
            if (gameState.graphics.performance.averageFps === 0) {
                gameState.graphics.performance.averageFps = fps;
            } else {
                gameState.graphics.performance.averageFps = Math.round(
                    (gameState.graphics.performance.averageFps * 0.9) + (fps * 0.1)
                );
            }
            
            // Add to history
            this.addToHistory(fps, deltaTime);
            
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
        
        // Update memory usage every 5 seconds
        if (currentTime - this.lastMemoryUpdate >= this.memoryUpdateInterval) {
            this.updateMemoryUsage();
            this.lastMemoryUpdate = currentTime;
        }
        
        this.lastFrameTime = currentTime;
    }
    
    // Add performance data to history
    private addToHistory(fps: number, frameTime: number): void {
        const memoryUsage = gameState.graphics.performance.memoryUsage;
        
        gameState.graphics.performance.history.push({
            time: Date.now(),
            fps: fps,
            frameTime: frameTime,
            memory: memoryUsage
        });
        
        // Keep only the last maxHistoryPoints entries
        if (gameState.graphics.performance.history.length > this.maxHistoryPoints) {
            gameState.graphics.performance.history.shift();
        }
    }
    
    // Update memory usage information
    private updateMemoryUsage(): void {
        // @ts-ignore - performance.memory is not in standard types but exists in Chrome
        if (performance.memory) {
            // @ts-ignore
            const memInfo = performance.memory;
            gameState.graphics.performance.memoryUsage = Math.round(
                memInfo.usedJSHeapSize / (1024 * 1024) // Convert to MB
            );
        } else {
            // Fallback: estimate based on objects in scene
            gameState.graphics.performance.memoryUsage = this.estimateMemoryUsage();
        }
    }
    
    // Estimate memory usage when performance.memory is not available
    private estimateMemoryUsage(): number {
        // Rough estimation based on scene complexity
        const baseMemory = 50; // Base app memory in MB
        const objectCount = gameState.stars.length;
        const memoryPerObject = 0.1; // Estimated MB per celestial body
        
        return Math.round(baseMemory + (objectCount * memoryPerObject));
    }
    
    // Detect device information for auto-optimization
    private detectDeviceInfo(): void {
        const deviceInfo = gameState.graphics.deviceInfo;
        
        // Platform detection
        deviceInfo.platform = this.detectPlatform();
        
        // CPU cores
        deviceInfo.cores = navigator.hardwareConcurrency || 4;
        
        // Memory (rough estimation)
        // @ts-ignore
        if (navigator.deviceMemory) {
            // @ts-ignore
            deviceInfo.memory = navigator.deviceMemory;
        } else {
            deviceInfo.memory = this.estimateDeviceMemory();
        }
        
        // GPU information
        this.detectGPUInfo();
        
        // WebGL version
        deviceInfo.webglVersion = this.detectWebGLVersion();
        
        // Determine if device is high-end
        deviceInfo.isHighEnd = this.isHighEndDevice();
        
        // Recommend preset based on device capabilities
        deviceInfo.recommendedPreset = this.recommendPreset();
    }
    
    private detectPlatform(): string {
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('mobile') || userAgent.includes('android')) {
            return 'mobile';
        } else if (userAgent.includes('tablet') || userAgent.includes('ipad')) {
            return 'tablet';
        } else {
            return 'desktop';
        }
    }
    
    private estimateDeviceMemory(): number {
        // Fallback memory estimation based on platform
        const platform = gameState.graphics.deviceInfo.platform;
        
        switch (platform) {
            case 'mobile':
                return 4; // 4GB typical for modern mobile devices
            case 'tablet':
                return 6; // 6GB typical for tablets
            case 'desktop':
            default:
                return 8; // 8GB typical for desktop
        }
    }
    
    private detectGPUInfo(): void {
        try {
            // Create a temporary canvas to get WebGL context
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
            
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    gameState.graphics.deviceInfo.gpu = `${vendor} ${renderer}`;
                } else {
                    gameState.graphics.deviceInfo.gpu = 'WebGL GPU (info unavailable)';
                }
            } else {
                gameState.graphics.deviceInfo.gpu = 'WebGL not supported';
            }
        } catch (e) {
            gameState.graphics.deviceInfo.gpu = 'GPU detection failed';
        }
    }
    
    private detectWebGLVersion(): string {
        try {
            const canvas = document.createElement('canvas');
            
            if (canvas.getContext('webgl2') as WebGL2RenderingContext) {
                return 'WebGL 2.0';
            } else if (canvas.getContext('webgl') as WebGLRenderingContext || canvas.getContext('experimental-webgl') as WebGLRenderingContext) {
                return 'WebGL 1.0';
            } else {
                return 'Not supported';
            }
        } catch (e) {
            return 'Detection failed';
        }
    }
    
    private isHighEndDevice(): boolean {
        const deviceInfo = gameState.graphics.deviceInfo;
        
        // High-end criteria
        const hasEnoughMemory = deviceInfo.memory >= 8;
        const hasEnoughCores = deviceInfo.cores >= 4;
        const isDesktop = deviceInfo.platform === 'desktop';
        const hasWebGL2 = deviceInfo.webglVersion.includes('2.0');
        const hasModernGPU = this.hasModernGPU();
        
        return hasEnoughMemory && hasEnoughCores && (isDesktop || hasWebGL2) && hasModernGPU;
    }
    
    private hasModernGPU(): boolean {
        const gpu = gameState.graphics.deviceInfo.gpu.toLowerCase();
        
        // Check for modern GPU indicators
        const modernGPUKeywords = [
            'rtx', 'gtx 10', 'gtx 16', 'gtx 20', 'gtx 30', 'gtx 40',
            'radeon rx', 'radeon pro', 'intel iris', 'intel xe',
            'apple m1', 'apple m2', 'adreno 6', 'adreno 7',
            'mali-g7', 'mali-g9', 'powervr series 9'
        ];
        
        return modernGPUKeywords.some(keyword => gpu.includes(keyword));
    }
    
    private recommendPreset(): string {
        const deviceInfo = gameState.graphics.deviceInfo;
        
        if (deviceInfo.isHighEnd && deviceInfo.platform === 'desktop') {
            return 'high';
        } else if (deviceInfo.memory >= 6 && deviceInfo.cores >= 4) {
            return 'medium';
        } else if (deviceInfo.platform === 'mobile') {
            return 'low';
        } else {
            return 'minimal';
        }
    }
    
    // Get current FPS
    getCurrentFPS(): number {
        return gameState.graphics.performance.fps;
    }
    
    // Get average frame time over recent frames
    getAverageFrameTime(): number {
        if (this.frameTimeHistory.length === 0) return 0;
        
        const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
        return sum / this.frameTimeHistory.length;
    }
    
    // Check if performance is below target
    isPerformanceBelowTarget(targetFPS: number = 30): boolean {
        return gameState.graphics.performance.averageFps < targetFPS;
    }
    
    // Get performance summary for UI display
    getPerformanceSummary(): string {
        const perf = gameState.graphics.performance;
        const device = gameState.graphics.deviceInfo;
        
        return `FPS: ${perf.fps} (avg: ${perf.averageFps}) | ` +
               `Frame: ${perf.frameTime.toFixed(1)}ms | ` +
               `Memory: ${perf.memoryUsage}MB | ` +
               `GPU: ${device.gpu}`;
    }
    
    // Reset performance history (useful when changing settings)
    resetHistory(): void {
        gameState.graphics.performance.history = [];
        this.frameTimeHistory = [];
        gameState.graphics.performance.averageFps = 60; // Reset to default
    }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();