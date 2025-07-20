import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface LODConfig {
  distance: number;
  detail: 'high' | 'medium' | 'low' | 'billboard';
}

export class RenderOptimizer {
  private static instance: RenderOptimizer;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private frustum: THREE.Frustum;
  private projScreenMatrix: THREE.Matrix4;
  
  // LOD settings
  private lodConfigs: LODConfig[] = [
    { distance: 50, detail: 'high' },
    { distance: 100, detail: 'medium' },
    { distance: 200, detail: 'low' },
    { distance: 500, detail: 'billboard' }
  ];
  
  private constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
    
    this.initializeOptimizations();
  }
  
  static getInstance(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): RenderOptimizer {
    if (!RenderOptimizer.instance) {
      RenderOptimizer.instance = new RenderOptimizer(renderer, scene, camera);
    }
    return RenderOptimizer.instance;
  }
  
  private initializeOptimizations(): void {
    // Enable renderer optimizations
    this.renderer.powerPreference = 'high-performance';
    this.renderer.antialias = false; // Disable for better performance
    this.renderer.sortObjects = true;
    
    // Shadow optimizations
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.shadowMap.autoUpdate = false;
    }
  }
  
  // Frustum culling
  performFrustumCulling(): number {
    let culledCount = 0;
    
    // Update frustum
    this.projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    
    // Check all meshes in scene
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const inFrustum = this.frustum.intersectsObject(object);
        
        if (!inFrustum && object.visible) {
          object.visible = false;
          culledCount++;
        } else if (inFrustum && !object.visible) {
          object.visible = true;
        }
      }
    });
    
    return culledCount;
  }
  
  // Level of Detail (LOD) management
  updateLOD(objects: THREE.Object3D[]): void {
    const cameraPosition = this.camera.position;
    
    objects.forEach(object => {
      if (!object.userData.lod) return;
      
      const distance = object.position.distanceTo(cameraPosition);
      const lodConfig = this.getLODConfig(distance);
      
      if (object.userData.currentLOD !== lodConfig.detail) {
        this.applyLOD(object, lodConfig.detail);
        object.userData.currentLOD = lodConfig.detail;
      }
    });
  }
  
  private getLODConfig(distance: number): LODConfig {
    for (const config of this.lodConfigs) {
      if (distance <= config.distance) {
        return config;
      }
    }
    return this.lodConfigs[this.lodConfigs.length - 1];
  }
  
  private applyLOD(object: THREE.Object3D, detail: string): void {
    if (object instanceof THREE.Mesh && object.geometry) {
      switch (detail) {
        case 'high':
          // Use full detail geometry
          if (object.userData.highDetailGeometry) {
            object.geometry = object.userData.highDetailGeometry;
          }
          object.material = object.userData.highDetailMaterial || object.material;
          break;
          
        case 'medium':
          // Use simplified geometry
          if (object.userData.mediumDetailGeometry) {
            object.geometry = object.userData.mediumDetailGeometry;
          }
          break;
          
        case 'low':
          // Use very simplified geometry
          if (object.userData.lowDetailGeometry) {
            object.geometry = object.userData.lowDetailGeometry;
          }
          break;
          
        case 'billboard':
          // Replace with billboard sprite
          if (object.parent && object.userData.billboardSprite) {
            object.visible = false;
            object.userData.billboardSprite.visible = true;
          }
          break;
      }
    }
  }
  
  // Instanced rendering for repeated objects
  createInstancedMesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    count: number
  ): THREE.InstancedMesh {
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    return instancedMesh;
  }
  
  // Texture optimization
  optimizeTextures(): void {
    const textureLoader = new THREE.TextureLoader();
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        
        materials.forEach(material => {
          if (material instanceof THREE.MeshBasicMaterial ||
              material instanceof THREE.MeshStandardMaterial) {
            // Reduce texture resolution for distant objects
            if (material.map) {
              material.map.minFilter = THREE.LinearMipMapLinearFilter;
              material.map.generateMipmaps = true;
            }
          }
        });
      }
    });
  }
  
  // Batch geometry for static objects
  batchStaticGeometry(objects: THREE.Mesh[]): THREE.Mesh {
    const geometries: THREE.BufferGeometry[] = [];
    
    objects.forEach(object => {
      if (object.geometry) {
        const geometry = object.geometry.clone();
        geometry.applyMatrix4(object.matrixWorld);
        geometries.push(geometry);
      }
    });
    
    const mergedGeometry = BufferGeometryUtils.mergeBufferGeometries(geometries);
    const batchedMesh = new THREE.Mesh(
      mergedGeometry,
      objects[0].material // Assume same material
    );
    
    // Remove original objects
    objects.forEach(object => {
      if (object.parent) {
        object.parent.remove(object);
      }
    });
    
    return batchedMesh;
  }
  
  // Dynamic quality adjustment based on FPS
  adjustQualityForFPS(currentFPS: number): void {
    if (currentFPS < 30) {
      // Reduce quality
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
    } else if (currentFPS < 45) {
      // Medium quality
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.renderer.shadowMap.enabled = false;
    } else {
      // Full quality
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.shadowMap.enabled = true;
    }
  }
  
  // Update shadow maps only when necessary
  updateShadows(): void {
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.needsUpdate = true;
      
      // Schedule next update
      setTimeout(() => {
        this.renderer.shadowMap.needsUpdate = false;
      }, 100);
    }
  }
  
  // Get render statistics
  getRenderInfo(): THREE.WebGLInfo {
    return this.renderer.info;
  }
}

// Geometry simplification utilities
export class GeometrySimplifier {
  static simplifyGeometry(geometry: THREE.BufferGeometry, targetRatio: number): THREE.BufferGeometry {
    // This is a placeholder - in production, you'd use a proper simplification algorithm
    // like the Quadric Error Metrics algorithm
    
    const simplified = geometry.clone();
    
    // Simple decimation by removing every nth vertex
    const factor = Math.floor(1 / targetRatio);
    const positions = simplified.attributes.position;
    const newPositions: number[] = [];
    
    for (let i = 0; i < positions.count; i += factor) {
      newPositions.push(
        positions.getX(i),
        positions.getY(i),
        positions.getZ(i)
      );
    }
    
    simplified.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(newPositions, 3)
    );
    
    return simplified;
  }
  
  static createBillboardSprite(object: THREE.Mesh, camera: THREE.Camera): THREE.Sprite {
    // Render object to texture
    const renderTarget = new THREE.WebGLRenderTarget(256, 256);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: renderTarget.texture,
      sizeAttenuation: true
    });
    
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(10, 10, 1);
    
    return sprite;
  }
}