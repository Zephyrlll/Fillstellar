import { animationSystem } from './simpleAnimations.js';

export interface OptionsSetting {
  id: string;
  label: string;
  type: 'slider' | 'checkbox' | 'select' | 'button' | 'keybind' | 'color' | 'number';
  value?: any;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
  description?: string;
  onChange?: (value: any) => void;
  onClick?: () => void;
}

export interface OptionsSection {
  id: string;
  label: string;
  icon?: string;
  settings: OptionsSetting[];
  isProMode?: boolean;
}

export interface OptionsTab {
  id: string;
  label: string;
  icon: string;
  sections: OptionsSection[];
}

export interface OptionsConfig {
  title: string;
  tabs: OptionsTab[];
}

export class OptionsScreen {
  private container: HTMLDivElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private isOpen: boolean = false;
  private config: OptionsConfig | null = null;
  private activeTabId: string = 'audio'; // デフォルトでオーディオタブを選択
  private settings: Map<string, any> = new Map();
  private tempSettings: Map<string, any> = new Map(); // 一時的な変更を保存
  private hasUnsavedChanges: boolean = false;
  
  // プレビュー用の3D要素
  private previewScene?: THREE.Scene;
  private previewCamera?: THREE.PerspectiveCamera;
  private previewRenderer?: THREE.WebGLRenderer;
  private previewComposer?: any; // EffectComposer
  private previewBloomPass?: any; // UnrealBloomPass
  private previewBlackHole?: THREE.Mesh;
  private previewAnimationId?: number;
  private previewDebugLogged: boolean = false;
  
  constructor() {
    this.loadSettings();
  }
  
  // ブルーム設定が変更されたときに呼ばれる
  public updatePreviewBloom(bloomSetting: string): void {
    if (!this.previewBloomPass) return;
    
    switch (bloomSetting) {
      case 'off':
        this.previewBloomPass.enabled = false;
        break;
      case 'low':
        this.previewBloomPass.enabled = true;
        this.previewBloomPass.strength = 1.0;
        break;
      case 'on':
        this.previewBloomPass.enabled = true;
        this.previewBloomPass.strength = 1.5;
        break;
      case 'high':
        this.previewBloomPass.enabled = true;
        this.previewBloomPass.strength = 2.5;
        break;
    }
    
    console.log('[OPTIONS] Preview bloom updated to:', bloomSetting);
  }
  
  init(config: OptionsConfig): void {
    this.config = config;
    this.createOverlay();
    this.createContainer();
    
    // デフォルトタブを設定（オーディオタブを優先）
    if (config.tabs.length > 0) {
      const audioTab = config.tabs.find(tab => tab.id === 'audio');
      this.activeTabId = audioTab ? audioTab.id : config.tabs[0].id;
    }
  }
  
  private async loadSoundSettings(): Promise<void> {
    try {
      const { soundManager } = await import('../sound.js');
      const settings = soundManager.getSettings();
      
      // 現在の設定値を保存
      this.settings.set('master-volume', Math.round(settings.masterVolume * 100));
      this.settings.set('ambient-volume', Math.round(settings.ambientVolume * 100));
      this.settings.set('effects-volume', Math.round(settings.effectsVolume * 100));
      this.settings.set('ui-volume', Math.round(settings.uiVolume * 100));
      this.settings.set('spatial-audio', settings.spatialAudio);
      
      // 設定オブジェクトにも反映
      if (this.config) {
        const audioTab = this.config.tabs.find(tab => tab.id === 'audio');
        if (audioTab) {
          audioTab.sections.forEach(section => {
            section.settings.forEach(setting => {
              const savedValue = this.settings.get(setting.id);
              if (savedValue !== undefined) {
                setting.value = savedValue;
              }
            });
          });
        }
      }
    } catch (error) {
      console.error('[OPTIONS] Failed to load sound settings:', error);
    }
  }
  
  private createOverlay(): void {
    this.overlay = document.createElement('div');
    this.overlay.className = 'options-overlay';
    this.overlay.style.display = 'none'; // 明示的に非表示に設定
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });
    document.body.appendChild(this.overlay);
  }
  
  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'options-screen';
    this.container.className = 'options-screen';
    this.container.style.display = 'none'; // 明示的に非表示に設定
    document.body.appendChild(this.container);
  }
  
  render(): void {
    if (!this.container || !this.config) return;
    
    console.log('[OPTIONS] Starting render. Config:', this.config);
    console.log('[OPTIONS] Active tab ID:', this.activeTabId);
    
    const content = this.renderContent();
    
    // デバッグ: 生成されたコンテンツを確認
    console.log('[OPTIONS] Generated content length:', content.length);
    console.log('[OPTIONS] Generated content preview:', content.substring(0, 200));
    
    // contentが空でないか確認
    if (!content || content.length === 0) {
      console.error('[OPTIONS] Content is empty!');
    }
    
    // コンテンツをそのまま使用
    const combinedContent = content;
    
    this.container.innerHTML = `
      <div class="options-main-wrapper" style="display: flex; width: 100%; height: 100%;">
        <div class="options-left-panel" style="width: 55%; display: flex; flex-direction: column; overflow-y: auto;">
          <div class="options-header" style="position: sticky; top: 0; background: #1a1a2e; z-index: 10; padding-bottom: 20px;">
            <h2>${this.config.title}</h2>
            <button class="options-close" aria-label="閉じる">×</button>
          </div>
          <div class="options-container" style="background: #0a0a14; border: 2px solid #d4af37; border-radius: 8px; margin-bottom: 20px;">
            <nav class="options-tabs" style="position: sticky; top: 60px; background: #0a0a14; z-index: 9; border-bottom: 2px solid #d4af37;">
              ${this.renderTabs()}
            </nav>
            <div class="options-content" style="padding: 20px;">
              ${combinedContent}
            </div>
          </div>
          <div class="options-footer" style="position: sticky; bottom: 0; background: #1a1a2e; padding: 20px 0; z-index: 10;">
            <button class="options-save">保存</button>
            <button class="options-reset">デフォルトに戻す</button>
            <button class="options-cancel">キャンセル</button>
          </div>
        </div>
        <div class="options-preview-panel" id="options-preview-panel" style="
          position: absolute;
          width: 30%; /* 画面幅の30% */
          aspect-ratio: 4/3; /* 4:3のアスペクト比 */
          left: 65%; /* 左端から65%の位置（より右側に配置） */
          top: 25%; /* 上端から25%の位置（中心が50%になるように調整） */
          background: #0a0a0a;
          border: 2px solid #d4af37;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
          display: ${this.activeTabId === 'graphics' ? 'flex' : 'none'};
          flex-direction: column;
          z-index: 100;
        ">
          <div class="preview-header" style="padding: 10px; border-bottom: 1px solid #d4af37; color: white; background: rgba(26, 26, 46, 0.9); border-radius: 6px 6px 0 0;">
            <h3 style="margin: 0; font-size: 14px;">🌌 グラフィックプレビュー</h3>
            <p style="margin: 3px 0 0 0; font-size: 11px; color: #888;">設定の効果をリアルタイムで確認</p>
          </div>
          <div class="preview-viewport" id="preview-viewport" style="flex: 1; position: relative; overflow: hidden; border-radius: 0 0 6px 6px;">
            <canvas id="preview-canvas" style="width: 100%; height: 100%; display: block;"></canvas>
            <div class="preview-loading" id="preview-loading" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; display: none;">
              読み込み中...
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
    
    // グラフィックタブの場合、プレビューを初期化
    if (this.activeTabId === 'graphics') {
      setTimeout(() => this.initPreview(), 100);
    }
  }
  
  private async initPreview(): Promise<void> {
    const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    
    console.log('[OPTIONS] Initializing preview with game scene');
    
    // Three.jsとゲームのシーンをインポート
    const THREE = await import('three');
    const { scene, camera } = await import('../threeSetup.js');
    const { gameStateManager } = await import('../state.js');
    
    // カメラを作成（ゲームのシーンを映すための固定カメラ）
    // 4:3のアスペクト比に合わせて設定
    const aspectRatio = 4 / 3;
    this.previewCamera = new THREE.PerspectiveCamera(
      45,
      aspectRatio,
      0.1,
      50000
    );
    
    // レンダラーを作成
    this.previewRenderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: false
    });
    this.previewRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // ゲームシーンの背景設定をコピー
    this.previewRenderer.setClearColor(0x000011, 1);
    
    // ポストプロセッシングを設定
    this.previewScene = scene; // ゲームの実際のシーンを使用
    await this.setupPreviewPostProcessing();
    
    // ブラックホールを探す
    this.findAndFocusBlackHole();
    
    // アニメーションを開始
    this.animatePreview();
    
    // リサイズ時の処理
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (this.previewRenderer && this.previewCamera) {
          this.previewRenderer.setSize(width, height);
          // アスペクト比は固定で4:3を維持
          this.previewCamera.aspect = 4 / 3;
          this.previewCamera.updateProjectionMatrix();
        }
      }
    });
    resizeObserver.observe(canvas);
  }
  
  private async setupPreviewPostProcessing(): Promise<void> {
    if (!this.previewRenderer || !this.previewScene || !this.previewCamera) return;
    
    const THREE = await import('three');
    const { EffectComposer } = await import('three/examples/jsm/postprocessing/EffectComposer.js');
    const { RenderPass } = await import('three/examples/jsm/postprocessing/RenderPass.js');
    const { UnrealBloomPass } = await import('three/examples/jsm/postprocessing/UnrealBloomPass.js');
    const { gameStateManager } = await import('../state.js');
    
    // コンポーザーを作成
    this.previewComposer = new EffectComposer(this.previewRenderer);
    
    // レンダーパス
    const renderPass = new RenderPass(this.previewScene, this.previewCamera);
    this.previewComposer.addPass(renderPass);
    
    // ゲームの設定を取得
    const state = gameStateManager.getState();
    const bloomSetting = state.graphics.bloom || 'off';
    
    // ブルームパス（ゲーム設定に基づいて）
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(400, 400), // 解像度
      1.5, // 強度
      0.4, // 半径
      0.85 // しきい値
    );
    
    // ゲーム設定に基づいてブルームを設定
    switch (bloomSetting) {
      case 'off':
        bloomPass.enabled = false;
        break;
      case 'low':
        bloomPass.enabled = true;
        bloomPass.strength = 1.0;
        break;
      case 'on':
        bloomPass.enabled = true;
        bloomPass.strength = 1.5;
        break;
      case 'high':
        bloomPass.enabled = true;
        bloomPass.strength = 2.5;
        break;
    }
    
    this.previewBloomPass = bloomPass;
    this.previewComposer.addPass(bloomPass);
    
    console.log('[OPTIONS] Preview post-processing setup complete with bloom:', bloomSetting);
  }
  
  private async findAndFocusBlackHole(): Promise<void> {
    if (!this.previewScene || !this.previewCamera) return;
    
    // ゲームカメラの現在位置を取得
    const { camera } = await import('../threeSetup.js');
    const THREE = await import('three');
    const playerCameraPosition = camera.position.clone();
    const playerCameraTarget = new THREE.Vector3();
    camera.getWorldDirection(playerCameraTarget);
    playerCameraTarget.multiplyScalar(1000).add(playerCameraPosition); // カメラが向いている方向の1000ユニット先
    
    // ゲームシーンからブラックホールを探す
    let blackHole: THREE.Object3D | null = null;
    
    this.previewScene.traverse((child) => {
      if (child.userData && child.userData.type === 'black_hole') {
        blackHole = child;
        console.log('[OPTIONS] Found black hole in game scene:', child);
      }
    });
    
    if (blackHole) {
      this.previewBlackHole = blackHole as THREE.Mesh;
      
      // プレイヤーのカメラ位置をベースに、ブラックホールが見える位置にカメラを配置
      const blackHolePos = blackHole.position.clone();
      
      // プレイヤーのカメラ位置から少しオフセットした位置に固定カメラを配置
      this.previewCamera.position.copy(playerCameraPosition);
      
      // プレイヤーが見ていた方向とは少し違う角度から見る（より近い位置から）
      const offset = new THREE.Vector3(50, 100, 50);
      this.previewCamera.position.add(offset);
      
      // カメラをブラックホールに向ける
      this.previewCamera.lookAt(blackHolePos);
      
      console.log('[OPTIONS] Camera positioned based on player view:', {
        playerPos: playerCameraPosition,
        previewPos: this.previewCamera.position,
        target: blackHolePos
      });
    } else {
      console.log('[OPTIONS] No black hole found in scene, using player camera position');
      
      // ブラックホールがない場合は、プレイヤーの視点から少し離れた位置から同じ方向を見る
      this.previewCamera.position.copy(playerCameraPosition);
      const offset = new THREE.Vector3(100, 80, 100);
      this.previewCamera.position.add(offset);
      this.previewCamera.lookAt(playerCameraTarget);
    }
  }
  
  private animatePreview(): void {
    if (!this.previewRenderer || !this.previewScene || !this.previewCamera) {
      console.warn('[OPTIONS] Preview animation stopped - missing required objects');
      return;
    }
    
    this.previewAnimationId = requestAnimationFrame(() => this.animatePreview());
    
    // ブラックホールが存在する場合、カメラの向きを維持
    if (this.previewBlackHole) {
      // カメラをブラックホールに向け続ける
      this.previewCamera.lookAt(this.previewBlackHole.position);
    }
    
    // レンダリング（コンポーザーがある場合はそれを使用）
    if (this.previewComposer) {
      this.previewComposer.render();
    } else {
      this.previewRenderer.render(this.previewScene, this.previewCamera);
    }
    
    // 初回レンダリング時のみデバッグ情報を出力
    if (!this.previewDebugLogged) {
      console.log('[OPTIONS] Preview rendering:', {
        sceneChildren: this.previewScene.children.length,
        cameraPosition: this.previewCamera.position,
        rendererSize: {
          width: this.previewRenderer.domElement.width,
          height: this.previewRenderer.domElement.height
        },
        hasBlackHole: !!this.previewBlackHole,
        hasComposer: !!this.previewComposer
      });
      this.previewDebugLogged = true;
    }
  }
  
  private renderTabs(): string {
    if (!this.config) return '';
    
    return this.config.tabs.map(tab => `
      <button class="options-tab ${tab.id === this.activeTabId ? 'active' : ''}" 
              data-tab-id="${tab.id}">
        <span class="tab-label">${tab.label}</span>
      </button>
    `).join('');
  }
  
  private renderContent(): string {
    console.log('[OPTIONS] renderContent called');
    
    const activeTab = this.config?.tabs.find(tab => tab.id === this.activeTabId);
    if (!activeTab) {
      console.error('[OPTIONS] Active tab not found:', this.activeTabId);
      return '<div style="color: white; padding: 20px;">タブが見つかりません</div>';
    }
    
    let html = '<div style="padding: 20px;">';
    
    // デバッグ情報
    const visibleSections = activeTab.sections.filter(section => {
      const isProMode = localStorage.getItem('graphics-pro-mode') === 'true';
      return !section.isProMode || isProMode;
    });
    console.log('[OPTIONS] Visible sections:', visibleSections.length);
    console.log('[OPTIONS] Pro mode enabled:', localStorage.getItem('graphics-pro-mode'));
    
    activeTab.sections.forEach((section) => {
      // プロモードセクションの場合、プロモードが有効でなければスキップ
      const isProMode = localStorage.getItem('graphics-pro-mode') === 'true';
      if (section.isProMode && !isProMode) {
        return;
      }
      
      // セクションのコンテナ
      const sectionClass = section.isProMode ? 'pro-mode-section' : '';
      html += `<div class="${sectionClass}" style="background-color: rgba(255,255,255,0.05); padding: 20px; margin-bottom: 20px; border-radius: 8px; border: 1px solid rgba(212,175,55,0.3);">`;
      
      // セクションタイトル
      html += `<h3 style="color: #d4af37; margin: 0 0 20px 0; font-size: 18px;">`;
      html += `${section.icon || ''} ${section.label}`;
      html += `</h3>`;
      
      // 設定項目
      if (section.settings.length === 0) {
        // 空のセクションの場合
        html += `<p style="color: rgba(255,255,255,0.5); font-style: italic; text-align: center; padding: 40px 0;">準備中...</p>`;
      } else {
        section.settings.forEach((setting) => {
          const value = this.tempSettings.get(setting.id) ?? this.settings.get(setting.id) ?? setting.value;
          
          if (setting.type === 'slider') {
            html += `<div style="background-color: rgba(212,175,55,0.1); padding: 15px; margin-bottom: 15px; border-radius: 4px;">`;
            html += `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">`;
            html += `<label style="color: white; font-size: 16px;">${setting.label}</label>`;
            html += `<span id="${setting.id}-value" style="color: #d4af37; font-weight: bold;">${value ?? 50}</span>`;
            html += `</div>`;
            if (setting.description) {
              html += `<p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 10px 0;">${setting.description}</p>`;
            }
            html += `<input type="range" id="${setting.id}" class="option-slider" value="${value ?? 50}" min="${setting.min ?? 0}" max="${setting.max ?? 100}" step="${setting.step ?? 1}" style="width: 100%; height: 6px;">`;
            html += `</div>`;
          } else if (setting.type === 'checkbox') {
            html += `<div style="background-color: rgba(212,175,55,0.1); padding: 15px; margin-bottom: 15px; border-radius: 4px;">`;
            html += `<label style="color: white; display: flex; align-items: center; cursor: pointer;">`;
            html += `<input type="checkbox" id="${setting.id}" class="option-checkbox" ${value ? 'checked' : ''} style="margin-right: 10px; width: 20px; height: 20px;">`;
            html += `<span style="font-size: 16px;">${setting.label}</span>`;
            html += `</label>`;
            if (setting.description) {
              html += `<p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 10px 0 0 30px;">${setting.description}</p>`;
            }
            html += `</div>`;
          } else if (setting.type === 'select') {
            html += `<div style="background-color: rgba(212,175,55,0.1); padding: 15px; margin-bottom: 15px; border-radius: 4px;">`;
            html += `<label style="color: white; font-size: 16px; display: block; margin-bottom: 5px;">${setting.label}</label>`;
            if (setting.description) {
              html += `<p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 10px 0;">${setting.description}</p>`;
            }
            html += `<select id="${setting.id}" class="option-select" style="width: 100%; padding: 8px; background: rgba(0,0,0,0.3); border: 1px solid rgba(212,175,55,0.3); color: white; border-radius: 4px;">`;
            setting.options?.forEach(option => {
              html += `<option value="${option.value}" ${value === option.value ? 'selected' : ''} style="background: #1a1a2e;">${option.label}</option>`;
            });
            html += `</select>`;
            html += `</div>`;
          } else if (setting.type === 'button') {
            html += `<div style="background-color: rgba(212,175,55,0.1); padding: 15px; margin-bottom: 15px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">`;
            html += `<div style="flex: 1;">`;
            html += `<label style="color: white; font-size: 16px; display: block; margin-bottom: 5px;">${setting.label}</label>`;
            if (setting.description) {
              html += `<p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0;">${setting.description}</p>`;
            }
            html += `</div>`;
            html += `<button class="setting-action-button" data-action-id="${setting.id}" style="padding: 10px 20px; background: #d4af37; border: none; border-radius: 4px; color: #000; font-weight: bold; cursor: pointer; margin-left: 20px;">`;
            html += setting.value ?? '実行';
            html += `</button>`;
            html += `</div>`;
          }
        });
      }
      
      html += `</div>`;
    });
    
    html += '</div>';
    
    return html;
  }
  
  private renderSection(section: OptionsSection): string {
    console.log('[OPTIONS] Rendering section:', section.label, 'with', section.settings.length, 'settings');
    
    // シンプルなセクションHTMLを返す
    return `
      <section style="margin-bottom: 30px; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px;">
        <h3 style="color: #d4af37; font-size: 18px; margin-bottom: 20px;">
          ${section.icon || ''} ${section.label}
        </h3>
        <div>
          ${section.settings.map(setting => this.renderSimpleSetting(setting)).join('')}
        </div>
      </section>
    `;
  }
  
  private renderSimpleSetting(setting: OptionsSetting): string {
    const savedValue = this.settings.get(setting.id) ?? setting.value;
    
    // 最もシンプルなHTMLを返す
    if (setting.type === 'slider') {
      return `
        <div style="background: rgba(212,175,55,0.1); padding: 15px; margin: 10px 0; border-radius: 4px;">
          <div style="color: white; margin-bottom: 10px;">${setting.label}: ${savedValue ?? 50}</div>
          <input type="range" value="${savedValue ?? 50}" min="0" max="100" style="width: 100%;">
        </div>
      `;
    } else if (setting.type === 'checkbox') {
      return `
        <div style="background: rgba(212,175,55,0.1); padding: 15px; margin: 10px 0; border-radius: 4px;">
          <label style="color: white;">
            <input type="checkbox" ${savedValue ? 'checked' : ''}> ${setting.label}
          </label>
        </div>
      `;
    }
    
    return '';
  }
  
  private renderSetting(setting: OptionsSetting): string {
    const savedValue = this.settings.get(setting.id) ?? setting.value;
    
    switch (setting.type) {
      case 'slider':
        const sliderValue = savedValue ?? setting.value ?? 50;
        const sliderHTML = `
          <div class="setting-item setting-slider" data-setting-id="${setting.id}" style="background: rgba(255,255,255,0.1); padding: 15px; margin: 10px 0; border-radius: 8px;">
            <label style="color: white; font-size: 16px; display: block; margin-bottom: 5px;">${setting.label}: <span id="${setting.id}-value">${sliderValue}</span></label>
            ${setting.description ? `<p class="setting-description" style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 10px 0;">${setting.description}</p>` : ''}
            <input type="range" 
                   id="${setting.id}"
                   class="option-slider"
                   value="${sliderValue}" 
                   min="${setting.min ?? 0}" 
                   max="${setting.max ?? 100}"
                   step="${setting.step ?? 1}" 
                   style="width: 100%; display: block;">
          </div>
        `;
        console.log('[OPTIONS] Slider HTML:', sliderHTML);
        return sliderHTML;
        
      case 'checkbox':
        return `
          <div class="setting-item setting-checkbox" data-setting-id="${setting.id}">
            <label class="checkbox-label">
              <input type="checkbox" id="${setting.id}" 
                     class="checkbox-input"
                     ${savedValue ? 'checked' : ''}>
              <span class="checkbox-text">${setting.label}</span>
            </label>
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
          </div>
        `;
        
      case 'select':
        return `
          <div class="setting-item setting-select" data-setting-id="${setting.id}">
            <label for="${setting.id}">${setting.label}</label>
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
            <select id="${setting.id}" class="setting-control">
              ${setting.options?.map(option => `
                <option value="${option.value}" ${savedValue === option.value ? 'selected' : ''}>
                  ${option.label}
                </option>
              `).join('') ?? ''}
            </select>
          </div>
        `;
        
      case 'button':
        return `
          <div class="setting-item setting-button" data-setting-id="${setting.id}" style="background: rgba(255,255,255,0.1); padding: 15px; border-radius: 8px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
            <div class="setting-info">
              <label style="color: white; font-size: 16px; display: block; margin-bottom: 5px;">${setting.label}</label>
              ${setting.description ? `<p class="setting-description" style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0;">${setting.description}</p>` : ''}
            </div>
            <button class="setting-action-button" data-action-id="${setting.id}" style="padding: 10px 20px; background: #d4af37; border: none; border-radius: 4px; color: #000; font-weight: bold; cursor: pointer;">
              ${setting.value ?? '実行'}
            </button>
          </div>
        `;
        
      case 'keybind':
        return `
          <div class="setting-item setting-keybind" data-setting-id="${setting.id}">
            <label for="${setting.id}">${setting.label}</label>
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
            <input type="text" id="${setting.id}" 
                   class="keybind-input" 
                   value="${savedValue ?? ''}"
                   placeholder="クリックして設定"
                   readonly>
          </div>
        `;
        
      case 'color':
        return `
          <div class="setting-item setting-color" data-setting-id="${setting.id}">
            <label for="${setting.id}">${setting.label}</label>
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
            <div class="color-input-wrapper">
              <input type="color" id="${setting.id}" 
                     value="${savedValue ?? '#ffffff'}">
              <span class="color-value">${savedValue ?? '#ffffff'}</span>
            </div>
          </div>
        `;
        
      case 'number':
        return `
          <div class="setting-item setting-number" data-setting-id="${setting.id}">
            <label for="${setting.id}">${setting.label}</label>
            ${setting.description ? `<p class="setting-description">${setting.description}</p>` : ''}
            <input type="number" id="${setting.id}" 
                   class="number-input"
                   min="${setting.min}" 
                   max="${setting.max}" 
                   step="${setting.step ?? 1}"
                   value="${savedValue ?? 0}">
          </div>
        `;
        
      default:
        return '';
    }
  }
  
  private attachEventListeners(): void {
    if (!this.container) return;
    
    // Close button
    const closeBtn = this.container.querySelector('.options-close');
    closeBtn?.addEventListener('click', () => this.close());
    
    // Tab navigation
    this.container.querySelectorAll('.options-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const tabId = (e.currentTarget as HTMLElement).dataset.tabId;
        if (tabId) {
          this.switchTab(tabId);
        }
      });
    });
    
    // Setting controls
    this.attachSettingListeners();
    
    // Footer buttons
    const saveBtn = this.container.querySelector('.options-save');
    saveBtn?.addEventListener('click', () => this.save());
    
    const resetBtn = this.container.querySelector('.options-reset');
    resetBtn?.addEventListener('click', () => this.reset());
    
    const cancelBtn = this.container.querySelector('.options-cancel');
    cancelBtn?.addEventListener('click', () => {
      this.hasUnsavedChanges = false; // キャンセルなので変更を破棄
      this.close();
    });
  }
  
  private attachSettingListeners(): void {
    if (!this.container || !this.config) return;
    
    console.log('[OPTIONS] Attaching setting listeners');
    
    // Sliders
    this.container.querySelectorAll('.option-slider').forEach(slider => {
      const input = slider as HTMLInputElement;
      const settingId = input.id;
      const valueDisplay = document.getElementById(`${settingId}-value`);
      
      console.log('[OPTIONS] Attaching listener to slider:', settingId);
      
      input.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        console.log('[OPTIONS] Slider changed:', settingId, 'value:', value);
        
        if (valueDisplay) {
          valueDisplay.textContent = value;
        }
        this.updateSetting(settingId, parseFloat(value));
      });
    });
    
    // Checkboxes
    this.container.querySelectorAll('.option-checkbox').forEach(checkbox => {
      const input = checkbox as HTMLInputElement;
      console.log('[OPTIONS] Attaching listener to checkbox:', input.id);
      
      input.addEventListener('change', (e) => {
        console.log('[OPTIONS] Checkbox changed:', input.id, 'checked:', input.checked);
        this.updateSetting(input.id, input.checked);
      });
    });
    
    // Selects
    this.container.querySelectorAll('.option-select').forEach(select => {
      const input = select as HTMLSelectElement;
      input.addEventListener('change', (e) => {
        this.updateSetting(input.id, input.value);
      });
    });
    
    // Buttons
    this.container.querySelectorAll('.setting-action-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const actionId = (e.currentTarget as HTMLElement).dataset.actionId;
        if (actionId) {
          const setting = this.findSetting(actionId);
          if (setting?.onClick) {
            setting.onClick();
          }
        }
      });
    });
    
    // Keybinds
    this.container.querySelectorAll('.keybind-input').forEach(input => {
      const keybindInput = input as HTMLInputElement;
      
      keybindInput.addEventListener('click', (e) => {
        e.preventDefault();
        keybindInput.value = '入力待機中...';
        keybindInput.classList.add('recording');
        
        const handleKeyDown = (event: KeyboardEvent) => {
          event.preventDefault();
          
          const key = this.formatKeyCombo(event);
          keybindInput.value = key;
          keybindInput.classList.remove('recording');
          
          this.updateSetting(keybindInput.id, key);
          
          document.removeEventListener('keydown', handleKeyDown);
        };
        
        document.addEventListener('keydown', handleKeyDown);
      });
    });
    
    // Color pickers
    this.container.querySelectorAll('input[type="color"]').forEach(colorInput => {
      const input = colorInput as HTMLInputElement;
      const valueDisplay = input.nextElementSibling as HTMLElement;
      
      input.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        if (valueDisplay) {
          valueDisplay.textContent = value;
        }
        this.updateSetting(input.id, value);
      });
    });
    
    // Number inputs
    this.container.querySelectorAll('input[type="number"]').forEach(numberInput => {
      const input = numberInput as HTMLInputElement;
      input.addEventListener('change', (e) => {
        this.updateSetting(input.id, parseFloat(input.value));
      });
    });
  }
  
  private formatKeyCombo(event: KeyboardEvent): string {
    const parts: string[] = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    if (event.metaKey) parts.push('Meta');
    
    if (event.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(event.key)) {
      parts.push(event.key.toUpperCase());
    }
    
    return parts.join('+');
  }
  
  private findSetting(id: string): OptionsSetting | undefined {
    if (!this.config) return undefined;
    
    for (const tab of this.config.tabs) {
      for (const section of tab.sections) {
        const setting = section.settings.find(s => s.id === id);
        if (setting) return setting;
      }
    }
    
    return undefined;
  }
  
  private updateSetting(id: string, value: any): void {
    // 一時的な変更として保存
    this.tempSettings.set(id, value);
    this.hasUnsavedChanges = true;
    
    // リアルタイムプレビューのために即座に適用
    const setting = this.findSetting(id);
    if (setting?.onChange) {
      setting.onChange(value);
    }
  }
  
  private switchTab(tabId: string): void {
    if (this.activeTabId === tabId) return;
    
    // 未保存の変更がある場合は確認
    if (this.hasUnsavedChanges) {
      this.showTabSwitchDialog(tabId);
      return;
    }
    
    this.doSwitchTab(tabId);
  }
  
  private doSwitchTab(tabId: string): void {
    this.activeTabId = tabId;
    
    // 設定を再読み込みしてからレンダリング
    this.loadSoundSettings().then(() => {
      // タブのアクティブ状態を更新
      this.container?.querySelectorAll('.options-tab').forEach(tab => {
        const currentTabId = (tab as HTMLElement).dataset.tabId;
        if (currentTabId === tabId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
      
      // グラフィックタブの場合
      if (tabId === 'graphics') {
        // プロモードボタンのテキストを更新
        const proMode = localStorage.getItem('graphics-pro-mode') === 'true';
        setTimeout(() => {
          const button = document.querySelector('[data-action-id="pro-mode-toggle"]') as HTMLButtonElement;
          if (button) {
            button.textContent = proMode ? '無効にする' : '有効にする';
          }
        }, 100);
        
        // プレビューパネルを表示
        const previewPanel = document.getElementById('options-preview-panel');
        if (previewPanel) {
          previewPanel.style.display = 'flex';
          // プレビューがまだ初期化されていない場合は初期化
          if (!this.previewRenderer) {
            setTimeout(() => this.initPreview(), 100);
          }
        }
      } else {
        // 他のタブではプレビューパネルを非表示
        const previewPanel = document.getElementById('options-preview-panel');
        if (previewPanel) {
          previewPanel.style.display = 'none';
        }
      }
      
      // 全体を再レンダリング
      this.render();
    });
  }
  
  private showTabSwitchDialog(targetTabId: string): void {
    const dialog = document.createElement('div');
    dialog.className = 'unsaved-changes-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a2e;
      border: 2px solid #d4af37;
      border-radius: 8px;
      padding: 30px;
      z-index: 1000001;
      color: white;
      min-width: 400px;
      text-align: center;
    `;
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 20px 0; color: #d4af37;">未保存の変更</h3>
      <p style="margin: 0 0 30px 0;">保存していない変更があります。タブを切り替える前に保存しますか？</p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="dialog-cancel" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">キャンセル</button>
        <button id="dialog-discard" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">破棄して切り替え</button>
        <button id="dialog-save" style="padding: 10px 20px; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer;">保存して切り替え</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // ボタンのイベントリスナー
    document.getElementById('dialog-cancel')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    document.getElementById('dialog-discard')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
      // 変更を破棄して元の設定に戻す
      this.tempSettings.clear();
      this.settings.forEach((value, key) => {
        this.tempSettings.set(key, value);
      });
      this.hasUnsavedChanges = false;
      this.revertChanges();
      this.doSwitchTab(targetTabId);
    });
    
    document.getElementById('dialog-save')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
      this.save();
      this.doSwitchTab(targetTabId);
    });
  }
  
  async open(): Promise<void> {
    if (!this.overlay || !this.container) return;
    
    console.log('[OPTIONS] Opening options screen');
    console.log('[OPTIONS] Config:', this.config);
    console.log('[OPTIONS] Container exists:', !!this.container);
    console.log('[OPTIONS] Overlay exists:', !!this.overlay);
    
    this.isOpen = true;
    
    // サウンド設定を再読み込み
    await this.loadSoundSettings();
    
    // 一時設定を現在の設定でリセット
    this.tempSettings.clear();
    this.settings.forEach((value, key) => {
      this.tempSettings.set(key, value);
    });
    this.hasUnsavedChanges = false;
    
    // デバッグ: 設定の確認
    console.log('[OPTIONS] Settings after load:', Array.from(this.settings.entries()));
    
    this.render();
    
    // デバッグ: DOM要素の確認
    console.log('[OPTIONS] Container innerHTML length:', this.container.innerHTML.length);
    console.log('[OPTIONS] options-content element:', this.container.querySelector('.options-content'));
    
    this.overlay.style.display = 'block';
    this.container.style.display = 'flex';
    
    animationSystem.fadeIn({
      targets: this.overlay,
      duration: 300
    });
    
    // 全画面スライドインアニメーション
    this.container.style.transform = 'translateY(100%)';
    
    setTimeout(() => {
      this.container.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
      this.container.style.transform = 'translateY(0)';
    }, 10);
    
    animationSystem.fadeIn({
      targets: this.container,
      duration: 400
    });
  }
  
  close(): void {
    if (!this.overlay || !this.container) return;
    
    // 未保存の変更がある場合は確認
    if (this.hasUnsavedChanges) {
      this.showUnsavedChangesDialog();
      return;
    }
    
    this.doClose();
  }
  
  private doClose(): void {
    if (!this.overlay || !this.container) return;
    
    this.isOpen = false;
    
    // 変更を元に戻す
    this.revertChanges();
    
    // プレビューをクリーンアップ
    if (this.previewAnimationId) {
      cancelAnimationFrame(this.previewAnimationId);
      this.previewAnimationId = undefined;
    }
    if (this.previewRenderer) {
      this.previewRenderer.dispose();
      this.previewRenderer = undefined;
    }
    if (this.previewComposer) {
      this.previewComposer.dispose();
      this.previewComposer = undefined;
    }
    // シーンの参照をクリア
    this.previewScene = undefined;
    this.previewCamera = undefined;
    this.previewBlackHole = undefined;
    this.previewBloomPass = undefined;
    
    // 全画面スライドアウトアニメーション
    this.container.style.transition = 'transform 0.3s cubic-bezier(0.7, 0, 0.84, 0)';
    this.container.style.transform = 'translateY(100%)';
    
    animationSystem.fadeOut({
      targets: this.overlay,
      duration: 300,
      complete: () => {
        this.overlay!.style.display = 'none';
        this.container!.style.display = 'none';
        this.container!.style.transform = '';
        this.container!.style.transition = '';
      }
    });
  }
  
  private showUnsavedChangesDialog(): void {
    const dialog = document.createElement('div');
    dialog.className = 'unsaved-changes-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1a1a2e;
      border: 2px solid #d4af37;
      border-radius: 8px;
      padding: 30px;
      z-index: 1000001;
      color: white;
      min-width: 400px;
      text-align: center;
    `;
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 20px 0; color: #d4af37;">未保存の変更</h3>
      <p style="margin: 0 0 30px 0;">保存していない変更があります。どうしますか？</p>
      <div style="display: flex; gap: 10px; justify-content: center;">
        <button id="dialog-back" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">戻る</button>
        <button id="dialog-discard" style="padding: 10px 20px; background: #666; color: white; border: none; border-radius: 4px; cursor: pointer;">閉じる</button>
        <button id="dialog-save" style="padding: 10px 20px; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer;">保存して閉じる</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // ボタンのイベントリスナー
    document.getElementById('dialog-back')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    document.getElementById('dialog-discard')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
      this.hasUnsavedChanges = false;
      this.doClose();
    });
    
    document.getElementById('dialog-save')?.addEventListener('click', () => {
      document.body.removeChild(dialog);
      this.save();
      this.doClose();
    });
  }
  
  private save(): void {
    // 一時設定を正式な設定にコピー
    this.tempSettings.forEach((value, key) => {
      this.settings.set(key, value);
    });
    
    // ローカルストレージに保存
    this.saveSettings();
    
    // 変更フラグをリセット
    this.hasUnsavedChanges = false;
    
    if ((window as any).feedbackSystem) {
      (window as any).feedbackSystem.showToast({
        message: '設定を保存しました',
        type: 'success',
        duration: 2000
      });
    }
  }
  
  private reset(): void {
    if (confirm('すべての設定をデフォルトに戻しますか？')) {
      // デフォルト値を取得して設定
      this.tempSettings.clear();
      if (this.config) {
        this.config.tabs.forEach(tab => {
          tab.sections.forEach(section => {
            section.settings.forEach(setting => {
              this.tempSettings.set(setting.id, setting.value);
              // リアルタイムで適用
              if (setting.onChange) {
                setting.onChange(setting.value);
              }
            });
          });
        });
      }
      
      this.hasUnsavedChanges = true;
      this.render();
      
      if ((window as any).feedbackSystem) {
        (window as any).feedbackSystem.showToast({
          message: '設定をデフォルトに戻しました',
          type: 'info',
          duration: 2000
        });
      }
    }
  }
  
  private revertChanges(): void {
    // 一時的な変更を元に戻す
    this.settings.forEach((value, key) => {
      const setting = this.findSetting(key);
      if (setting?.onChange) {
        setting.onChange(value);
      }
    });
  }
  
  private loadSettings(): void {
    const saved = localStorage.getItem('cosmic-gardener-options');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        Object.entries(data).forEach(([key, value]) => {
          this.settings.set(key, value);
        });
      } catch (error) {
        console.error('[OPTIONS] Failed to load settings:', error);
      }
    }
  }
  
  private saveSettings(): void {
    const data: Record<string, any> = {};
    this.settings.forEach((value, key) => {
      data[key] = value;
    });
    
    localStorage.setItem('cosmic-gardener-options', JSON.stringify(data));
  }
  
  getSetting(id: string): any {
    return this.settings.get(id);
  }
  
  setSetting(id: string, value: any): void {
    this.settings.set(id, value);
    this.saveSettings();
  }
}

export const optionsScreen = new OptionsScreen();