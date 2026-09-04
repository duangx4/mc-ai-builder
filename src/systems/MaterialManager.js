/**
 * 材质管理器
 * 统一的材质创建和管理
 */

import * as THREE from 'three';
import { TextureLoader, NearestFilter } from 'three';
import { getTextureBasePath, FALLBACK_COLORS } from '../utils/textureMapping.js';
import { loadAtlas, createAtlasMaterial, isAtlasLoaded } from '../utils/atlasMaterial.js';

/**
 * 材质缓存
 */
const materialCache = new Map();

/**
 * 纹理加载器
 */
const textureLoader = new TextureLoader();

/**
 * 纹理缓存
 */
const textureCache = new Map();

/**
 * 材质管理器类
 */
class MaterialManager {
    constructor(version = '1.20.1') {
        this.version = version;
        this.atlas = null;
    }

    /**
     * 初始化（加载 atlas）
     */
    async initialize() {
        try {
            if (!isAtlasLoaded()) {
                this.atlas = await loadAtlas(this.version);
            }
        } catch (err) {
            console.warn('[MaterialManager] Failed to load atlas:', err);
        }
    }

    /**
     * 获取或创建材质
     *
     * @param {string} blockType - 方块类型
     * @param {Object} materialProps - 材质属性
     * @returns {Promise<THREE.Material>}
     */
    async getMaterial(blockType, materialProps = {}) {
        const cacheKey = `${this.version}:${blockType}:${JSON.stringify(materialProps)}`;

        if (materialCache.has(cacheKey)) {
            return materialCache.get(cacheKey);
        }

        let material;

        // 1. 尝试从 atlas 创建材质
        if (isAtlasLoaded()) {
            try {
                material = createAtlasMaterial(blockType, materialProps, this.version);
            } catch (err) {
                console.warn('[MaterialManager] Failed to create atlas material:', blockType, err);
            }
        }

        // 2. 尝试加载独立纹理
        if (!material) {
            const texture = await this.loadTexture(blockType);
            if (texture) {
                material = this.createMaterial(texture, materialProps);
            }
        }

        // 3. 回退到纯色材质
        if (!material) {
            material = this.createFallbackMaterial(blockType, materialProps);
        }

        // 缓存材质
        materialCache.set(cacheKey, material);

        return material;
    }

    /**
     * 加载纹理
     */
    async loadTexture(blockType) {
        const cacheKey = `${this.version}:${blockType}`;

        if (textureCache.has(cacheKey)) {
            return textureCache.get(cacheKey);
        }

        return new Promise((resolve) => {
            const basePath = getTextureBasePath(this.version);
            const url = `${basePath}${blockType}.png`;

            textureLoader.load(
                url,
                (texture) => {
                    texture.magFilter = NearestFilter;
                    texture.minFilter = NearestFilter;
                    texture.needsUpdate = true;
                    textureCache.set(cacheKey, texture);
                    resolve(texture);
                },
                undefined,
                () => {
                    textureCache.set(cacheKey, null);
                    resolve(null);
                }
            );
        });
    }

    /**
     * 创建材质
     */
    createMaterial(texture, props = {}) {
        return new THREE.MeshStandardMaterial({
            map: texture,
            transparent: props.transparent || false,
            opacity: props.opacity !== undefined ? props.opacity : 1.0,
            alphaTest: props.transparent ? 0.1 : 0,
            emissive: props.emissive ? new THREE.Color(props.emissiveColor || 0xffaa33) : new THREE.Color(0x000000),
            emissiveIntensity: props.emissiveIntensity || (props.emissive ? 0.5 : 0),
            side: props.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
            metalness: 0.1,
            roughness: 0.8
        });
    }

    /**
     * 创建回退材质（纯色）
     */
    createFallbackMaterial(blockType, props = {}) {
        const cleanType = blockType.toLowerCase().replace(/\[.*\]/, '');
        const fallbackColor = FALLBACK_COLORS[cleanType] || '#888888';

        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(fallbackColor),
            transparent: props.transparent || false,
            opacity: props.opacity !== undefined ? props.opacity : 1.0,
            emissive: props.emissive ? new THREE.Color(props.emissiveColor || 0xffaa33) : new THREE.Color(0x000000),
            emissiveIntensity: props.emissiveIntensity || (props.emissive ? 0.5 : 0),
            side: props.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
            metalness: 0.1,
            roughness: 0.8
        });
    }

    /**
     * 清除缓存
     */
    static clearCache() {
        materialCache.forEach(material => material.dispose());
        materialCache.clear();

        textureCache.forEach(texture => {
            if (texture) texture.dispose();
        });
        textureCache.clear();
    }
}

export default MaterialManager;
