import { SimplePlanetGame } from './simple-game';

// ゲーム開始
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    const game = new SimplePlanetGame(canvas);
    game.start();
});