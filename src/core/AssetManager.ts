import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetManager {
  private loader: GLTFLoader;
  private models: Map<string, THREE.Group> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
  }

  public async loadModel(name: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          this.models.set(name, gltf.scene);
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
    const original = this.models.get(name);
    if (!original) {
      console.warn(`Model ${name} not found!`);
      return undefined;
    }
    // Clone recursively
    return original.clone(true);
  }
}

export const assetManager = new AssetManager();
