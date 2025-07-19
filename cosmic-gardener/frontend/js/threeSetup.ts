import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

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

export const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 0.6, 0.6);
composer.addPass(bloomPass);

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