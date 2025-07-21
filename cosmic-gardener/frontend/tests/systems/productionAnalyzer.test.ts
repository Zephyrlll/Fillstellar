import { describe, it, expect, beforeEach } from 'vitest';
import { productionAnalyzer } from '../../js/systems/productionAnalyzer';
import { ResourceType } from '../../js/resourceSystem';

describe('ProductionAnalyzer', () => {
  beforeEach(() => {
    // Reset analyzer state
    productionAnalyzer.stop();
  });

  it('should initialize with default state', () => {
    const state = productionAnalyzer.getState();
    expect(state.isAnalyzing).toBe(false);
    expect(state.history.size).toBeGreaterThan(0);
    expect(state.activeFilters).toEqual({});
  });

  it('should start and stop analysis', () => {
    productionAnalyzer.start();
    expect(productionAnalyzer.getState().isAnalyzing).toBe(true);
    
    productionAnalyzer.stop();
    expect(productionAnalyzer.getState().isAnalyzing).toBe(false);
  });

  it('should track basic resources only', () => {
    const state = productionAnalyzer.getState();
    const basicResources = [
      ResourceType.COSMIC_DUST,
      ResourceType.ENERGY,
      ResourceType.ORGANIC_MATTER,
      ResourceType.BIOMASS,
      ResourceType.DARK_MATTER,
      ResourceType.THOUGHT_POINTS
    ];

    // Check that only basic resources are tracked in history
    state.history.forEach((history, resource) => {
      expect(basicResources).toContain(resource);
    });
  });

  it('should have celestial production stats method', () => {
    const stats = productionAnalyzer.getCelestialProductionStats();
    expect(Array.isArray(stats)).toBe(true);
  });

  it('should set update interval', () => {
    productionAnalyzer.setUpdateInterval(10000);
    expect(productionAnalyzer.getState().updateInterval).toBe(10000);
    
    // Should enforce minimum interval
    productionAnalyzer.setUpdateInterval(500);
    expect(productionAnalyzer.getState().updateInterval).toBe(1000);
  });

  it('should get latest report when available', () => {
    const report = productionAnalyzer.getLatestReport();
    // Report may be undefined initially
    if (report) {
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('bottlenecks');
      expect(report).toHaveProperty('predictions');
      expect(report).toHaveProperty('recommendations');
    }
  });
});