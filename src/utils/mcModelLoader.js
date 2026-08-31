/**
 * MC JSON 模型加载器
 * 解析原版 Minecraft JSON 模型并转换为 Three.js 几何体
 *
 * 基于 Minecraft 1.20.1 模型格式
 */

import * as THREE from 'three';

/**
 * MC 模型元素 → Three.js BufferGeometry
 *
 * @param {Object} element - MC JSON 模型的 element 对象
 * @param {Array} element.from - [x1, y1, z1] (0-16 像素坐标)
 * @param {Array} element.to - [x2, y2, z2] (0-16 像素坐标)
 * @param {Object} element.faces - 面定义 {north, south, east, west, up, down}
 * @param {Object} element.rotation - 可选旋转 {origin, axis, angle}
 * @returns {THREE.BufferGeometry}
 */
function createElementGeometry(element, textureResolver) {
    const { from, to, faces = {}, rotation, shade = true } = element;

    // MC 坐标系 (0-16) → Three.js 坐标系 (-0.5 到 0.5)
    const x1 = (from[0] / 16) - 0.5;
    const y1 = (from[1] / 16) - 0.5;
    const z1 = (from[2] / 16) - 0.5;
    const x2 = (to[0] / 16) - 0.5;
    const y2 = (to[1] / 16) - 0.5;
    const z2 = (to[2] / 16) - 0.5;

    const width = x2 - x1;
    const height = y2 - y1;
    const depth = z2 - z1;

    // 创建立方体几何体
    const geometry = new THREE.BoxGeometry(width, height, depth);

    // 计算中心点（相对于方块中心）
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const centerZ = (z1 + z2) / 2;

    // 移动几何体到正确位置
    geometry.translate(centerX, centerY, centerZ);

    // 应用旋转（如果有）
    if (rotation) {
        const { origin = [8, 8, 8], axis = 'y', angle = 0 } = rotation;

        // 旋转原点（MC 坐标 → Three.js 坐标）
        const pivotX = (origin[0] / 16) - 0.5;
        const pivotY = (origin[1] / 16) - 0.5;
        const pivotZ = (origin[2] / 16) - 0.5;

        // 移动到原点 → 旋转 → 移回
        geometry.translate(-pivotX, -pivotY, -pivotZ);

        const angleRad = (angle * Math.PI) / 180;
        if (axis === 'x') geometry.rotateX(angleRad);
        else if (axis === 'y') geometry.rotateY(angleRad);
        else if (axis === 'z') geometry.rotateZ(angleRad);

        geometry.translate(pivotX, pivotY, pivotZ);
    }

    // TODO: 应用 UV 坐标（下一步实现）
    // applyUVMapping(geometry, faces, textureResolver);

    return geometry;
}

/**
 * 解析 MC JSON 模型
 *
 * @param {Object} modelJson - MC 模型 JSON 对象
 * @param {Object} textures - 纹理映射 {particle, texture, ...}
 * @returns {THREE.BufferGeometry} 合并后的几何体
 */
export function parseModelJson(modelJson, textures = {}) {
    const { elements = [], parent } = modelJson;

    // TODO: 处理父模型继承（如果有 parent 字段）

    const geometries = [];

    elements.forEach(element => {
        try {
            const geo = createElementGeometry(element, textures);
            geometries.push(geo);
        } catch (err) {
            console.warn('[MCModelLoader] Failed to parse element:', element, err);
        }
    });

    if (geometries.length === 0) {
        // 返回空几何体
        return new THREE.BufferGeometry();
    }

    // 合并所有元素为单一几何体
    const mergedGeometry = mergeGeometries(geometries);

    // 清理临时几何体
    geometries.forEach(geo => geo.dispose());

    return mergedGeometry;
}

/**
 * 合并多个几何体为一个
 */
function mergeGeometries(geometries) {
    if (geometries.length === 0) return new THREE.BufferGeometry();
    if (geometries.length === 1) return geometries[0];

    // 使用 Three.js 的 BufferGeometryUtils
    // 注意：需要单独导入或手动实现
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
            // 调整索引偏移
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
 * 从文件路径加载 MC 模型
 *
 * @param {string} modelPath - 模型路径，如 'block/fence_post'
 * @param {string} version - MC 版本，默认 '1.20.1'
 * @returns {Promise<THREE.BufferGeometry>}
 */
export async function loadModel(modelPath, version = '1.20.1') {
    try {
        // 构建完整路径
        const fullPath = `/minecraft-${version}/models/${modelPath}.json`;

        const response = await fetch(fullPath);
        if (!response.ok) {
            throw new Error(`Failed to load model: ${fullPath}`);
        }

        const modelJson = await response.json();

        // 解析纹理引用
        const textures = modelJson.textures || {};

        // 解析模型
        const geometry = parseModelJson(modelJson, textures);

        return geometry;
    } catch (err) {
        console.error('[MCModelLoader] Load model failed:', modelPath, err);
        // 返回默认立方体
        return new THREE.BoxGeometry(1, 1, 1);
    }
}

/**
 * 模型缓存
 */
const modelCache = new Map();

/**
 * 加载模型（带缓存）
 */
export async function loadModelCached(modelPath, version = '1.20.1') {
    const cacheKey = `${version}:${modelPath}`;

    if (modelCache.has(cacheKey)) {
        // 返回缓存的几何体（克隆）
        return modelCache.get(cacheKey).clone();
    }

    const geometry = await loadModel(modelPath, version);
    modelCache.set(cacheKey, geometry);

    return geometry.clone();
}

/**
 * 清除模型缓存
 */
export function clearModelCache() {
    modelCache.forEach(geo => geo.dispose());
    modelCache.clear();
}

export default {
    parseModelJson,
    loadModel,
    loadModelCached,
    clearModelCache
};
