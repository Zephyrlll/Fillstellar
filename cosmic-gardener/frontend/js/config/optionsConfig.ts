import { OptionsConfig } from '../systems/optionsScreen.js';

// 解像度スケールインジケーターを表示
function showResolutionScaleIndicator(scale: number): void {
  // 既存のインジケーターを削除
  const existingIndicator = document.getElementById('resolution-scale-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // 新しいインジケーターを作成
  const indicator = document.createElement('div');
  indicator.id = 'resolution-scale-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    border: 2px solid ${scale < 100 ? '#ff6b6b' : scale > 100 ? '#4ecdc4' : '#ffd93d'};
    border-radius: 8px;
    font-family: monospace;
    font-size: 16px;
    z-index: 100000;
    pointer-events: none;
    transition: opacity 0.3s;
  `;
  
  indicator.innerHTML = `
    <div style="margin-bottom: 5px; font-weight: bold;">解像度スケール: ${scale}%</div>
    <div style="font-size: 14px; color: ${scale < 100 ? '#ff6b6b' : scale > 100 ? '#4ecdc4' : '#ffd93d'};">
      ${scale < 100 ? '低解像度 (高速)' : scale > 100 ? '高解像度 (低速)' : '標準解像度'}
    </div>
  `;
  
  document.body.appendChild(indicator);
  
  // 3秒後にフェードアウト
  setTimeout(() => {
    indicator.style.opacity = '0';
    setTimeout(() => indicator.remove(), 300);
  }, 3000);
}

export const optionsConfig: OptionsConfig = {
  title: 'オプション',
  tabs: [
    {
      id: 'gameplay',
      label: 'ゲームプレイ',
      icon: '🎮',
      sections: [
        {
          id: 'game-speed',
          label: 'ゲーム速度',
          icon: '⏱️',
          settings: [
            {
              id: 'simulation-speed',
              label: 'シミュレーション速度',
              type: 'slider',
              min: 0.5,
              max: 5,
              step: 0.5,
              value: 1,
              description: 'ゲーム全体の進行速度を調整します'
            },
            {
              id: 'auto-pause',
              label: '自動ポーズ',
              type: 'checkbox',
              value: true,
              description: 'タブが非アクティブ時にゲームを自動的に一時停止'
            }
          ]
        },
        {
          id: 'automation',
          label: '自動化設定',
          icon: '🤖',
          settings: [
            {
              id: 'auto-conversion',
              label: '資源の自動変換',
              type: 'checkbox',
              value: false,
              description: '資源が一定量に達したら自動的に変換'
            },
            {
              id: 'auto-research',
              label: '研究の自動選択',
              type: 'checkbox',
              value: false,
              description: '研究が完了したら次の研究を自動的に開始'
            },
            {
              id: 'auto-celestial-creation',
              label: '天体の自動生成',
              type: 'checkbox',
              value: false,
              description: '資源が十分な時に天体を自動的に作成'
            }
          ]
        },
        {
          id: 'notifications',
          label: '通知設定',
          icon: '🔔',
          settings: [
            {
              id: 'achievement-notification',
              label: '実績解除通知',
              type: 'checkbox',
              value: true
            },
            {
              id: 'research-complete-notification',
              label: '研究完了通知',
              type: 'checkbox',
              value: true
            },
            {
              id: 'resource-full-notification',
              label: 'リソース満杯通知',
              type: 'checkbox',
              value: false
            }
          ]
        }
      ]
    },
    {
      id: 'controls',
      label: 'コントロール',
      icon: '🎯',
      sections: [
        {
          id: 'camera-controls',
          label: 'カメラ操作',
          icon: '📷',
          settings: [
            {
              id: 'camera-sensitivity',
              label: 'カメラ感度',
              type: 'slider',
              min: 0.1,
              max: 2,
              step: 0.1,
              value: 1,
              description: 'マウスでのカメラ回転速度'
            },
            {
              id: 'zoom-speed',
              label: 'ズーム速度',
              type: 'slider',
              min: 0.5,
              max: 3,
              step: 0.1,
              value: 1,
              description: 'マウスホイールでのズーム速度'
            },
            {
              id: 'invert-zoom',
              label: 'ズーム反転',
              type: 'checkbox',
              value: false,
              description: 'マウスホイールの方向を反転'
            }
          ]
        },
        {
          id: 'keybinds',
          label: 'キーバインド',
          icon: '⌨️',
          settings: [
            {
              id: 'pause-key',
              label: 'ポーズ',
              type: 'keybind',
              value: 'Space',
              description: 'ゲームを一時停止/再開'
            },
            {
              id: 'speed-up-key',
              label: '速度アップ',
              type: 'keybind',
              value: 'Shift+Plus',
              description: 'ゲーム速度を上げる'
            },
            {
              id: 'speed-down-key',
              label: '速度ダウン',
              type: 'keybind',
              value: 'Shift+Minus',
              description: 'ゲーム速度を下げる'
            },
            {
              id: 'screenshot-key',
              label: 'スクリーンショット',
              type: 'keybind',
              value: 'F12',
              description: '画面のスクリーンショットを撮影'
            }
          ]
        },
        {
          id: 'mouse-settings',
          label: 'マウス設定',
          icon: '🖱️',
          settings: [
            {
              id: 'mouse-smoothing',
              label: 'マウススムージング',
              type: 'checkbox',
              value: true,
              description: 'マウス移動を滑らかにする'
            },
            {
              id: 'edge-panning',
              label: 'エッジパン',
              type: 'checkbox',
              value: false,
              description: '画面端にマウスを移動するとカメラが移動'
            }
          ]
        }
      ]
    },
    {
      id: 'graphics',
      label: 'グラフィック',
      icon: '🎨',
      sections: [
        {
          id: 'basic-graphics',
          label: '基本設定',
          icon: '🎮',
          settings: [
            {
              id: 'graphics-preset',
              label: 'グラフィックプリセット（パフォーマンス）',
              type: 'select',
              value: 'medium',
              options: [
                { value: 'ultra', label: '最高' },
                { value: 'high', label: '高' },
                { value: 'medium', label: '中' },
                { value: 'low', label: '低' },
                { value: 'minimal', label: '最小' },
                { value: 'performance', label: 'パフォーマンス重視' },
                { value: 'custom', label: 'カスタム' }
              ],
              description: 'PC性能に合わせた最適な設定を選択',
              onChange: async (value: string) => {
                // プリセット選択時の処理
                console.log('[GRAPHICS] Preset changed:', value);
                
                // graphicsEngineをインポートして全ての設定を適用
                const { graphicsEngine } = await import('../graphicsEngine.js');
                const { gameStateManager, applyGraphicsPreset } = await import('../state.js');
                
                if (value !== 'custom') {
                  // プリセットを適用
                  const currentState = gameStateManager.getState();
                  const newGraphics = applyGraphicsPreset(currentState.graphics, value as any);
                  
                  // 状態を更新
                  gameStateManager.updateState(state => ({
                    ...state,
                    graphics: newGraphics
                  }));
                  
                  // 全ての設定を適用
                  graphicsEngine.applyAllSettings();
                  
                  // オプション画面の各設定値も更新
                  if ((window as any).optionsScreen) {
                    const optionsScreen = (window as any).optionsScreen;
                    // プリセットの各値を一時設定に反映
                    Object.entries(newGraphics).forEach(([key, value]) => {
                      if (key !== 'preset' && key !== 'performance' && key !== 'deviceInfo') {
                        optionsScreen.tempSettings.set(key, value);
                      }
                    });
                    
                    // UIを再レンダリング
                    optionsScreen.render();
                  }
                }
              }
            },
            {
              id: 'visual-style',
              label: 'ビジュアルスタイル（質感）',
              type: 'select',
              value: 'default',
              options: [
                { value: 'default', label: 'デフォルト' },
                { value: 'cinematic', label: '🎬 映画的' },
                { value: 'photorealistic', label: '📷 写実的' },
                { value: 'anime', label: '🎨 アニメ風' },
                { value: 'retro', label: '🕹️ レトロ' },
                { value: 'custom', label: 'カスタム' }
              ],
              description: 'お好みの視覚的な雰囲気を選択',
              onChange: async (value: string) => {
                // ビジュアルスタイル選択時の処理
                console.log('[GRAPHICS] Visual style changed:', value);
                
                // graphicsEngineをインポートして全ての設定を適用
                const { graphicsEngine } = await import('../graphicsEngine.js');
                const { gameStateManager, applyVisualStylePreset } = await import('../state.js');
                
                if (value !== 'custom') {
                  // ビジュアルスタイルを適用
                  const currentState = gameStateManager.getState();
                  const newGraphics = applyVisualStylePreset(currentState.graphics, value as any);
                  
                  // 状態を更新
                  gameStateManager.updateState(state => ({
                    ...state,
                    graphics: newGraphics
                  }));
                  
                  // graphicsEngineに全ての設定を適用
                  graphicsEngine.applyAllSettings(newGraphics);
                  
                  // オプション画面の各設定値も更新
                  if ((window as any).optionsScreen) {
                    const optionsScreen = (window as any).optionsScreen;
                    // ビジュアルスタイルの各値を一時設定に反映
                    Object.entries(newGraphics).forEach(([key, value]) => {
                      if (['bloom', 'depthOfField', 'filmGrain', 'filmGrainIntensity', 'toneMapping',
                           'colorCorrection', 'brightness', 'contrast', 'saturation', 'vignette', 'vignetteIntensity'].includes(key)) {
                        optionsScreen.tempSettings.set(key, value);
                      }
                    });
                    
                    // UIを再レンダリング
                    optionsScreen.render();
                  }
                }
              }
            },
            {
              id: 'fps-limit',
              label: 'FPS制限',
              type: 'select',
              value: '60',
              options: [
                { value: '30', label: '30 FPS' },
                { value: '60', label: '60 FPS' },
                { value: '120', label: '120 FPS' },
                { value: 'unlimited', label: '無制限' }
              ],
              description: '最大フレームレートを制限'
            },
            {
              id: 'pro-mode-toggle',
              label: 'プロモード',
              type: 'button',
              value: '有効にする',
              description: '詳細なグラフィック設定を表示',
              onClick: async () => {
                const proMode = localStorage.getItem('graphics-pro-mode') !== 'true';
                localStorage.setItem('graphics-pro-mode', proMode.toString());
                
                // プロモードセクションの表示切り替え
                const button = document.querySelector('[data-action-id="pro-mode-toggle"]') as HTMLButtonElement;
                if (button) {
                  button.textContent = proMode ? '無効にする' : '有効にする';
                }
                
                // オプションスクリーンを再レンダリング
                const { optionsScreen } = await import('../systems/optionsScreen.js');
                optionsScreen.render();
                
                if ((window as any).feedbackSystem) {
                  (window as any).feedbackSystem.showToast({
                    message: `プロモードを${proMode ? '有効' : '無効'}にしました`,
                    type: 'info',
                    duration: 2000
                  });
                }
              }
            }
          ]
        },
        {
          id: 'resolution-display',
          label: '解像度と画面',
          icon: '🖥️',
          settings: [
            {
              id: 'resolution',
              label: '解像度',
              type: 'select',
              value: 'native',
              options: [
                { value: '1280x720', label: '720p (1280×720)' },
                { value: '1366x768', label: 'HD (1366×768)' },
                { value: '1920x1080', label: '1080p (1920×1080)' },
                { value: '2560x1440', label: '1440p (2560×1440)' },
                { value: '3840x2160', label: '4K (3840×2160)' },
                { value: 'native', label: 'ネイティブ解像度' }
              ],
              description: 'ゲームの表示解像度を設定します（フルスクリーン時のみ有効）',
              onChange: async (value: string) => {
                const { graphicsEngine } = await import('../graphicsEngine.js');
                const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
                if (!canvas) return;
                
                // フルスクリーンモードかどうか確認
                const isFullscreen = document.fullscreenElement === canvas;
                
                if (value === 'native') {
                  // ネイティブ解像度に設定
                  if (isFullscreen) {
                    // フルスクリーン時は画面の解像度を使用
                    graphicsEngine.setCanvasSize(screen.width, screen.height);
                  } else {
                    // ウィンドウモード時はウィンドウサイズを使用
                    graphicsEngine.setCanvasSize(window.innerWidth, window.innerHeight);
                  }
                } else {
                  // 指定された解像度を使用
                  const [width, height] = value.split('x').map(Number);
                  
                  if (!isFullscreen) {
                    // ウィンドウモードでは、指定解像度がウィンドウサイズより大きい場合は調整
                    const scaledWidth = Math.min(width, window.innerWidth);
                    const scaledHeight = Math.min(height, window.innerHeight);
                    graphicsEngine.setCanvasSize(scaledWidth, scaledHeight);
                    
                    // キャンバスのスタイルも更新
                    canvas.style.width = `${scaledWidth}px`;
                    canvas.style.height = `${scaledHeight}px`;
                  } else {
                    // フルスクリーンモードでは指定解像度をそのまま使用
                    graphicsEngine.setCanvasSize(width, height);
                  }
                }
                
                console.log(`[OPTIONS] Resolution changed to: ${value}`);
              }
            },
            {
              id: 'fullscreen-mode',
              label: '画面モード',
              type: 'select',
              value: 'windowed',
              options: [
                { value: 'windowed', label: 'ウィンドウモード' },
                { value: 'fullscreen', label: 'フルスクリーン' }
              ],
              description: '画面の表示モードを選択します',
              onChange: async (value: string) => {
                const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
                if (!canvas) return;
                
                try {
                  if (value === 'fullscreen') {
                    // フルスクリーンモードに入る
                    if (canvas.requestFullscreen) {
                      await canvas.requestFullscreen();
                    } else if ((canvas as any).webkitRequestFullscreen) {
                      await (canvas as any).webkitRequestFullscreen();
                    } else if ((canvas as any).mozRequestFullScreen) {
                      await (canvas as any).mozRequestFullScreen();
                    } else if ((canvas as any).msRequestFullscreen) {
                      await (canvas as any).msRequestFullscreen();
                    }
                    
                    // フルスクリーン時に解像度を更新
                    const { graphicsEngine } = await import('../graphicsEngine.js');
                    const resolutionSelect = document.querySelector('[data-setting-id="resolution"]') as HTMLSelectElement;
                    if (resolutionSelect && resolutionSelect.value === 'native') {
                      // ネイティブ解像度の場合は画面解像度を使用
                      graphicsEngine.setCanvasSize(screen.width, screen.height);
                    }
                  } else {
                    // フルスクリーン解除
                    if (document.exitFullscreen) {
                      await document.exitFullscreen();
                    } else if ((document as any).webkitExitFullscreen) {
                      await (document as any).webkitExitFullscreen();
                    } else if ((document as any).mozCancelFullScreen) {
                      await (document as any).mozCancelFullScreen();
                    } else if ((document as any).msExitFullscreen) {
                      await (document as any).msExitFullscreen();
                    }
                    
                    // ウィンドウモードに戻る時に解像度をリセット
                    const { graphicsEngine } = await import('../graphicsEngine.js');
                    graphicsEngine.setCanvasSize(window.innerWidth, window.innerHeight);
                  }
                  
                  console.log(`[OPTIONS] Screen mode changed to: ${value}`);
                } catch (error) {
                  console.error('[OPTIONS] Failed to change screen mode:', error);
                }
              }
            },
            {
              id: 'aspect-ratio',
              label: 'アスペクト比',
              type: 'select',
              value: 'auto',
              options: [
                { value: 'auto', label: '自動（ウィンドウに合わせる）' },
                { value: '16:9', label: '16:9（レターボックス）' },
                { value: '16:10', label: '16:10（レターボックス）' },
                { value: '21:9', label: '21:9（レターボックス）' },
                { value: '4:3', label: '4:3（レターボックス）' }
              ],
              description: '画面の縦横比を維持する方法を設定します',
              onChange: async (value: string) => {
                const { camera, renderer } = await import('../threeSetup.js');
                const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
                const container = canvas.parentElement;
                if (!canvas || !container) return;
                
                if (value === 'auto') {
                  // 自動モード：キャンバスを全画面に
                  canvas.style.position = 'absolute';
                  canvas.style.width = '100%';
                  canvas.style.height = '100%';
                  canvas.style.top = '0';
                  canvas.style.left = '0';
                  canvas.style.transform = 'none';
                  
                  // カメラのアスペクト比をウィンドウに合わせる
                  camera.aspect = window.innerWidth / window.innerHeight;
                  camera.updateProjectionMatrix();
                  
                  // レンダラーのサイズも更新
                  renderer.setSize(window.innerWidth, window.innerHeight);
                } else {
                  // 固定アスペクト比（レターボックス/ピラーボックス）
                  const [targetW, targetH] = value.split(':').map(Number);
                  const targetAspect = targetW / targetH;
                  
                  const windowW = window.innerWidth;
                  const windowH = window.innerHeight;
                  const windowAspect = windowW / windowH;
                  
                  let canvasW, canvasH;
                  
                  if (windowAspect > targetAspect) {
                    // ウィンドウが横長すぎる場合（ピラーボックス）
                    canvasH = windowH;
                    canvasW = windowH * targetAspect;
                  } else {
                    // ウィンドウが縦長すぎる場合（レターボックス）
                    canvasW = windowW;
                    canvasH = windowW / targetAspect;
                  }
                  
                  // キャンバスのサイズと位置を設定
                  canvas.style.position = 'absolute';
                  canvas.style.width = `${canvasW}px`;
                  canvas.style.height = `${canvasH}px`;
                  canvas.style.top = '50%';
                  canvas.style.left = '50%';
                  canvas.style.transform = 'translate(-50%, -50%)';
                  
                  // カメラとレンダラーを更新
                  camera.aspect = targetAspect;
                  camera.updateProjectionMatrix();
                  renderer.setSize(canvasW, canvasH);
                }
                
                console.log(`[OPTIONS] Aspect ratio changed to: ${value}`);
              }
            },
            {
              id: 'vsync',
              label: '垂直同期',
              type: 'checkbox',
              value: true,
              description: '画面のティアリングを防ぎます（ブラウザが自動管理）'
            },
            {
              id: 'target-fps',
              label: 'ターゲットFPS',
              type: 'select',
              value: '60',
              options: [
                { value: '30', label: '30 FPS' },
                { value: '60', label: '60 FPS' },
                { value: '120', label: '120 FPS' },
                { value: '144', label: '144 FPS' },
                { value: 'uncapped', label: '制限なし' }
              ],
              description: '目標フレームレートを設定します（実際のFPSはモニターに依存）',
              onChange: async (value: string) => {
                const { graphicsEngine } = await import('../graphicsEngine.js');
                if (value === 'uncapped') {
                  graphicsEngine.setFPSLimit(0);
                } else {
                  graphicsEngine.setFPSLimit(parseInt(value));
                }
              }
            },
            {
              id: 'render-resolution-scale',
              label: 'レンダリング解像度スケール',
              type: 'slider',
              min: 50,
              max: 200,
              step: 5,
              value: 100,
              description: '内部レンダリング解像度のスケール（%）。低くするとパフォーマンスが向上します',
              onChange: async (value: number) => {
                console.log('[OPTIONS] Resolution scale onChange:', value);
                
                // graphicsEngineをwindowから取得するか、直接インポート
                if ((window as any).graphicsEngine) {
                  (window as any).graphicsEngine.setResolutionScale(value / 100);
                  
                  // デバッグ用：解像度スケールインジケーターを表示
                  showResolutionScaleIndicator(value);
                } else {
                  // windowにない場合は直接インポート
                  const { graphicsEngine } = await import('../graphicsEngine.js');
                  if (graphicsEngine && typeof graphicsEngine.setResolutionScale === 'function') {
                    graphicsEngine.setResolutionScale(value / 100);
                    showResolutionScaleIndicator(value);
                  } else {
                    console.error('[OPTIONS] graphicsEngine.setResolutionScale is not available');
                  }
                }
              }
            }
          ],
          isProMode: true
        },
        {
          id: 'post-process',
          label: 'ポストプロセス',
          icon: '🎨',
          settings: [
            {
              id: 'motion-blur',
              label: 'モーションブラー',
              type: 'select',
              value: 'off',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' }
              ],
              description: 'カメラの動きに対するブラー効果'
            },
            {
              id: 'depth-of-field',
              label: '被写界深度（DoF）',
              type: 'select',
              value: 'off',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'on', label: 'オン' },
                { value: 'dynamic', label: '動的' }
              ],
              description: '焦点以外のぼかし効果',
              onChange: (value: string) => {
                import('../graphicsEngine.js').then(({ graphicsEngine }) => {
                  graphicsEngine.applyBokehEffect({
                    enabled: value !== 'off',
                    focus: value === 'dynamic' ? 1000 : 2000,
                    aperture: value === 'dynamic' ? 0.025 : 0.05,
                    maxblur: value === 'dynamic' ? 0.01 : 0.02
                  });
                });
              }
            },
            {
              id: 'bloom',
              label: 'ブルーム',
              type: 'select',
              value: 'on',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'on', label: 'オン' },
                { value: 'low', label: '低' },
                { value: 'high', label: '高' }
              ],
              description: '光のにじみ効果',
              onChange: async (value: string) => {
                console.log('[OPTIONS] Bloom setting changed:', value);
                
                // bloomPassに直接アクセス
                const { bloomPass } = await import('../threeSetup.js');
                if (!bloomPass) {
                  console.error('[OPTIONS] BloomPass not found');
                  return;
                }
                
                // オプション画面のプレビューも更新
                const optionsScreen = (window as any).optionsScreen;
                if (optionsScreen && optionsScreen.updatePreviewBloom) {
                  optionsScreen.updatePreviewBloom(value);
                }
                
                switch (value) {
                  case 'off':
                    bloomPass.enabled = false;
                    break;
                  case 'low':
                    bloomPass.enabled = true;
                    bloomPass.strength = 1.0;
                    bloomPass.threshold = 0.8;
                    bloomPass.radius = 0.5;
                    break;
                  case 'on':
                    bloomPass.enabled = true;
                    bloomPass.strength = 1.5;
                    bloomPass.threshold = 0.6;
                    bloomPass.radius = 0.7;
                    break;
                  case 'high':
                    bloomPass.enabled = true;
                    bloomPass.strength = 2.5;
                    bloomPass.threshold = 0.4;
                    bloomPass.radius = 1.0;
                    break;
                }
                
                console.log('[OPTIONS] Bloom settings applied:', {
                  enabled: bloomPass.enabled,
                  strength: bloomPass.strength,
                  threshold: bloomPass.threshold,
                  radius: bloomPass.radius
                });
              }
            },
            {
              id: 'chromatic-aberration',
              label: '色収差（Chromatic Aberration）',
              type: 'checkbox',
              value: false,
              description: 'レンズっぽい歪み効果'
            },
            {
              id: 'film-grain',
              label: 'フィルムグレイン',
              type: 'checkbox',
              value: false,
              description: 'フィルムのような粒子効果',
              onChange: (value: boolean) => {
                import('../graphicsEngine.js').then(({ graphicsEngine }) => {
                  const intensitySlider = document.querySelector('[data-setting-id="film-grain-intensity"]') as HTMLInputElement;
                  const intensity = intensitySlider ? parseFloat(intensitySlider.value) / 100 : 0.5;
                  graphicsEngine.applyFilmGrainEffect({
                    enabled: value,
                    noiseIntensity: intensity * 0.5,
                    scanlinesIntensity: intensity * 0.05
                  });
                });
              }
            },
            {
              id: 'film-grain-intensity',
              label: 'フィルムグレイン強度',
              type: 'slider',
              min: 0,
              max: 100,
              step: 5,
              value: 50,
              description: 'フィルムグレインの強さ',
              onChange: (value: number) => {
                import('../graphicsEngine.js').then(({ graphicsEngine }) => {
                  const checkbox = document.querySelector('[data-setting-id="film-grain"]') as HTMLInputElement;
                  if (checkbox && checkbox.checked) {
                    const intensity = value / 100;
                    graphicsEngine.applyFilmGrainEffect({
                      enabled: true,
                      noiseIntensity: intensity * 0.5,
                      scanlinesIntensity: intensity * 0.05
                    });
                  }
                });
              }
            },
            {
              id: 'lens-flare',
              label: 'レンズフレア',
              type: 'select',
              value: 'off',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'on', label: 'オン' },
                { value: 'real', label: 'リアル' },
                { value: 'cinematic', label: 'シネマ風' }
              ],
              description: '光源からのレンズフレア効果'
            },
            {
              id: 'ambient-occlusion',
              label: 'アンビエントオクルージョン（AO）',
              type: 'select',
              value: 'ssao',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'ssao', label: 'SSAO' },
                { value: 'hbao', label: 'HBAO+' },
                { value: 'rtx-ao', label: 'RTX AO' }
              ],
              description: '陰影表現の技術'
            },
            {
              id: 'tone-mapping',
              label: 'トーンマッピング',
              type: 'select',
              value: 'aces',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'reinhard', label: 'Reinhard' },
                { value: 'filmic', label: 'Filmic' },
                { value: 'aces', label: 'ACES' }
              ],
              description: '明暗の変換方式',
              onChange: async (value: string) => {
                console.log('[OPTIONS] Tone mapping changed:', value);
                
                const { graphicsEngine } = await import('../graphicsEngine.js');
                graphicsEngine.applyToneMapping(value);
              }
            },
            {
              id: 'color-correction',
              label: '色補正',
              type: 'checkbox',
              value: false,
              description: '明度・コントラスト・彩度の調整',
              onChange: async (value: boolean) => {
                const { graphicsEngine } = await import('../graphicsEngine.js');
                if (value) {
                  // 現在のスライダー値を取得
                  const brightnessSlider = document.querySelector('[data-setting-id="brightness"]') as HTMLInputElement;
                  const contrastSlider = document.querySelector('[data-setting-id="contrast"]') as HTMLInputElement;
                  const saturationSlider = document.querySelector('[data-setting-id="saturation"]') as HTMLInputElement;
                  
                  graphicsEngine.applyColorCorrection({
                    enabled: true,
                    brightness: brightnessSlider ? parseFloat(brightnessSlider.value) / 100 : 1.0,
                    contrast: contrastSlider ? parseFloat(contrastSlider.value) / 100 : 1.0,
                    saturation: saturationSlider ? parseFloat(saturationSlider.value) / 100 : 1.0
                  });
                } else {
                  graphicsEngine.applyColorCorrection({ enabled: false });
                }
              }
            },
            {
              id: 'brightness',
              label: '明度',
              type: 'slider',
              min: 50,
              max: 150,
              step: 5,
              value: 100,
              description: '画面の明るさ',
              onChange: async (value: number) => {
                const { graphicsEngine } = await import('../graphicsEngine.js');
                const checkbox = document.querySelector('[data-setting-id="color-correction"]') as HTMLInputElement;
                if (checkbox && checkbox.checked) {
                  const contrastSlider = document.querySelector('[data-setting-id="contrast"]') as HTMLInputElement;
                  const saturationSlider = document.querySelector('[data-setting-id="saturation"]') as HTMLInputElement;
                  
                  graphicsEngine.applyColorCorrection({
                    enabled: true,
                    brightness: value / 100,
                    contrast: contrastSlider ? parseFloat(contrastSlider.value) / 100 : 1.0,
                    saturation: saturationSlider ? parseFloat(saturationSlider.value) / 100 : 1.0
                  });
                }
              }
            },
            {
              id: 'contrast',
              label: 'コントラスト',
              type: 'slider',
              min: 50,
              max: 150,
              step: 5,
              value: 100,
              description: '明暗の差',
              onChange: async (value: number) => {
                const { graphicsEngine } = await import('../graphicsEngine.js');
                const checkbox = document.querySelector('[data-setting-id="color-correction"]') as HTMLInputElement;
                if (checkbox && checkbox.checked) {
                  const brightnessSlider = document.querySelector('[data-setting-id="brightness"]') as HTMLInputElement;
                  const saturationSlider = document.querySelector('[data-setting-id="saturation"]') as HTMLInputElement;
                  
                  graphicsEngine.applyColorCorrection({
                    enabled: true,
                    brightness: brightnessSlider ? parseFloat(brightnessSlider.value) / 100 : 1.0,
                    contrast: value / 100,
                    saturation: saturationSlider ? parseFloat(saturationSlider.value) / 100 : 1.0
                  });
                }
              }
            },
            {
              id: 'saturation',
              label: '彩度',
              type: 'slider',
              min: 0,
              max: 200,
              step: 5,
              value: 100,
              description: '色の鮮やかさ',
              onChange: async (value: number) => {
                const { graphicsEngine } = await import('../graphicsEngine.js');
                const checkbox = document.querySelector('[data-setting-id="color-correction"]') as HTMLInputElement;
                if (checkbox && checkbox.checked) {
                  const brightnessSlider = document.querySelector('[data-setting-id="brightness"]') as HTMLInputElement;
                  const contrastSlider = document.querySelector('[data-setting-id="contrast"]') as HTMLInputElement;
                  
                  graphicsEngine.applyColorCorrection({
                    enabled: true,
                    brightness: brightnessSlider ? parseFloat(brightnessSlider.value) / 100 : 1.0,
                    contrast: contrastSlider ? parseFloat(contrastSlider.value) / 100 : 1.0,
                    saturation: value / 100
                  });
                }
              }
            },
            {
              id: 'vignette',
              label: 'ビネット効果',
              type: 'checkbox',
              value: false,
              description: '画面端を暗くする効果',
              onChange: async (value: boolean) => {
                const { graphicsEngine } = await import('../graphicsEngine.js');
                if (value) {
                  const intensitySlider = document.querySelector('[data-setting-id="vignette-intensity"]') as HTMLInputElement;
                  const intensity = intensitySlider ? parseFloat(intensitySlider.value) / 100 : 0.5;
                  
                  graphicsEngine.applyVignetteEffect({
                    enabled: true,
                    offset: 1.0,
                    darkness: 1.0 + (intensity * 2.0) // 1.0 to 3.0
                  });
                } else {
                  graphicsEngine.applyVignetteEffect({ enabled: false });
                }
              }
            },
            {
              id: 'vignette-intensity',
              label: 'ビネット強度',
              type: 'slider',
              min: 0,
              max: 100,
              step: 5,
              value: 50,
              description: 'ビネット効果の強さ',
              onChange: async (value: number) => {
                const { graphicsEngine } = await import('../graphicsEngine.js');
                const checkbox = document.querySelector('[data-setting-id="vignette"]') as HTMLInputElement;
                if (checkbox && checkbox.checked) {
                  const intensity = value / 100;
                  graphicsEngine.applyVignetteEffect({
                    enabled: true,
                    offset: 1.0,
                    darkness: 1.0 + (intensity * 2.0) // 1.0 to 3.0
                  });
                }
              }
            },
            {
              id: 'fog',
              label: 'フォグ（霧）',
              type: 'checkbox',
              value: true,
              description: '霧の効果を有効にする',
              onChange: async (value: boolean) => {
                console.log('[OPTIONS] Fog enabled:', value);
                
                const { scene } = await import('../threeSetup.js');
                const THREE = await import('three');
                
                if (value) {
                  // フォグを有効化（現在の密度設定を取得）
                  const fogDensitySlider = document.getElementById('fog-density') as HTMLInputElement;
                  const density = fogDensitySlider ? parseFloat(fogDensitySlider.value) / 100 : 0.3;
                  
                  // 宇宙をテーマにしたフォグ設定
                  const fogColor = new THREE.Color(0x000033); // 深い宇宙の青
                  const fogNear = 1000 * (1 - density);
                  const fogFar = 10000 * (2 - density);
                  
                  scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
                  console.log('[OPTIONS] Fog created:', {
                    color: fogColor.getHexString(),
                    near: fogNear,
                    far: fogFar
                  });
                } else {
                  // フォグを無効化
                  scene.fog = null;
                  console.log('[OPTIONS] Fog disabled');
                }
              }
            },
            {
              id: 'fog-density',
              label: 'フォグ密度',
              type: 'slider',
              min: 0,
              max: 100,
              step: 5,
              value: 30,
              description: '霧の濃さ',
              onChange: async (value: number) => {
                console.log('[OPTIONS] Fog density changed:', value);
                
                const { scene } = await import('../threeSetup.js');
                const THREE = await import('three');
                
                // フォグが有効な場合のみ更新
                if (scene.fog) {
                  const density = value / 100; // 0-1の範囲に正規化
                  
                  // 密度に基づいてフォグの範囲を調整
                  const fogNear = 1000 * (1 - density);
                  const fogFar = 10000 * (2 - density);
                  
                  // 既存のフォグの色を保持
                  const fogColor = scene.fog.color;
                  
                  // 新しいフォグを作成
                  scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
                  
                  console.log('[OPTIONS] Fog density updated:', {
                    density: density,
                    near: fogNear,
                    far: fogFar
                  });
                } else {
                  console.log('[OPTIONS] Fog is disabled, density change ignored');
                }
              }
            },
            {
              id: 'global-illumination',
              label: 'グローバルイルミネーション',
              type: 'select',
              value: 'baked',
              options: [
                { value: 'off', label: '無効' },
                { value: 'baked', label: 'ベイク' },
                { value: 'realtime', label: 'リアルタイム' }
              ],
              description: '間接光の計算方式'
            },
            {
              id: 'screen-space-reflections',
              label: 'スクリーンスペースリフレクション（SSR）',
              type: 'select',
              value: 'medium',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' }
              ],
              description: '画面内の反射表現'
            },
            {
              id: 'volumetric-lighting',
              label: '光の散乱（Volumetric Light）',
              type: 'select',
              value: 'low',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'low', label: '低' },
                { value: 'high', label: '高' }
              ],
              description: '空間を通る光の表現'
            }
          ],
          isProMode: true
        },
        {
          id: 'models-meshes',
          label: 'モデル/メッシュ',
          icon: '🔷',
          settings: [
            {
              id: 'mesh-quality',
              label: 'メッシュ品質',
              type: 'select',
              value: 'high',
              options: [
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' }
              ],
              description: 'ポリゴンの精度'
            },
            {
              id: 'detail-level',
              label: 'ディティール',
              type: 'select',
              value: 'high',
              options: [
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' }
              ],
              description: 'モデルの細部表現レベル'
            }
          ],
          isProMode: true
        },
        {
          id: 'textures',
          label: 'テクスチャ',
          icon: '🖼️',
          settings: [
            {
              id: 'texture-quality',
              label: 'テクスチャ品質',
              type: 'select',
              value: 'high',
              options: [
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' },
                { value: 'ultra', label: 'ウルトラ' }
              ],
              description: 'テクスチャの解像度と品質'
            },
            {
              id: 'anisotropic-filtering',
              label: '異方性フィルタリング',
              type: 'select',
              value: '8x',
              options: [
                { value: 'off', label: 'オフ' },
                { value: '2x', label: '2x' },
                { value: '4x', label: '4x' },
                { value: '8x', label: '8x' },
                { value: '16x', label: '16x' }
              ],
              description: '斜め視点の鮮明度'
            },
            {
              id: 'material-quality',
              label: 'マテリアル品質',
              type: 'select',
              value: 'high',
              options: [
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' }
              ],
              description: '物の表面のリアルさ'
            }
          ],
          isProMode: true
        },
        {
          id: 'shadows',
          label: 'シャドウ',
          icon: '🌑',
          settings: [
            {
              id: 'shadow-quality',
              label: '影の品質',
              type: 'select',
              value: 'high',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' },
                { value: 'ultra', label: 'ウルトラ' }
              ],
              description: '影の詳細度と品質'
            },
            {
              id: 'shadow-distance',
              label: '影の距離',
              type: 'select',
              value: 'medium',
              options: [
                { value: 'short', label: '短' },
                { value: 'medium', label: '中' },
                { value: 'long', label: '長' }
              ],
              description: 'どこまで影を描写するか'
            },
            {
              id: 'soft-shadows',
              label: 'ソフトシャドウ',
              type: 'checkbox',
              value: true,
              description: '影の輪郭を柔らかくする'
            },
            {
              id: 'dynamic-shadows',
              label: '動的シャドウ',
              type: 'checkbox',
              value: true,
              description: 'キャラクターや物体に動く影'
            }
          ],
          isProMode: true
        },
        {
          id: 'lighting',
          label: 'ライティング',
          icon: '💡',
          settings: [
            {
              id: 'dynamic-lighting',
              label: 'ダイナミックライティング',
              type: 'select',
              value: 'full',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'partial', label: '一部' },
                { value: 'full', label: 'フル' }
              ],
              description: '光源の変化をリアルタイムで反映'
            },
            {
              id: 'realtime-reflections',
              label: 'リアルタイム反射',
              type: 'select',
              value: 'ssr',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'ssr', label: 'SSR' },
                { value: 'raytracing', label: 'レイトレ' }
              ],
              description: '反射の計算方式'
            },
            {
              id: 'shadow-casting-lights',
              label: 'シャドウキャスティングライト数',
              type: 'slider',
              min: 1,
              max: 4,
              step: 1,
              value: 2,
              description: '複数光源の対応数'
            },
            {
              id: 'raytracing',
              label: 'レイトレーシング',
              type: 'select',
              value: 'off',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'on', label: 'オン' },
                { value: 'quality-low', label: '低品質' },
                { value: 'quality-medium', label: '中品質' },
                { value: 'quality-high', label: '高品質' }
              ],
              description: '光線追跡による高品質レンダリング'
            },
            {
              id: 'emissive-objects',
              label: '発光オブジェクト',
              type: 'checkbox',
              value: true,
              description: 'ネオンや炎などの発光効果'
            }
          ],
          isProMode: true
        },
        {
          id: 'effects',
          label: 'エフェクト',
          icon: '✨',
          settings: [
            {
              id: 'particle-effects',
              label: 'パーティクルエフェクト',
              type: 'select',
              value: 'high',
              options: [
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' }
              ],
              description: '煙・火花などの粒子効果'
            },
            {
              id: 'air-physics',
              label: '空気の物理演算',
              type: 'select',
              value: 'simple',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'simple', label: 'シンプル' },
                { value: 'real', label: 'リアル' }
              ],
              description: '風や気流のシミュレーション'
            },
            {
              id: 'water-simulation',
              label: '波紋や水のシミュレーション',
              type: 'select',
              value: 'simple',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'simple', label: '簡易' },
                { value: 'realtime', label: 'リアルタイム' }
              ],
              description: '水面の波紋や流体の表現'
            }
          ],
          isProMode: true
        },
        {
          id: 'physics',
          label: '衝突・物理演算',
          icon: '⚙️',
          settings: [
            {
              id: 'physics-accuracy',
              label: '物理精度',
              type: 'select',
              value: 'medium',
              options: [
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' }
              ],
              description: '爆発や崩壊の描写精度'
            },
            {
              id: 'ragdoll-physics',
              label: 'ラグドール物理',
              type: 'checkbox',
              value: true,
              description: '天体死亡時の動き'
            },
            {
              id: 'destruction-effects',
              label: '破壊表現',
              type: 'checkbox',
              value: true,
              description: '壁やオブジェクトが壊れる演出'
            }
          ],
          isProMode: true
        },
        {
          id: 'graphics-misc',
          label: 'その他',
          icon: '⚙️',
          settings: [
            {
              id: 'object-draw-distance',
              label: 'オブジェクト描画距離',
              type: 'select',
              value: 'medium',
              options: [
                { value: 'near', label: '近' },
                { value: 'medium', label: '中' },
                { value: 'far', label: '遠' }
              ],
              description: 'オブジェクトが表示される最大距離'
            },
            {
              id: 'gpu-particles',
              label: 'GPU粒子',
              type: 'checkbox',
              value: true,
              description: 'GPUを使用した高速パーティクル処理'
            }
          ],
          isProMode: true
        },
        {
          id: 'performance-optimization',
          label: 'パフォーマンス最適化',
          icon: '🚀',
          settings: [
            {
              id: 'dynamic-resolution',
              label: 'ダイナミック解像度',
              type: 'checkbox',
              value: false,
              description: '目標FPSを維持するため解像度を自動調整'
            },
            {
              id: 'target-fps',
              label: '目標FPS',
              type: 'number',
              min: 20,
              max: 240,
              step: 10,
              value: 60,
              description: 'ダイナミック解像度の目標フレームレート'
            },
            {
              id: 'gpu-usage-limit',
              label: 'GPU使用率上限',
              type: 'slider',
              min: 50,
              max: 100,
              step: 5,
              value: 90,
              description: 'GPU使用率の上限値（%）'
            },
            {
              id: 'vram-limit',
              label: 'VRAMメモリ使用量上限',
              type: 'select',
              value: 'auto',
              options: [
                { value: 'auto', label: '自動' },
                { value: '512', label: '512MB' },
                { value: '1024', label: '1GB' },
                { value: '2048', label: '2GB' },
                { value: '4096', label: '4GB' },
                { value: '8192', label: '8GB' },
                { value: '16384', label: '16GB' },
                { value: 'unlimited', label: '無制限' }
              ],
              description: 'ビデオメモリ使用量の上限'
            },
            {
              id: 'auto-optimize',
              label: '自動最適化',
              type: 'button',
              value: 'GPUを検出して最適化',
              description: 'お使いのGPUに最適な設定を自動で適用',
              onClick: () => {
                console.log('[OPTIONS] Auto-optimize clicked');
                // TODO: GPU検出と自動最適化の実装
              }
            },
            {
              id: 'benchmark',
              label: 'ベンチマーク',
              type: 'button',
              value: 'パフォーマンステスト実行',
              description: 'グラフィックパフォーマンスを測定',
              onClick: () => {
                console.log('[OPTIONS] Benchmark clicked');
                // TODO: ベンチマーク機能の実装
              }
            }
          ],
          isProMode: true
        },
        {
          id: 'advanced-rendering',
          label: '高度なレンダリング',
          icon: '🎨',
          settings: [
            {
              id: 'super-sampling',
              label: 'スーパーサンプリング',
              type: 'select',
              value: 'off',
              options: [
                { value: 'off', label: 'オフ' },
                { value: '2x', label: '2x SSAA' },
                { value: '4x', label: '4x SSAA' },
                { value: '8x', label: '8x SSAA' }
              ],
              description: '高品質アンチエイリアス（非常に重い）'
            },
            {
              id: 'hdr-rendering',
              label: 'HDRレンダリング',
              type: 'checkbox',
              value: false,
              description: '高ダイナミックレンジレンダリング'
            },
            {
              id: 'render-precision',
              label: 'レンダリング精度',
              type: 'select',
              value: '32',
              options: [
                { value: '16', label: '16ビット（高速）' },
                { value: '32', label: '32ビット（標準）' },
                { value: '64', label: '64ビット（高精度）' },
                { value: '128', label: '128ビット（超高精度）' }
              ],
              description: '浮動小数点演算の精度'
            },
            {
              id: 'texture-resolution-cap',
              label: 'テクスチャ解像度上限',
              type: 'select',
              value: '2048',
              options: [
                { value: '256', label: '256px' },
                { value: '512', label: '512px' },
                { value: '1024', label: '1024px' },
                { value: '2048', label: '2048px' },
                { value: '4096', label: '4096px' },
                { value: '8192', label: '8192px' },
                { value: 'unlimited', label: '無制限' }
              ],
              description: 'テクスチャの最大解像度'
            },
            {
              id: 'multi-gpu',
              label: 'マルチGPU対応',
              type: 'select',
              value: 'disabled',
              options: [
                { value: 'disabled', label: '無効' },
                { value: 'sli', label: 'SLI' },
                { value: 'crossfire', label: 'CrossFire' },
                { value: 'auto', label: '自動検出' }
              ],
              description: '複数GPUの並列処理'
            }
          ],
          isProMode: true
        },
        {
          id: 'low-spec-options',
          label: '低スペック最適化',
          icon: '🔋',
          settings: [
            {
              id: 'minimal-rendering',
              label: '最小レンダリングモード',
              type: 'checkbox',
              value: false,
              description: 'ワイヤーフレーム表示で超軽量化'
            },
            {
              id: 'fallback-2d',
              label: '2Dフォールバック',
              type: 'checkbox',
              value: false,
              description: '3D描画が困難な場合2D表示に切り替え'
            },
            {
              id: 'disable-textures',
              label: 'テクスチャ無効化',
              type: 'checkbox',
              value: false,
              description: '全テクスチャを無効にしてメモリ節約'
            },
            {
              id: 'minimal-memory-mode',
              label: '最小メモリモード',
              type: 'checkbox',
              value: false,
              description: '128MB VRAM環境でも動作可能に'
            },
            {
              id: 'effects-update-rate',
              label: 'エフェクト更新頻度',
              type: 'select',
              value: '60',
              options: [
                { value: '60', label: '毎フレーム' },
                { value: '30', label: '2フレームに1回' },
                { value: '15', label: '4フレームに1回' },
                { value: '10', label: '6フレームに1回' },
                { value: '5', label: '12フレームに1回' },
                { value: '1', label: '1秒に1回' }
              ],
              description: '視覚効果の更新頻度を下げて負荷軽減'
            },
            {
              id: 'physics-precision',
              label: '物理演算精度',
              type: 'select',
              value: 'medium',
              options: [
                { value: 'low', label: '低（高速）' },
                { value: 'medium', label: '中（標準）' },
                { value: 'high', label: '高（精密）' }
              ],
              description: '物理演算の計算精度'
            }
          ],
          isProMode: true
        },
        {
          id: 'monitoring',
          label: 'パフォーマンスモニタリング',
          icon: '📊',
          settings: [
            {
              id: 'show-fps-counter',
              label: 'FPSカウンター表示',
              type: 'checkbox',
              value: false,
              description: '画面左上にFPSを常時表示',
              onChange: async (value: boolean) => {
                const { performanceOverlay } = await import('../systems/performanceOverlay.js');
                performanceOverlay.setFPSCounterVisibility(value);
              }
            },
            {
              id: 'show-gpu-stats',
              label: 'GPU統計表示',
              type: 'checkbox',
              value: false,
              description: 'GPU使用率、温度、VRAMを表示',
              onChange: async (value: boolean) => {
                const { performanceOverlay } = await import('../systems/performanceOverlay.js');
                performanceOverlay.setGPUStatsVisibility(value);
              }
            },
            {
              id: 'performance-overlay',
              label: 'パフォーマンスオーバーレイ',
              type: 'select',
              value: 'off',
              options: [
                { value: 'off', label: 'オフ' },
                { value: 'simple', label: 'シンプル' },
                { value: 'detailed', label: '詳細' },
                { value: 'graphs', label: 'グラフ付き' }
              ],
              description: '詳細なパフォーマンス情報を表示',
              onChange: async (value: string) => {
                const { performanceOverlay } = await import('../systems/performanceOverlay.js');
                performanceOverlay.setOverlayMode(value as any);
              }
            },
            {
              id: 'gpu-temp-throttle',
              label: 'GPU温度による自動調整',
              type: 'checkbox',
              value: false,
              description: 'GPU温度が高い時に自動で品質を下げる'
            },
            {
              id: 'throttle-temp',
              label: '調整開始温度',
              type: 'slider',
              min: 60,
              max: 90,
              step: 5,
              value: 80,
              description: 'この温度以上で品質を自動調整（℃）'
            }
          ],
          isProMode: true
        }
      ]
    },
    {
      id: 'audio',
      label: 'オーディオ',
      icon: '🔊',
      sections: [
        {
          id: 'volume',
          label: 'ボリューム設定',
          icon: '🎚️',
          settings: [
            {
              id: 'master-volume',
              label: 'マスター音量',
              type: 'slider',
              min: 0,
              max: 100,
              step: 1,
              value: 70,
              description: 'すべての音量を調整します',
              onChange: async (value) => {
                const { soundManager } = await import('../sound.js');
                const volume = value / 100;
                soundManager.updateSettings({ masterVolume: volume });
                soundManager.playUISound('click');
              }
            },
            {
              id: 'ambient-volume',
              label: '環境音',
              type: 'slider',
              min: 0,
              max: 100,
              step: 1,
              value: 60,
              description: '宇宙空間の環境音',
              onChange: async (value) => {
                const { soundManager } = await import('../sound.js');
                const volume = value / 100;
                soundManager.updateSettings({ ambientVolume: volume });
              }
            },
            {
              id: 'effects-volume',
              label: '効果音',
              type: 'slider',
              min: 0,
              max: 100,
              step: 1,
              value: 80,
              description: '天体の衝突音や爆発音など',
              onChange: async (value) => {
                const { soundManager } = await import('../sound.js');
                const volume = value / 100;
                soundManager.updateSettings({ effectsVolume: volume });
              }
            },
            {
              id: 'ui-volume',
              label: 'UI音',
              type: 'slider',
              min: 0,
              max: 100,
              step: 1,
              value: 50,
              description: 'ボタンクリック音やタブ切り替え音',
              onChange: async (value) => {
                const { soundManager } = await import('../sound.js');
                const volume = value / 100;
                soundManager.updateSettings({ uiVolume: volume });
                soundManager.playUISound('click');
              }
            }
          ]
        },
        {
          id: 'audio-settings',
          label: 'オーディオ設定',
          icon: '⚙️',
          settings: [
            {
              id: 'spatial-audio',
              label: '3D空間音響を有効にする',
              type: 'checkbox',
              value: true,
              description: '天体の位置に基づいた立体的な音響効果',
              onChange: async (value) => {
                const { soundManager } = await import('../sound.js');
                soundManager.updateSettings({ spatialAudio: value });
                soundManager.playUISound('click');
              }
            },
            {
              id: 'mute-toggle',
              label: 'ミュート',
              type: 'button',
              value: 'ミュート',
              description: 'すべての音を一時的にミュートします',
              onClick: async () => {
                const { soundManager } = await import('../sound.js');
                const settings = soundManager.getSettings();
                soundManager.updateSettings({ muted: !settings.muted });
                
                // ボタンのテキストを更新
                const button = document.querySelector('[data-action-id="mute-toggle"]') as HTMLButtonElement;
                if (button) {
                  button.textContent = settings.muted ? 'ミュート' : 'ミュート解除';
                }
                
                soundManager.playUISound('click');
              }
            }
          ]
        },
        {
          id: 'sound-test',
          label: 'サウンドテスト',
          icon: '🔊',
          settings: [
            {
              id: 'test-sounds',
              label: 'サウンドテスト',
              type: 'button',
              value: 'テスト再生',
              description: '現在の設定でサウンドをテストします',
              onClick: async () => {
                const { soundManager } = await import('../sound.js');
                
                // サウンドシステムの初期化
                if (!soundManager.initialized) {
                  await soundManager.init();
                  await new Promise(resolve => setTimeout(resolve, 100));
                }
                
                // 各種テスト音を順番に再生
                soundManager.playTestTone();
                
                setTimeout(() => {
                  soundManager.playUISound('click');
                }, 700);
                
                setTimeout(() => {
                  soundManager.createCelestialBodySound('asteroid');
                }, 1400);
                
                setTimeout(() => {
                  soundManager.playUISound('success');
                }, 2100);
                
                if ((window as any).feedbackSystem) {
                  (window as any).feedbackSystem.showToast({
                    message: 'サウンドテストを実行しました',
                    type: 'success',
                    duration: 3000
                  });
                }
              }
            }
          ]
        }
      ]
    },
    {
      id: 'other',
      label: 'その他',
      icon: '⚙️',
      sections: [
        {
          id: 'language',
          label: '言語設定',
          icon: '🌐',
          settings: [
            {
              id: 'language',
              label: '言語',
              type: 'select',
              value: 'ja',
              options: [
                { value: 'ja', label: '日本語' },
                { value: 'en', label: 'English' },
                { value: 'zh-CN', label: '简体中文' },
                { value: 'ko', label: '한국어' }
              ],
              description: 'ゲームの表示言語を選択'
            }
          ]
        },
        {
          id: 'data-management',
          label: 'データ管理',
          icon: '💾',
          settings: [
            {
              id: 'auto-save-interval',
              label: '自動セーブ間隔',
              type: 'select',
              value: '5',
              options: [
                { value: 'off', label: 'オフ' },
                { value: '1', label: '1分' },
                { value: '5', label: '5分' },
                { value: '10', label: '10分' },
                { value: '30', label: '30分' }
              ],
              description: '自動的にゲームを保存する間隔'
            },
            {
              id: 'export-save',
              label: 'セーブデータエクスポート',
              type: 'button',
              value: 'エクスポート',
              description: 'セーブデータをファイルとして保存',
              onClick: () => {
                console.log('[OPTIONS] Exporting save data...');
                // TODO: セーブデータエクスポート処理
              }
            },
            {
              id: 'import-save',
              label: 'セーブデータインポート',
              type: 'button',
              value: 'インポート',
              description: 'ファイルからセーブデータを読み込み',
              onClick: () => {
                console.log('[OPTIONS] Importing save data...');
                // TODO: セーブデータインポート処理
              }
            },
            {
              id: 'reset-game',
              label: 'ゲームリセット',
              type: 'button',
              value: 'リセット',
              description: 'すべての進行状況をリセット（危険！）',
              onClick: () => {
                if (confirm('本当にすべての進行状況をリセットしますか？この操作は取り消せません。')) {
                  console.log('[OPTIONS] Resetting game...');
                  // TODO: ゲームリセット処理
                }
              }
            }
          ]
        },
        {
          id: 'experimental',
          label: '実験的機能',
          icon: '🔬',
          settings: [
            {
              id: 'debug-mode',
              label: 'デバッグモード',
              type: 'checkbox',
              value: false,
              description: '開発者向けのデバッグ情報を表示'
            },
            {
              id: 'performance-monitor',
              label: 'パフォーマンスモニター',
              type: 'checkbox',
              value: false,
              description: 'FPSやメモリ使用量を表示'
            },
            {
              id: 'experimental-features',
              label: '実験的機能を有効化',
              type: 'checkbox',
              value: false,
              description: 'テスト中の新機能を使用可能にする'
            }
          ]
        },
        {
          id: 'about',
          label: 'バージョン情報',
          icon: 'ℹ️',
          settings: [
            {
              id: 'version-info',
              label: 'バージョン',
              type: 'button',
              value: 'v0.1.0',
              description: 'Cosmic Gardener (Idle Game Update)',
              onClick: () => {
                if ((window as any).feedbackSystem) {
                  (window as any).feedbackSystem.showToast({
                    message: 'Cosmic Gardener v0.1.0\nBuilt with TypeScript + Three.js',
                    type: 'info',
                    duration: 5000
                  });
                }
              }
            },
            {
              id: 'credits',
              label: 'クレジット',
              type: 'button',
              value: '表示',
              description: '開発者とコントリビューター',
              onClick: () => {
                console.log('[OPTIONS] Showing credits...');
                // TODO: クレジット表示
              }
            }
          ]
        }
      ]
    }
  ]
};