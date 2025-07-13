import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// --- 基本設定 -----------------------------------------------------------------
export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 3000, 8000);
export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.position.z = 5000;
const canvas = document.getElementById('game-canvas');
if (!canvas) {
    throw new Error("Could not find canvas element with id 'game-canvas'");
}
export const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
// 初期サイズは仮設定 - graphicsEngineが適切に設定し直す（CSS更新を無効化）
renderer.setSize(window.innerWidth, window.innerHeight, false);
// CSS表示サイズを明示的に設定
canvas.style.width = window.innerWidth + 'px';
canvas.style.height = window.innerHeight + 'px';
// --- ポストプロセッシング -----------------------------------------------------
export const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 0.6, 0.6);
composer.addPass(bloomPass);
// --- カメラコントロール -------------------------------------------------------
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 10;
controls.maxDistance = 20000;
controls.enablePan = false;
// 常にブラックホール（原点）を中心に回転
controls.target.set(0, 0, 0);
controls.update();
// --- 光源 ---------------------------------------------------------------------
export const ambientLight = new THREE.AmbientLight(0x606060);
scene.add(ambientLight);
