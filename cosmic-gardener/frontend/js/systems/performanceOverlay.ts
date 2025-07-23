import * as THREE from 'three';
import { renderer } from '../threeSetup.js';

export interface PerformanceStats {
  fps: number;
  frameTime: number;
  gpuUsage?: number;
  gpuTemp?: number;
  vramUsage?: number;
  vramTotal?: number;
  drawCalls?: number;
  triangles?: number;
  textures?: number;
  programs?: number;
}

export class PerformanceOverlay {
  private container: HTMLDivElement;
  private fpsElement: HTMLDivElement | null = null;
  private statsElement: HTMLDivElement | null = null;
  private overlayElement: HTMLDivElement | null = null;
  
  private lastTime: number = performance.now();
  private frames: number = 0;
  private fps: number = 0;
  private frameTimeHistory: number[] = [];
  private fpsHistory: number[] = [];
  private maxHistoryLength: number = 60;
  
  private isVisible: boolean = false;
  private mode: 'off' | 'fps' | 'simple' | 'detailed' | 'graphs' = 'off';
  private showGpuStats: boolean = false;
  
  // Canvas for graphs
  private graphCanvas: HTMLCanvasElement | null = null;
  private graphContext: CanvasRenderingContext2D | null = null;
  
  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'performance-overlay-container';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 100000;
      pointer-events: none;
      font-family: monospace;
      font-size: 12px;
      line-height: 1.4;
    `;
    document.body.appendChild(this.container);
  }
  
  public setFPSCounterVisibility(visible: boolean): void {
    const wasFPSOnly = this.mode === 'fps' || (this.mode === 'off' && this.fpsElement);
    
    if (visible) {
      if (this.mode === 'off') {
        this.mode = 'fps';
        this.createFPSCounter();
      }
    } else {
      if (wasFPSOnly) {
        this.mode = 'off';
        this.clearDisplay();
      }
    }
    
    this.updateVisibility();
  }
  
  public setGPUStatsVisibility(visible: boolean): void {
    this.showGpuStats = visible;
    
    if (this.mode !== 'off' && this.mode !== 'fps') {
      this.updateDisplay();
    }
  }
  
  public setOverlayMode(mode: 'off' | 'simple' | 'detailed' | 'graphs'): void {
    // FPSカウンターが有効な場合は、offにしない
    if (mode === 'off' && this.fpsElement) {
      return;
    }
    
    this.mode = mode === 'off' ? 'off' : mode;
    this.clearDisplay();
    
    switch (this.mode) {
      case 'simple':
        this.createSimpleOverlay();
        break;
      case 'detailed':
        this.createDetailedOverlay();
        break;
      case 'graphs':
        this.createGraphsOverlay();
        break;
    }
    
    this.updateVisibility();
  }
  
  private createFPSCounter(): void {
    if (this.fpsElement) return;
    
    this.fpsElement = document.createElement('div');
    this.fpsElement.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 4px 8px;
      border-radius: 4px;
      border: 1px solid #00ff00;
      display: inline-block;
      text-shadow: 0 0 2px #00ff00;
    `;
    this.container.appendChild(this.fpsElement);
  }
  
  private createSimpleOverlay(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.style.cssText = `
      background: rgba(0, 0, 0, 0.8);
      color: #ffffff;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #666;
      min-width: 200px;
    `;
    this.container.appendChild(this.overlayElement);
  }
  
  private createDetailedOverlay(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.style.cssText = `
      background: rgba(0, 0, 0, 0.9);
      color: #ffffff;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #666;
      min-width: 300px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    `;
    this.container.appendChild(this.overlayElement);
  }
  
  private createGraphsOverlay(): void {
    this.overlayElement = document.createElement('div');
    this.overlayElement.style.cssText = `
      background: rgba(0, 0, 0, 0.9);
      color: #ffffff;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #666;
      min-width: 400px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
    `;
    
    // Create canvas for graphs
    this.graphCanvas = document.createElement('canvas');
    this.graphCanvas.width = 370;
    this.graphCanvas.height = 100;
    this.graphCanvas.style.cssText = `
      margin-top: 10px;
      border: 1px solid #333;
      background: rgba(0, 0, 0, 0.5);
    `;
    
    this.graphContext = this.graphCanvas.getContext('2d');
    
    this.container.appendChild(this.overlayElement);
  }
  
  private clearDisplay(): void {
    if (this.fpsElement && this.mode !== 'fps') {
      this.fpsElement.remove();
      this.fpsElement = null;
    }
    
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
    
    if (this.graphCanvas) {
      this.graphCanvas.remove();
      this.graphCanvas = null;
      this.graphContext = null;
    }
  }
  
  private updateVisibility(): void {
    this.isVisible = this.mode !== 'off';
    this.container.style.display = this.isVisible ? 'block' : 'none';
  }
  
  public update(): void {
    if (!this.isVisible) return;
    
    // Calculate FPS
    this.frames++;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastTime;
    
    if (deltaTime >= 1000) {
      this.fps = Math.round((this.frames * 1000) / deltaTime);
      this.frames = 0;
      this.lastTime = currentTime;
      
      // Update history
      this.fpsHistory.push(this.fps);
      if (this.fpsHistory.length > this.maxHistoryLength) {
        this.fpsHistory.shift();
      }
    }
    
    // Update frame time history
    if (this.frameTimeHistory.length > 0) {
      const lastFrameTime = currentTime - this.frameTimeHistory[this.frameTimeHistory.length - 1];
      if (lastFrameTime < 1000) { // Ignore large gaps
        this.frameTimeHistory.push(currentTime);
      }
    } else {
      this.frameTimeHistory.push(currentTime);
    }
    
    if (this.frameTimeHistory.length > this.maxHistoryLength) {
      this.frameTimeHistory.shift();
    }
    
    this.updateDisplay();
  }
  
  private updateDisplay(): void {
    const stats = this.collectStats();
    
    // Update FPS counter
    if (this.fpsElement) {
      const color = stats.fps >= 55 ? '#00ff00' : stats.fps >= 30 ? '#ffff00' : '#ff0000';
      this.fpsElement.style.color = color;
      this.fpsElement.style.borderColor = color;
      this.fpsElement.style.textShadow = `0 0 2px ${color}`;
      this.fpsElement.textContent = `${stats.fps} FPS`;
    }
    
    // Update overlay based on mode
    if (this.overlayElement) {
      switch (this.mode) {
        case 'simple':
          this.updateSimpleOverlay(stats);
          break;
        case 'detailed':
          this.updateDetailedOverlay(stats);
          break;
        case 'graphs':
          this.updateGraphsOverlay(stats);
          break;
      }
    }
  }
  
  private collectStats(): PerformanceStats {
    const info = renderer.info;
    
    const stats: PerformanceStats = {
      fps: this.fps,
      frameTime: this.frameTimeHistory.length > 1 
        ? this.frameTimeHistory[this.frameTimeHistory.length - 1] - this.frameTimeHistory[this.frameTimeHistory.length - 2]
        : 0,
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      programs: info.programs?.length || 0
    };
    
    // GPU stats (would need WebGL extension or browser API)
    if (this.showGpuStats) {
      // These would require actual GPU monitoring APIs
      stats.gpuUsage = this.estimateGPUUsage();
      stats.gpuTemp = this.mockGPUTemp();
      stats.vramUsage = this.estimateVRAMUsage();
      stats.vramTotal = this.estimateVRAMTotal();
    }
    
    return stats;
  }
  
  private updateSimpleOverlay(stats: PerformanceStats): void {
    if (!this.overlayElement) return;
    
    let html = `
      <div style="color: #00ff00; font-weight: bold; margin-bottom: 5px;">Performance Monitor</div>
      <div>FPS: <span style="color: ${this.getFPSColor(stats.fps)}">${stats.fps}</span></div>
      <div>Frame Time: ${stats.frameTime.toFixed(2)}ms</div>
      <div>Draw Calls: ${stats.drawCalls}</div>
      <div>Triangles: ${(stats.triangles || 0).toLocaleString()}</div>
    `;
    
    if (this.showGpuStats && stats.gpuUsage !== undefined) {
      html += `
        <div style="margin-top: 5px; padding-top: 5px; border-top: 1px solid #333;">
          <div>GPU: ${stats.gpuUsage}%</div>
          <div>VRAM: ${this.formatBytes(stats.vramUsage || 0)} / ${this.formatBytes(stats.vramTotal || 0)}</div>
        </div>
      `;
    }
    
    this.overlayElement.innerHTML = html;
  }
  
  private updateDetailedOverlay(stats: PerformanceStats): void {
    if (!this.overlayElement) return;
    
    const avgFPS = this.fpsHistory.length > 0 
      ? Math.round(this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length)
      : stats.fps;
    
    const minFPS = this.fpsHistory.length > 0 
      ? Math.min(...this.fpsHistory)
      : stats.fps;
      
    const maxFPS = this.fpsHistory.length > 0
      ? Math.max(...this.fpsHistory)
      : stats.fps;
    
    let html = `
      <div style="color: #00ff00; font-weight: bold; margin-bottom: 10px; font-size: 14px;">
        🎮 Performance Monitor - Detailed
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div>
          <div style="color: #888; font-size: 10px;">FRAME RATE</div>
          <div>Current: <span style="color: ${this.getFPSColor(stats.fps)}; font-weight: bold;">${stats.fps} FPS</span></div>
          <div>Average: ${avgFPS} FPS</div>
          <div>Min/Max: ${minFPS}/${maxFPS}</div>
          <div>Frame Time: ${stats.frameTime.toFixed(2)}ms</div>
        </div>
        
        <div>
          <div style="color: #888; font-size: 10px;">RENDERING</div>
          <div>Draw Calls: ${stats.drawCalls}</div>
          <div>Triangles: ${(stats.triangles || 0).toLocaleString()}</div>
          <div>Textures: ${stats.textures}</div>
          <div>Shaders: ${stats.programs}</div>
        </div>
      </div>
    `;
    
    if (this.showGpuStats && stats.gpuUsage !== undefined) {
      html += `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
          <div style="color: #888; font-size: 10px;">GPU STATS</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
              <div>Usage: <span style="color: ${this.getUsageColor(stats.gpuUsage)}">${stats.gpuUsage}%</span></div>
              <div>Temp: <span style="color: ${this.getTempColor(stats.gpuTemp || 0)}">${stats.gpuTemp}°C</span></div>
            </div>
            <div>
              <div>VRAM: ${this.formatBytes(stats.vramUsage || 0)}</div>
              <div>Total: ${this.formatBytes(stats.vramTotal || 0)}</div>
            </div>
          </div>
        </div>
      `;
    }
    
    this.overlayElement.innerHTML = html;
  }
  
  private updateGraphsOverlay(stats: PerformanceStats): void {
    if (!this.overlayElement) return;
    
    // Update text stats
    this.updateDetailedOverlay(stats);
    
    // Add canvas if not already added
    if (this.graphCanvas && !this.overlayElement.contains(this.graphCanvas)) {
      this.overlayElement.appendChild(this.graphCanvas);
    }
    
    // Draw graphs
    if (this.graphContext && this.graphCanvas) {
      this.drawGraphs();
    }
  }
  
  private drawGraphs(): void {
    if (!this.graphContext || !this.graphCanvas) return;
    
    const ctx = this.graphContext;
    const width = this.graphCanvas.width;
    const height = this.graphCanvas.height;
    
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw FPS graph
    if (this.fpsHistory.length > 1) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const maxFPS = 120; // Scale to 120 FPS max
      const stepX = width / this.maxHistoryLength;
      
      for (let i = 0; i < this.fpsHistory.length; i++) {
        const x = i * stepX;
        const y = height - (this.fpsHistory[i] / maxFPS) * height;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Draw current FPS value
      ctx.fillStyle = '#00ff00';
      ctx.font = '12px monospace';
      ctx.fillText(`${this.fps} FPS`, 5, 15);
    }
    
    // Draw 60 FPS line
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    const y60 = height - (60 / 120) * height;
    ctx.moveTo(0, y60);
    ctx.lineTo(width, y60);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  private getFPSColor(fps: number): string {
    if (fps >= 55) return '#00ff00';
    if (fps >= 30) return '#ffff00';
    return '#ff0000';
  }
  
  private getUsageColor(usage: number): string {
    if (usage <= 70) return '#00ff00';
    if (usage <= 85) return '#ffff00';
    return '#ff0000';
  }
  
  private getTempColor(temp: number): string {
    if (temp <= 70) return '#00ff00';
    if (temp <= 80) return '#ffff00';
    return '#ff0000';
  }
  
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
  
  // Estimation methods (since we can't get real GPU stats in WebGL)
  private estimateGPUUsage(): number {
    // Estimate based on FPS and complexity
    const targetFPS = 60;
    const fpsRatio = Math.min(this.fps / targetFPS, 1);
    const complexity = (renderer.info.render.calls || 0) / 100;
    return Math.min(Math.round((1 - fpsRatio) * 50 + complexity * 30 + Math.random() * 10), 100);
  }
  
  private mockGPUTemp(): number {
    // Mock temperature based on usage
    const usage = this.estimateGPUUsage();
    return Math.round(50 + (usage / 100) * 30 + Math.random() * 5);
  }
  
  private estimateVRAMUsage(): number {
    // Estimate based on textures and geometry
    const info = renderer.info;
    const textureMemory = (info.memory.textures || 0) * 1024 * 1024; // Rough estimate
    const geometryMemory = (info.memory.geometries || 0) * 100 * 1024; // Rough estimate
    return textureMemory + geometryMemory;
  }
  
  private estimateVRAMTotal(): number {
    // Rough estimate based on renderer capabilities
    const gl = renderer.getContext();
    // This would need actual WebGL extensions to get real values
    return 4 * 1024 * 1024 * 1024; // Default to 4GB
  }
  
  public destroy(): void {
    this.clearDisplay();
    this.container.remove();
  }
}

export const performanceOverlay = new PerformanceOverlay();