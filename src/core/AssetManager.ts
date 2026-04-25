import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export interface GLTFAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export class AssetManager {
  private loader: GLTFLoader;
  private models: Map<string, GLTFAsset> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  public async loadModel(name: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          this.models.set(name, { scene: gltf.scene, animations: gltf.animations || [] });
          resolve();
        },
        undefined,
        (error) => {
          console.error(`Failed to load model ${name} at ${path}:`, error);
          reject(error);
        }
      );
    });
  }

  public getModel(name: string): THREE.Group | undefined {
    const asset = this.models.get(name);
    if (!asset) {
      console.warn(`Model ${name} not found!`);
      return undefined;
    }
    // SkinnedMesh clone bug fix: Do not clone animated entities like Husky and Robot
    if (name === 'husky' || name === 'robot') {
      return asset.scene;
    }
    // Clone recursively for static obstacles
    return asset.scene.clone(true);
  }

  public getAnimations(name: string): THREE.AnimationClip[] {
    const asset = this.models.get(name);
    return asset ? asset.animations : [];
  }
}

export const assetManager = new AssetManager();
