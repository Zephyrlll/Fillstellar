/**
 * Welcome Message System
 * ゲーム開始時に目的を明確に伝える
 */

export class WelcomeMessageSystem {
  private static instance: WelcomeMessageSystem;
  private hasShownWelcome = false;
  
  private constructor() {}
  
  static getInstance(): WelcomeMessageSystem {
    if (!WelcomeMessageSystem.instance) {
      WelcomeMessageSystem.instance = new WelcomeMessageSystem();
    }
    return WelcomeMessageSystem.instance;
  }
  
  showWelcomeMessage(): void {
    if (this.hasShownWelcome) return;
    
    const modal = document.createElement('div');
    modal.className = 'welcome-modal';
    modal.innerHTML = `
      <div class="welcome-content">
        <h1>🌌 Fillstellar へようこそ！</h1>
        
        <div class="welcome-section">
          <h2>🎯 あなたの使命</h2>
          <p>宇宙の創造者として、以下を達成してください：</p>
          <ol class="mission-list">
            <li><span class="icon">✨</span> 宇宙の塵を集めて天体を創造</li>
            <li><span class="icon">⭐</span> 恒星を作ってエネルギーを生産</li>
            <li><span class="icon">🌍</span> 惑星に生命を宿らせる</li>
            <li><span class="icon">🧠</span> 知的生命体まで進化させる</li>
            <li><span class="icon">🚀</span> 文明を発展させて宇宙を探索</li>
          </ol>
        </div>
        
        <div class="welcome-section">
          <h2>🎮 ゲームの流れ</h2>
          <div class="flow-diagram">
            <div class="flow-item">
              <div class="flow-icon">💫</div>
              <div class="flow-text">
                <strong>第1段階</strong>
                <span>塵を集めて小惑星を作る</span>
              </div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-item">
              <div class="flow-icon">☀️</div>
              <div class="flow-text">
                <strong>第2段階</strong>
                <span>恒星でエネルギー生産</span>
              </div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-item">
              <div class="flow-icon">🔬</div>
              <div class="flow-text">
                <strong>第3段階</strong>
                <span>研究で新技術解放</span>
              </div>
            </div>
            <div class="flow-arrow">→</div>
            <div class="flow-item">
              <div class="flow-icon">🌱</div>
              <div class="flow-text">
                <strong>第4段階</strong>
                <span>生命の創造と進化</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="welcome-section">
          <h2>💡 最初のステップ</h2>
          <div class="first-steps">
            <div class="step">
              <span class="step-number">1</span>
              <p>画面右上の<strong>「短期目標」</strong>を確認</p>
            </div>
            <div class="step">
              <span class="step-number">2</span>
              <p>塵が100溜まったら<strong>小惑星を作成</strong></p>
            </div>
            <div class="step">
              <span class="step-number">3</span>
              <p>塵が1000溜まったら<strong>恒星を作成</strong></p>
            </div>
            <div class="step">
              <span class="step-number">4</span>
              <p>エネルギーで<strong>研究を開始</strong></p>
            </div>
          </div>
        </div>
        
        <div class="welcome-tips">
          <h3>🌟 重要なヒント</h3>
          <ul>
            <li>天体を作りすぎるとPCが重くなります（上限: 50個）</li>
            <li>恒星は少数でも効率的にエネルギーを生産します</li>
            <li>短期目標を達成するとボーナス資源がもらえます</li>
          </ul>
        </div>
        
        <button class="welcome-start-btn" onclick="this.closest('.welcome-modal').remove()">
          ゲームを始める
        </button>
      </div>
    `;
    
    document.body.appendChild(modal);
    this.hasShownWelcome = true;
    
    // ローカルストレージに記録
    localStorage.setItem('fillstellar_welcomed', 'true');
    
    // アニメーション
    setTimeout(() => modal.classList.add('show'), 10);
  }
  
  shouldShowWelcome(): boolean {
    // 初回プレイヤーか、リセット後の場合に表示
    return !localStorage.getItem('fillstellar_welcomed');
  }
  
  reset(): void {
    this.hasShownWelcome = false;
    localStorage.removeItem('fillstellar_welcomed');
  }
}

// スタイル追加
const style = document.createElement('style');
style.textContent = `
  .welcome-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 20000;
    opacity: 0;
    transition: opacity 0.5s ease;
    overflow-y: auto;
    padding: 20px;
  }
  
  .welcome-modal.show {
    opacity: 1;
  }
  
  .welcome-content {
    background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
    border: 2px solid #FFD700;
    border-radius: 20px;
    padding: 40px;
    max-width: 800px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
    animation: welcomeSlideIn 0.5s ease;
  }
  
  @keyframes welcomeSlideIn {
    from {
      transform: translateY(50px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .welcome-content h1 {
    text-align: center;
    color: #FFD700;
    font-size: 2.5em;
    margin-bottom: 30px;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }
  
  .welcome-content h2 {
    color: #4CAF50;
    margin: 20px 0 15px;
    font-size: 1.5em;
  }
  
  .welcome-content h3 {
    color: #FFD700;
    margin: 15px 0 10px;
  }
  
  .welcome-section {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    padding: 25px;
    margin-bottom: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .mission-list {
    list-style: none;
    padding: 0;
    margin: 15px 0;
  }
  
  .mission-list li {
    padding: 10px 0;
    display: flex;
    align-items: center;
    gap: 15px;
    color: #e0e0e0;
    font-size: 1.1em;
  }
  
  .mission-list .icon {
    font-size: 1.5em;
    width: 40px;
    text-align: center;
  }
  
  .flow-diagram {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 20px 0;
    flex-wrap: wrap;
    gap: 15px;
  }
  
  .flow-item {
    flex: 1;
    min-width: 120px;
    text-align: center;
    padding: 15px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 10px;
    border: 1px solid rgba(76, 175, 80, 0.3);
  }
  
  .flow-icon {
    font-size: 2em;
    margin-bottom: 10px;
  }
  
  .flow-text strong {
    display: block;
    color: #4CAF50;
    margin-bottom: 5px;
  }
  
  .flow-text span {
    font-size: 0.9em;
    color: #aaa;
  }
  
  .flow-arrow {
    font-size: 1.5em;
    color: #4CAF50;
  }
  
  .first-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin: 20px 0;
  }
  
  .step {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    background: rgba(76, 175, 80, 0.1);
    border-radius: 10px;
    border: 1px solid rgba(76, 175, 80, 0.3);
  }
  
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: #4CAF50;
    color: white;
    border-radius: 50%;
    font-weight: bold;
    font-size: 1.2em;
    flex-shrink: 0;
  }
  
  .step p {
    margin: 0;
    flex: 1;
  }
  
  .step strong {
    color: #FFD700;
  }
  
  .welcome-tips {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    border-radius: 10px;
    padding: 20px;
    margin: 20px 0;
  }
  
  .welcome-tips ul {
    margin: 10px 0 0 20px;
    color: #ddd;
  }
  
  .welcome-tips li {
    margin-bottom: 8px;
  }
  
  .welcome-start-btn {
    display: block;
    width: 100%;
    padding: 20px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1.3em;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    margin-top: 30px;
    box-shadow: 0 5px 20px rgba(76, 175, 80, 0.4);
  }
  
  .welcome-start-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 7px 30px rgba(76, 175, 80, 0.6);
  }
  
  .welcome-start-btn:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    .welcome-content {
      padding: 25px;
    }
    
    .welcome-content h1 {
      font-size: 2em;
    }
    
    .flow-diagram {
      flex-direction: column;
    }
    
    .flow-arrow {
      transform: rotate(90deg);
    }
    
    .first-steps {
      grid-template-columns: 1fr;
    }
  }
`;
document.head.appendChild(style);

export const welcomeMessage = WelcomeMessageSystem.getInstance();