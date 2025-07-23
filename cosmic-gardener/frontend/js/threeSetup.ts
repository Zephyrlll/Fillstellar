import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { ColorCorrectionShader } from 'three/examples/jsm/shaders/ColorCorrectionShader.js';
import { VignetteShader } from 'three/examples/jsm/shaders/VignetteShader.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

// --- 基本設定 -----------------------------------------------------------------
export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 10000, 100000); // 描画距離を大幅に拡大

export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500000); // さらに遠くまで
camera.position.set(0, 500, 1500); // より近い視点で恒星とブラックホールを観察

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
    throw new Error("Could not find canvas element with id 'game-canvas'");
}

export const renderer = new THREE.WebGLRenderer({ 
    canvas: canvas, 
    antialias: true,
    powerPreference: "high-performance"
});
renderer.setSize(window.innerWidth, window.innerHeight);

// シャドウマップの初期設定
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// --- ポストプロセッシング -----------------------------------------------------
export const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom pass (既存)
export const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 0.6, 0.6);
bloomPass.enabled = true;
composer.addPass(bloomPass);

// Bokeh (被写界深度) pass
export const bokehPass = new BokehPass(scene, camera, {
    focus: 1000.0,
    aperture: 0.025,
    maxblur: 0.01,
    width: window.innerWidth,
    height: window.innerHeight
});
bokehPass.enabled = false; // デフォルトでは無効
composer.addPass(bokehPass);

// FXAA (アンチエイリアシング) pass
const fxaaPass = new ShaderPass(FXAAShader);
fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
fxaaPass.enabled = false; // デフォルトでは無効
export { fxaaPass };
composer.addPass(fxaaPass);

// Film pass (フィルムグレイン効果)
export const filmPass = new FilmPass(0.35, 0.025, 648, false);
filmPass.enabled = false; // デフォルトでは無効
composer.addPass(filmPass);

// Color correction pass
const colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
colorCorrectionPass.uniforms['powRGB'].value = new THREE.Vector3(2.2, 2.2, 2.2);
colorCorrectionPass.uniforms['mulRGB'].value = new THREE.Vector3(1.0, 1.0, 1.0);
colorCorrectionPass.enabled = false; // デフォルトでは無効
export { colorCorrectionPass };
composer.addPass(colorCorrectionPass);

// Vignette pass
const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms['offset'].value = 1.0;
vignettePass.uniforms['darkness'].value = 1.0;
vignettePass.enabled = false; // デフォルトでは無効
export { vignettePass };
composer.addPass(vignettePass);

// Gamma correction pass (最後に適用)
const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
gammaCorrectionPass.enabled = true; // 常に有効
export { gammaCorrectionPass };
composer.addPass(gammaCorrectionPass);

// --- カメラコントロール -------------------------------------------------------
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = false;
// カメラ距離の制限を調整（中間ズームをしやすくする）
controls.minDistance = 10;
controls.maxDistance = 20000;
controls.enablePan = true;

// より細かいズーム制御
controls.zoomSpeed = 1.0; // 標準的な速度
controls.rotateSpeed = 1.0;
controls.panSpeed = 1.0;

// 標準的なマウス操作
controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
};

// タッチ操作
controls.touches = {
    ONE: THREE.TOUCH.ROTATE,
    TWO: THREE.TOUCH.DOLLY_PAN
};

// ズーム操作の設定
controls.enableZoom = true;
controls.zoomToCursor = false; // カーソル位置ズームを無効化（標準動作）

// OrbitControlsの標準ズーム機能を使用（カスタムホイールハンドラーを削除）

// --- 光源 ---------------------------------------------------------------------
export const ambientLight = new THREE.AmbientLight(0x606060);
scene.add(ambientLight);

// メインの方向光源（シャドウ用）
export const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(1000, 2000, 1000);
directionalLight.castShadow = true;

// シャドウマップの設定
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 100;
directionalLight.shadow.camera.far = 5000;
directionalLight.shadow.camera.left = -2000;
directionalLight.shadow.camera.right = 2000;
directionalLight.shadow.camera.top = 2000;
directionalLight.shadow.camera.bottom = -2000;

scene.add(directionalLight);