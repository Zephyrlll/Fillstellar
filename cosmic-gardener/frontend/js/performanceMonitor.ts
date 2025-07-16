import { gameState, gameStateManager } from './state.js';

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
    private currentFrameTime: number = 0; // Store current frame time locally
    private deviceInfoDetected: boolean = false; // Track if device info was already detected
    
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
        
        // Store frame time locally, only update state on FPS update
        this.currentFrameTime = deltaTime;
        this.frameTimeHistory.push(deltaTime);
        if (this.frameTimeHistory.length > this.maxFrameTimeHistory) {
            this.frameTimeHistory.shift();
        }
        
        this.frameCount++;
        
        // Update FPS every second
        if (currentTime - this.lastFpsUpdate >= this.fpsUpdateInterval) {
            const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFpsUpdate));
            const currentPerformance = gameState.graphics.performance;
            const averageFps = currentPerformance.averageFps === 0 ? fps : 
                Math.round((currentPerformance.averageFps * 0.9) + (fps * 0.1));
            
            // Batch update FPS, averageFPS, frameTime AND history together
            gameStateManager.updateState(state => {
                const currentHistory = [...state.graphics.performance.history];
                
                // Add new entry to history
                currentHistory.push({
                    time: Date.now(),
                    fps: fps,
                    frameTime: deltaTime,
                    memory: state.graphics.performance.memoryUsage
                });
                
                // Keep only the last maxHistoryPoints entries
                if (currentHistory.length > this.maxHistoryPoints) {
                    currentHistory.shift();
                }
                
                return {
                    ...state,
                    graphics: {
                        ...state.graphics,
                        performance: {
                            ...state.graphics.performance,
                            fps: fps,
                            averageFps: averageFps,
                            frameTime: this.currentFrameTime,
                            history: currentHistory
                        }
                    }
                };
            });
            
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
    
    
    // Update memory usage information
    private updateMemoryUsage(): void {
        let memoryUsage: number;
        
        // @ts-ignore - performance.memory is not in standard types but exists in Chrome
        if (performance.memory) {
            // @ts-ignore
            const memInfo = performance.memory;
            memoryUsage = Math.round(memInfo.usedJSHeapSize / (1024 * 1024)); // Convert to MB
        } else {
            // Fallback: estimate based on objects in scene
            memoryUsage = this.estimateMemoryUsage();
        }
        
        gameStateManager.updateState(state => ({
            ...state,
            graphics: {
                ...state.graphics,
                performance: {
                    ...state.graphics.performance,
                    memoryUsage: memoryUsage
                }
            }
        }));
    }
    
    // Estimate memory usage when performance.memory is not available
    private estimateMemoryUsage(): number {
        // Rough estimation based on scene complexity
        const baseMemory = 50; // Base app memory in MB
        const objectCount = gameState.stars.length;
        const memoryPerObject = 0.1; // Estimated MB per celestial body
        
        return Math.round(baseMemory + (objectCount * memoryPerObject));
    }
    
    private estimateDeviceMemory(): number {
        // Fallback memory estimation based on platform
        const platform = this.detectPlatform();
        return this.estimateDeviceMemoryByPlatform(platform);
    }
    
    private estimateDeviceMemoryByPlatform(platform: string): number {
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
    
    private isHighEndDeviceByInfo(deviceInfo: any): boolean {
        // High-end criteria
        const hasEnoughMemory = deviceInfo.memory >= 8;
        const hasEnoughCores = deviceInfo.cores >= 4;
        const isDesktop = deviceInfo.platform === 'desktop';
        const hasWebGL2 = deviceInfo.webglVersion.includes('2.0');
        const hasModernGPU = this.hasModernGPUByInfo(deviceInfo);
        
        return hasEnoughMemory && hasEnoughCores && (isDesktop || hasWebGL2) && hasModernGPU;
    }
    
    private hasModernGPUByInfo(deviceInfo: any): boolean {
        const gpu = deviceInfo.gpu.toLowerCase();
        // Check for modern GPU indicators
        const modernGPUKeywords = [
            'rtx', 'gtx 10', 'gtx 16', 'gtx 20', 'gtx 30', 'gtx 40',
            'radeon rx', 'radeon pro', 'intel iris', 'intel xe',
            'apple m1', 'apple m2', 'adreno 6', 'adreno 7',
            'mali-g7', 'mali-g9', 'powervr series 9'
        ];
        return modernGPUKeywords.some(keyword => gpu.includes(keyword));
    }
    
    private recommendPresetByInfo(deviceInfo: any): string {
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
    
    // Detect device information for auto-optimization
    private detectDeviceInfo(): void {
        // Only detect once to prevent infinite loops
        if (this.deviceInfoDetected) return;
        this.deviceInfoDetected = true;
        
        const platform = this.detectPlatform();
        const cores = navigator.hardwareConcurrency || 4;
        
        // Memory (rough estimation)
        let memory: number;
        // @ts-ignore
        if (navigator.deviceMemory) {
            // @ts-ignore
            memory = navigator.deviceMemory;
        } else {
            memory = this.estimateDeviceMemory();
        }
        
        // GPU information
        const gpu = this.detectGPUInfo();
        
        // WebGL version
        const webglVersion = this.detectWebGLVersion();
        
        // Create complete device info object first
        const deviceInfo = {
            platform,
            cores,
            memory,
            gpu,
            webglVersion,
            isHighEnd: false,
            recommendedPreset: 'medium' as const
        };
        
        // Determine if device is high-end using the new device info
        deviceInfo.isHighEnd = this.isHighEndDeviceByInfo(deviceInfo);
        
        // Recommend preset based on device capabilities
        deviceInfo.recommendedPreset = this.recommendPresetByInfo(deviceInfo) as any;
        
        // Update device info via state manager
        gameStateManager.updateState(state => ({
            ...state,
            graphics: {
                ...state.graphics,
                deviceInfo
            }
        }));
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
    
    
    private detectGPUInfo(): string {
        try {
            // Create a temporary canvas to get WebGL context
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
            
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                    return `${vendor} ${renderer}`;
                } else {
                    return 'WebGL GPU (info unavailable)';
                }
            } else {
                return 'WebGL not supported';
            }
        } catch (e) {
            return 'GPU detection failed';
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
        return this.isHighEndDeviceByInfo(deviceInfo);
    }
    
    private hasModernGPU(): boolean {
        const gpu = gameState.graphics.deviceInfo.gpu.toLowerCase();
        return this.hasModernGPUByInfo({ gpu });
    }
    
    private recommendPreset(): string {
        const deviceInfo = gameState.graphics.deviceInfo;
        return this.recommendPresetByInfo(deviceInfo);
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
        this.frameTimeHistory = [];
        gameStateManager.updateState(state => ({
            ...state,
            graphics: {
                ...state.graphics,
                performance: {
                    ...state.graphics.performance,
                    history: [],
                    averageFps: 60 // Reset to default
                }
            }
        }));
    }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();