export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage?: number;
  objectCount: number;
  drawCalls?: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    objectCount: 0
  };
  
  private frameCount = 0;
  private lastTime = performance.now();
  private fpsUpdateInterval = 500; // Update FPS every 500ms
  private lastFpsUpdate = 0;
  
  private displayElement: HTMLDivElement | null = null;
  private isVisible = false;
  
  private constructor() {
    this.createDisplay();
  }
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  private createDisplay(): void {
    this.displayElement = document.createElement('div');
    this.displayElement.id = 'performance-monitor';
    this.displayElement.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #4a9eff;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 4px;
      z-index: 100000;
      display: none;
      pointer-events: none;
      min-width: 200px;
    `;
    document.body.appendChild(this.displayElement);
  }
  
  update(): void {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;
    
    this.frameCount++;
    this.metrics.frameTime = deltaTime;
    
    // Update FPS calculation
    if (now - this.lastFpsUpdate > this.fpsUpdateInterval) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      
      // Update memory usage if available
      if ((performance as any).memory) {
        this.metrics.memoryUsage = Math.round((performance as any).memory.usedJSHeapSize / 1048576);
      }
      
      this.updateDisplay();
    }
  }
  
  updateObjectCount(count: number): void {
    this.metrics.objectCount = count;
  }
  
  updateDrawCalls(count: number): void {
    this.metrics.drawCalls = count;
  }
  
  private updateDisplay(): void {
    if (!this.isVisible || !this.displayElement) return;
    
    const fpsColor = this.metrics.fps >= 55 ? '#4fff4f' : 
                     this.metrics.fps >= 30 ? '#ffff4f' : '#ff4f4f';
    
    this.displayElement.innerHTML = `
      <div style="margin-bottom: 5px;">
        <strong>Performance Monitor</strong>
      </div>
      <div>FPS: <span style="color: ${fpsColor}">${this.metrics.fps}</span></div>
      <div>Frame Time: ${this.metrics.frameTime.toFixed(2)}ms</div>
      <div>Objects: ${this.metrics.objectCount}</div>
      ${this.metrics.drawCalls ? `<div>Draw Calls: ${this.metrics.drawCalls}</div>` : ''}
      ${this.metrics.memoryUsage ? `<div>Memory: ${this.metrics.memoryUsage}MB</div>` : ''}
    `;
  }
  
  toggle(): void {
    this.isVisible = !this.isVisible;
    if (this.displayElement) {
      this.displayElement.style.display = this.isVisible ? 'block' : 'none';
    }
  }
  
  show(): void {
    this.isVisible = true;
    if (this.displayElement) {
      this.displayElement.style.display = 'block';
    }
  }
  
  hide(): void {
    this.isVisible = false;
    if (this.displayElement) {
      this.displayElement.style.display = 'none';
    }
  }
  
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  // Performance optimization suggestions
  checkPerformance(): string[] {
    const suggestions: string[] = [];
    
    if (this.metrics.fps < 30) {
      suggestions.push('Critical: FPS below 30 - Consider reducing object count or visual effects');
    } else if (this.metrics.fps < 55) {
      suggestions.push('Warning: FPS below 55 - Performance may be degraded');
    }
    
    if (this.metrics.objectCount > 1000) {
      suggestions.push('High object count - Consider using LOD or culling');
    }
    
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 500) {
      suggestions.push('High memory usage - Consider clearing unused resources');
    }
    
    if (this.metrics.frameTime > 33.33) {
      suggestions.push('Frame time exceeds 33ms - Optimize render loop');
    }
    
    return suggestions;
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();