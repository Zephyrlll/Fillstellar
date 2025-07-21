import { describe, it, expect, beforeEach, vi } from 'vitest';
import { productionAnalysisUI } from '../../js/systems/productionAnalysisUI';

describe('ProductionAnalysisUI', () => {
  beforeEach(() => {
    // Clear DOM
    document.body.innerHTML = '';
    
    // Mock window objects
    (window as any).feedbackSystem = {
      showToast: vi.fn()
    };
  });

  it('should be a singleton', () => {
    const instance1 = productionAnalysisUI;
    const instance2 = productionAnalysisUI;
    expect(instance1).toBe(instance2);
  });

  it('should initialize UI elements', () => {
    productionAnalysisUI.init();
    
    const container = document.getElementById('production-analysis-ui');
    expect(container).toBeTruthy();
    expect(container?.classList.contains('production-analysis-container')).toBe(true);
  });

  it('should have all required tabs', () => {
    productionAnalysisUI.init();
    
    const tabs = document.querySelectorAll('.tab-button');
    expect(tabs.length).toBe(5);
    
    const tabNames = Array.from(tabs).map(tab => tab.getAttribute('data-tab'));
    expect(tabNames).toContain('overview');
    expect(tabNames).toContain('bottlenecks');
    expect(tabNames).toContain('predictions');
    expect(tabNames).toContain('flow');
    expect(tabNames).toContain('recommendations');
  });

  it('should open and close properly', () => {
    productionAnalysisUI.init();
    const container = document.getElementById('production-analysis-ui');
    
    // Initially hidden
    expect(container?.classList.contains('hidden')).toBe(true);
    
    // Open
    productionAnalysisUI.open();
    expect(container?.classList.contains('hidden')).toBe(false);
    
    // Close
    productionAnalysisUI.close();
    expect(container?.classList.contains('hidden')).toBe(true);
  });

  it('should toggle properly', () => {
    productionAnalysisUI.init();
    const container = document.getElementById('production-analysis-ui');
    
    // Initially hidden
    expect(container?.classList.contains('hidden')).toBe(true);
    
    // First toggle - open
    productionAnalysisUI.toggle();
    expect(container?.classList.contains('hidden')).toBe(false);
    
    // Second toggle - close
    productionAnalysisUI.toggle();
    expect(container?.classList.contains('hidden')).toBe(true);
  });

  it('should have analysis controls', () => {
    productionAnalysisUI.init();
    
    const toggleBtn = document.getElementById('analysis-toggle');
    const intervalSelect = document.getElementById('update-interval');
    
    expect(toggleBtn).toBeTruthy();
    expect(intervalSelect).toBeTruthy();
    expect(intervalSelect?.tagName).toBe('SELECT');
  });
});