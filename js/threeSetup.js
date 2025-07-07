import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- 基本設定 -----------------------------------------------------------------
export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x000000, 3000, 8000); // フォグの距離を調整

export const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 20000);
camera.position.z = 5000; // カメラの初期位置を調整

export const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// --- ポストプロセッシング -----------------------------------------------------
export const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.8, 0.6, 0.6); // strength, radius, threshold を調整
composer.addPass(bloomPass);

// --- カメラコントロール -------------------------------------------------------
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.minDistance = 10;
controls.maxDistance = 20000; // 最大距離を延長
controls.enablePan = false; // WASD移動と競合するため無効化

// --- 光源 ---------------------------------------------------------------------
export const ambientLight = new THREE.AmbientLight(0x606060);
scene.add(ambientLight);
