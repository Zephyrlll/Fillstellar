// Toggle button for Game Info UI
export function createGameInfoToggle() {
    const toggleButton = document.createElement('button');
    toggleButton.id = 'game-info-toggle';
    toggleButton.innerHTML = '📊';
    toggleButton.title = 'ゲーム情報パネルの表示/非表示';
    toggleButton.style.cssText = `
        position: fixed;
        top: 120px;
        left: 310px;
        width: 40px;
        height: 40px;
        background: rgba(26, 26, 46, 0.9);
        border: 1px solid #4169E1;
        border-radius: 50%;
        color: #87CEEB;
        font-size: 20px;
        cursor: pointer;
        z-index: 10000;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    
    // Load visibility state
    const savedVisibility = localStorage.getItem('gameInfoUIVisible');
    let isVisible = savedVisibility === null ? true : savedVisibility === 'true';
    
    // Apply initial state
    const gameInfoUI = document.getElementById('game-info-ui');
    if (gameInfoUI) {
        gameInfoUI.style.display = isVisible ? 'block' : 'none';
    }
    updateToggleButton();
    
    toggleButton.onclick = () => {
        isVisible = !isVisible;
        const gameInfoUI = document.getElementById('game-info-ui');
        if (gameInfoUI) {
            gameInfoUI.style.display = isVisible ? 'block' : 'none';
        }
        localStorage.setItem('gameInfoUIVisible', isVisible.toString());
        updateToggleButton();
    };
    
    function updateToggleButton() {
        toggleButton.style.left = isVisible ? '310px' : '20px';
        toggleButton.style.background = isVisible ? 'rgba(26, 26, 46, 0.9)' : 'rgba(65, 105, 225, 0.3)';
        toggleButton.innerHTML = isVisible ? '📊' : '📊';
        toggleButton.style.opacity = isVisible ? '1' : '0.7';
    }
    
    // Add hover effect
    toggleButton.onmouseenter = () => {
        toggleButton.style.transform = 'scale(1.1)';
        toggleButton.style.boxShadow = '0 0 10px rgba(65, 105, 225, 0.5)';
    };
    
    toggleButton.onmouseleave = () => {
        toggleButton.style.transform = 'scale(1)';
        toggleButton.style.boxShadow = 'none';
    };
    
    document.body.appendChild(toggleButton);
    
    // Add notification badge for new challenges
    const badge = document.createElement('div');
    badge.id = 'game-info-badge';
    badge.style.cssText = `
        position: absolute;
        top: -5px;
        right: -5px;
        width: 16px;
        height: 16px;
        background: #FF6B6B;
        border-radius: 50%;
        color: white;
        font-size: 10px;
        display: none;
        align-items: center;
        justify-content: center;
        font-weight: bold;
    `;
    toggleButton.appendChild(badge);
    
    // Function to update badge
    (window as any).updateGameInfoBadge = (count: number) => {
        if (count > 0 && !isVisible) {
            badge.style.display = 'flex';
            badge.textContent = count.toString();
        } else {
            badge.style.display = 'none';
        }
    };
}

// Add keyboard shortcut
document.addEventListener('keydown', (e) => {
    if (e.key === 'i' && e.ctrlKey) {
        e.preventDefault();
        const toggleButton = document.getElementById('game-info-toggle');
        if (toggleButton) {
            toggleButton.click();
        }
    }
});