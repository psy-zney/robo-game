import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * GLTF asset interface containing scene and animations
 * Giao diện tài sản GLTF chứa cảnh và hoạt ảnh
 */
export interface GLTFAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

/**
 * AssetManager - Manages loading and caching of 3D models
 * AssetManager - Quản lý tải và lưu trữ cache các mô hình 3D
 */
export class AssetManager {
  private loader: GLTFLoader;
  private models: Map<string, GLTFAsset> = new Map();

  /**
   * Initialize the asset manager with GLTF loader
   * Khởi tạo trình quản lý tài sản với trình tải GLTF
   */
  constructor() {
    this.loader = new GLTFLoader();
  }

  /**
   * Load a 3D model from specified path and cache it
   * Tải mô hình 3D từ đường dẫn được chỉ định và lưu vào cache
   * @param name - Unique identifier for the model
   * @param path - File path to the GLTF model
   * @returns Promise that resolves when model is loaded
   */
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

  /**
   * Get a loaded model by name
   * Lấy mô hình đã tải theo tên
   * @param name - Model identifier
   * @returns Model scene or undefined if not found
   */
  public getModel(name: string): THREE.Group | undefined {
    const asset = this.models.get(name);
    if (!asset) {
      console.warn(`Model ${name} not found!`);
      return undefined;
    }
    // SkinnedMesh clone bug fix: Do not clone animated entities like Husky, Robot, and Rat
    // Sửa lỗi clone SkinnedMesh: Không clone các thực thể có hoạt ảnh như Husky, Robot và Rat
    if (name === 'husky' || name === 'robot' || name === 'Rat') {
      return asset.scene;
    }
    // Clone recursively for static obstacles
    // Clone đệ quy cho các chướng ngại vật tĩnh
    return asset.scene.clone(true);
  }

  /**
   * Get animations for a loaded model
   * Lấy hoạt ảnh cho mô hình đã tải
   * @param name - Model identifier
   * @returns Array of animation clips
   */
  public getAnimations(name: string): THREE.AnimationClip[] {
    const asset = this.models.get(name);
    return asset ? asset.animations : [];
  }
}

/**
 * Global asset manager instance
 * Thể hiện trình quản lý tài sản toàn cục
 */
export const assetManager = new AssetManager();
