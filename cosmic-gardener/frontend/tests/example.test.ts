import { describe, it, expect } from 'vitest';

// Example test file to verify the test setup works
describe('Test Setup', () => {
  it('should run a basic test', () => {
    expect(true).toBe(true);
  });

  it('should have access to DOM', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello, Cosmic Gardener!';
    document.body.appendChild(div);
    
    expect(document.body.textContent).toContain('Hello, Cosmic Gardener!');
  });

  it('should have localStorage mock', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value');
  });
});