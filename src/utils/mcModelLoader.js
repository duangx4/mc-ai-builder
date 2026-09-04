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
 * @param {Object} textures - 纹理映射表
 * @returns {THREE.BufferGeometry}
 */
function createElementGeometry(element, textures = {}) {
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

    // 应用 UV 映射
    applyUVMapping(geometry, element, textures);

    return geometry;
}

/**
 * 应用 UV 坐标映射到几何体
 *
 * BoxGeometry 的面顺序：右(+X)、左(-X)、上(+Y)、下(-Y)、前(+Z)、后(-Z)
 * MC 的面定义：north(-Z)、south(+Z)、east(+X)、west(-X)、up(+Y)、down(-Y)
 */
function applyUVMapping(geometry, element, textures) {
    const { faces = {}, from = [0, 0, 0], to = [16, 16, 16] } = element;

    // BoxGeometry 默认 UV 是 0-1，我们需要根据 MC 的 UV 坐标调整
    const uvAttribute = geometry.attributes.uv;
    if (!uvAttribute) return;

    // MC 面到 BoxGeometry 面的映射
    // BoxGeometry 每个面占 4 个 UV 坐标（2 个三角形）
    const faceMapping = {
        'east': 0,   // +X (右)
        'west': 1,   // -X (左)
        'up': 2,     // +Y (上)
        'down': 3,   // -Y (下)
        'south': 4,  // +Z (前)
        'north': 5   // -Z (后)
    };

    Object.entries(faces).forEach(([faceName, faceData]) => {
        const faceIndex = faceMapping[faceName];
        if (faceIndex === undefined) return;

        // 每个面有 4 个 UV 坐标（2 个三角形共享顶点）
        const uvOffset = faceIndex * 4;

        // MC UV 坐标 (0-16像素) → 标准化 UV (0-1)
        let uv = faceData.uv || getDefaultUV(faceName, from, to);

        // 标准化 UV 坐标（MC 使用 0-16 像素坐标）
        const u1 = uv[0] / 16;
        const v1 = uv[1] / 16;
        const u2 = uv[2] / 16;
        const v2 = uv[3] / 16;

        // 设置 4 个角的 UV（逆时针，从左下开始）
        uvAttribute.setXY(uvOffset + 0, u1, v2); // 左下
        uvAttribute.setXY(uvOffset + 1, u2, v2); // 右下
        uvAttribute.setXY(uvOffset + 2, u1, v1); // 左上
        uvAttribute.setXY(uvOffset + 3, u2, v1); // 右上
    });

    uvAttribute.needsUpdate = true;
}

/**
 * 获取默认 UV 坐标（如果 MC 模型没有指定）
 */
function getDefaultUV(faceName, from, to) {
    // 根据面的方向，使用 from/to 坐标作为默认 UV
    switch (faceName) {
        case 'north':
        case 'south':
            return [from[0], from[1], to[0], to[1]]; // X, Y
        case 'east':
        case 'west':
            return [from[2], from[1], to[2], to[1]]; // Z, Y
        case 'up':
        case 'down':
            return [from[0], from[2], to[0], to[2]]; // X, Z
        default:
            return [0, 0, 16, 16];
    }
}

/**
 * 解析纹理变量引用
 * 例如：#texture, #particle, #0, #1 等
 *
 * @param {Object} textures - 纹理映射表
 * @returns {Object} 解析后的纹理映射
 */
function resolveTextureVariables(textures) {
    const resolved = {};
    const maxIterations = 10; // 防止循环引用

    // 首先复制所有纹理
    Object.assign(resolved, textures);

    // 递归解析纹理变量引用
    for (let i = 0; i < maxIterations; i++) {
        let changed = false;

        Object.keys(resolved).forEach(key => {
            const value = resolved[key];

            // 如果值是变量引用（以 # 开头）
            if (typeof value === 'string' && value.startsWith('#')) {
                const refKey = value.substring(1); // 移除 #
                if (resolved[refKey] && resolved[refKey] !== value) {
                    resolved[key] = resolved[refKey];
                    changed = true;
                }
            }
        });

        if (!changed) break; // 没有变化，说明已完全解析
    }

    return resolved;
}

/**
 * 合并父模型和子模型
 * 子模型的属性会覆盖父模型的同名属性
 *
 * @param {Object} parent - 父模型 JSON
 * @param {Object} child - 子模型 JSON
 * @returns {Object} 合并后的模型
 */
function mergeModels(parent, child) {
    const merged = {
        ...parent,
        ...child
    };

    // 纹理需要合并，不是简单覆盖
    if (parent.textures || child.textures) {
        merged.textures = {
            ...(parent.textures || {}),
            ...(child.textures || {})
        };
    }

    // elements 优先使用子模型，如果子模型没有则使用父模型
    if (!child.elements && parent.elements) {
        merged.elements = parent.elements;
    }

    // display 需要合并每个视角的配置
    if (parent.display || child.display) {
        merged.display = {
            ...(parent.display || {}),
            ...(child.display || {})
        };
    }

    return merged;
}

/**
 * 解析 MC JSON 模型（支持父模型继承）
 *
 * @param {Object} modelJson - MC 模型 JSON 对象
 * @param {Object} textures - 纹理映射 {particle, texture, ...}
 * @param {string} version - MC 版本
 * @param {Set} loadedParents - 已加载的父模型路径（防止循环引用）
 * @returns {Promise<THREE.BufferGeometry>} 合并后的几何体
 */
export async function parseModelJson(modelJson, textures = {}, version = '1.20.1', loadedParents = new Set()) {
    let finalModel = modelJson;
    let finalTextures = { ...textures, ...(modelJson.textures || {}) };

    // 处理父模型继承
    if (modelJson.parent) {
        const parentPath = modelJson.parent.replace(/^minecraft:/, '');

        // 防止循环引用
        if (!loadedParents.has(parentPath)) {
            loadedParents.add(parentPath);

            try {
                const parentModel = await loadModelJson(parentPath, version);

                // 递归解析父模型的父模型
                const parentGeometry = await parseModelJson(
                    parentModel,
                    finalTextures,
                    version,
                    loadedParents
                );

                // 合并父模型和当前模型
                finalModel = mergeModels(parentModel, modelJson);
                finalTextures = { ...finalTextures, ...(finalModel.textures || {}) };
            } catch (err) {
                console.warn('[MCModelLoader] Failed to load parent model:', modelJson.parent, err);
            }
        }
    }

    // 解析纹理变量引用
    const resolvedTextures = resolveTextureVariables(finalTextures);

    const { elements = [] } = finalModel;
    const geometries = [];

    elements.forEach(element => {
        try {
            const geo = createElementGeometry(element, resolvedTextures);
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
 * 从文件路径加载 MC 模型 JSON（不解析几何体）
 *
 * @param {string} modelPath - 模型路径，如 'block/fence_post'
 * @param {string} version - MC 版本，默认 '1.20.1'
 * @returns {Promise<Object>} 模型 JSON 对象
 */
async function loadModelJson(modelPath, version = '1.20.1') {
    // 构建完整路径
    const fullPath = `/minecraft-${version}/models/${modelPath}.json`;

    const response = await fetch(fullPath);
    if (!response.ok) {
        throw new Error(`Failed to load model: ${fullPath}`);
    }

    return await response.json();
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
        const modelJson = await loadModelJson(modelPath, version);

        // 解析纹理引用
        const textures = modelJson.textures || {};

        // 解析模型（支持父模型继承）
        const geometry = await parseModelJson(modelJson, textures, version);

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
