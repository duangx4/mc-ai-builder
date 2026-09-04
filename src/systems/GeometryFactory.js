/**
 * 几何体工厂
 * 统一的几何体生成和管理
 */

import * as THREE from 'three';
import { loadBlockstateGeometries } from '../utils/mcBlockstateLoader.js';
import { getBlockRenderType } from '../utils/blockClassifier.js';

// 导入特殊方块几何体生成器（兼容旧系统）
import { createFenceGeometry, createWallGeometry } from '../utils/fenceWallGeometry.js';
import { createDoorGeometry, createTrapdoorGeometry } from '../utils/doorGeometry.js';
import { createTorchGeometry, createLanternGeometry } from '../utils/torchLanternGeometry.js';
import { createCrossPlantGeometry } from '../utils/plantGeometry.js';
import { createButtonGeometry, createPressurePlateGeometry } from '../utils/buttonPlateGeometry.js';
import { createCarpetGeometry } from '../utils/carpetGeometry.js';
import { createFlatBlockGeometry } from '../utils/redstoneRailGeometry.js';
import { createChestGeometry, createBarrelGeometry } from '../utils/chestGeometry.js';

/**
 * 几何体缓存
 */
const geometryCache = new Map();

/**
 * 几何体工厂类
 */
class GeometryFactory {
    /**
     * 获取或创建几何体
     *
     * @param {string} blockType - 方块类型
     * @param {Object} properties - 方块属性
     * @param {string} version - MC 版本
     * @returns {Promise<THREE.BufferGeometry>}
     */
    static async getGeometry(blockType, properties = {}, version = '1.20.1') {
        const cacheKey = `${version}:${blockType}:${JSON.stringify(properties)}`;

        if (geometryCache.has(cacheKey)) {
            return geometryCache.get(cacheKey).clone();
        }

        let geometry;

        // 尝试使用 MC 原版模型系统
        try {
            const geometries = await loadBlockstateGeometries(blockType, properties, version);

            if (geometries.length > 0) {
                // 合并所有几何体（multipart 方块可能有多个）
                geometry = this.mergeGeometries(geometries.map(g => g.geometry));
            }
        } catch (err) {
            console.warn('[GeometryFactory] Failed to load from blockstate:', blockType, err);
        }

        // 回退到特殊方块生成器
        if (!geometry) {
            geometry = this.createSpecialGeometry(blockType, properties);
        }

        // 最终回退到简单立方体
        if (!geometry) {
            geometry = new THREE.BoxGeometry(1, 1, 1);
        }

        // 缓存几何体
        geometryCache.set(cacheKey, geometry);

        return geometry.clone();
    }

    /**
     * 特殊方块几何体生成（兼容旧系统）
     */
    static createSpecialGeometry(blockType, properties = {}) {
        const type = blockType.toLowerCase();

        // 栅栏
        if (type.includes('_fence') && !type.includes('_fence_gate')) {
            return createFenceGeometry(properties);
        }

        // 墙体
        if (type.includes('_wall') && !type.startsWith('wall_')) {
            return createWallGeometry(properties);
        }

        // 火把
        if (type.includes('torch') && !type.includes('torchflower')) {
            return createTorchGeometry(properties);
        }

        // 灯笼
        if (type === 'lantern' || type === 'soul_lantern') {
            return createLanternGeometry(properties);
        }

        // 门
        if (type.includes('_door') && !type.includes('trapdoor')) {
            return createDoorGeometry(properties);
        }

        // 活板门
        if (type.includes('trapdoor')) {
            return createTrapdoorGeometry(properties);
        }

        // 十字植物
        if (this.isCrossPlant(type)) {
            return createCrossPlantGeometry();
        }

        // 按钮
        if (type.includes('_button')) {
            return createButtonGeometry(properties);
        }

        // 压力板
        if (type.includes('pressure_plate')) {
            return createPressurePlateGeometry(properties);
        }

        // 地毯
        if (type.includes('_carpet')) {
            return createCarpetGeometry();
        }

        // 扁平方块（红石、铁轨等）
        if (this.isFlatBlock(type)) {
            return createFlatBlockGeometry();
        }

        // 箱子
        if (type.includes('chest') && !type.includes('ender')) {
            return createChestGeometry(properties);
        }

        // 木桶
        if (type === 'barrel') {
            return createBarrelGeometry(properties);
        }

        return null;
    }

    /**
     * 合并多个几何体为一个
     */
    static mergeGeometries(geometries) {
        if (geometries.length === 0) {
            return new THREE.BufferGeometry();
        }

        if (geometries.length === 1) {
            return geometries[0];
        }

        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];
        let indexOffset = 0;

        geometries.forEach(geo => {
            const pos = geo.attributes.position.array;
            const norm = geo.attributes.normal.array;
            const uv = geo.attributes.uv?.array;
            const idx = geo.index ? geo.index.array : null;

            positions.push(...pos);
            normals.push(...norm);
            if (uv) uvs.push(...uv);

            if (idx) {
                for (let i = 0; i < idx.length; i++) {
                    indices.push(idx[i] + indexOffset);
                }
                indexOffset += pos.length / 3;
            }
        });

        const merged = new THREE.BufferGeometry();
        merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

        if (uvs.length > 0) {
            merged.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        }

        if (indices.length > 0) {
            merged.setIndex(indices);
        }

        return merged;
    }

    /**
     * 判断是否为十字植物
     */
    static isCrossPlant(type) {
        const crossPlants = [
            'poppy', 'dandelion', 'blue_orchid', 'allium', 'azure_bluet',
            'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip',
            'oxeye_daisy', 'cornflower', 'lily_of_the_valley',
            'wither_rose', 'grass', 'fern', 'dead_bush',
            'wheat', 'carrots', 'potatoes', 'beetroots',
            'sugar_cane', 'bamboo', 'sweet_berry_bush'
        ];

        return crossPlants.some(plant => type.includes(plant));
    }

    /**
     * 判断是否为扁平方块
     */
    static isFlatBlock(type) {
        return type.includes('redstone') ||
               type.includes('rail') ||
               type === 'lily_pad' ||
               type === 'carpet';
    }

    /**
     * 清除几何体缓存
     */
    static clearCache() {
        geometryCache.forEach(geo => geo.dispose());
        geometryCache.clear();
    }
}

export default GeometryFactory;
