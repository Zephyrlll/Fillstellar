import { OptionsConfig } from '../systems/optionsScreen.js';

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
              label: 'グラフィックプリセット',
              type: 'select',
              value: 'high',
              options: [
                { value: 'low', label: '低' },
                { value: 'medium', label: '中' },
                { value: 'high', label: '高' },
                { value: 'ultra', label: '最高' },
                { value: 'custom', label: 'カスタム' }
              ],
              description: '全体的なグラフィック品質を設定',
              onChange: (value: string) => {
                // プリセット選択時の処理
                console.log('[GRAPHICS] Preset changed:', value);
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
                if (value === 'native') {
                  // ネイティブ解像度に設定
                  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
                  if (canvas) {
                    graphicsEngine.setCanvasSize(window.innerWidth, window.innerHeight);
                  }
                } else {
                  const [width, height] = value.split('x').map(Number);
                  graphicsEngine.setCanvasSize(width, height);
                }
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
                
                if (value === 'fullscreen') {
                  // フルスクリーンAPI使用
                  if (canvas.requestFullscreen) {
                    await canvas.requestFullscreen();
                  } else if ((canvas as any).webkitRequestFullscreen) {
                    await (canvas as any).webkitRequestFullscreen();
                  } else if ((canvas as any).mozRequestFullScreen) {
                    await (canvas as any).mozRequestFullScreen();
                  }
                } else {
                  // フルスクリーン解除
                  if (document.exitFullscreen) {
                    await document.exitFullscreen();
                  } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                  } else if ((document as any).mozCancelFullScreen) {
                    await (document as any).mozCancelFullScreen();
                  }
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
                const { camera } = await import('../threeSetup.js');
                const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
                if (!canvas) return;
                
                if (value === 'auto') {
                  // カメラのアスペクト比を自動調整
                  camera.aspect = window.innerWidth / window.innerHeight;
                  camera.updateProjectionMatrix();
                } else {
                  // 固定アスペクト比（レターボックス処理が必要）
                  const [w, h] = value.split(':').map(Number);
                  camera.aspect = w / h;
                  camera.updateProjectionMatrix();
                  // TODO: レターボックスの実装
                }
              }
            },
            {
              id: 'vsync',
              label: '垂直同期',
              type: 'checkbox',
              value: true,
              description: '画面のティアリングを防ぎます（ブラウザが自動管理）',
              disabled: true
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
                const { graphicsEngine } = await import('../graphicsEngine.js');
                graphicsEngine.setResolutionScale(value / 100);
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
              description: '焦点以外のぼかし効果'
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
              description: '光のにじみ効果'
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
              description: 'フィルムのような粒子効果'
            },
            {
              id: 'film-grain-intensity',
              label: 'フィルムグレイン強度',
              type: 'slider',
              min: 0,
              max: 100,
              step: 5,
              value: 50,
              description: 'フィルムグレインの強さ'
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
              description: '明暗の変換方式'
            },
            {
              id: 'fog',
              label: 'フォグ（霧）',
              type: 'checkbox',
              value: true,
              description: '霧の効果を有効にする'
            },
            {
              id: 'fog-density',
              label: 'フォグ密度',
              type: 'slider',
              min: 0,
              max: 100,
              step: 5,
              value: 30,
              description: '霧の濃さ'
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