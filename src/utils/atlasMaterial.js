/**
 * MC 原版 Atlas 材质系统
 *
 * 功能：
 * - 加载 atlas 纹理和 UV 映射表（全局单例）
 * - 创建共享的 atlas 材质
 * - 解析贴图引用（#torch → block/torch）
 * - 获取贴图在 atlas 上的 UV 坐标
 */

import * as THREE from 'three';

let atlasTexture = null;
let atlasUVMap = null;

/**
 * 加载 atlas 纹理和 UV 映射表（全局单例）
 * @param {string} version - MC版本，默认 '1.20.1'
 * @returns {Promise<{atlasTexture: THREE.Texture, atlasUVMap: object}>}
 */
export async function loadAtlas(version = '1.20.1') {
    if (atlasTexture && atlasUVMap) {
        return { atlasTexture, atlasUVMap };
    }

    try {
        const [texture, uvMap] = await Promise.all([
            new THREE.TextureLoader().loadAsync(`/minecraft-${version}/atlas.png`),
            fetch(`/minecraft-${version}/atlas-uv-map.json`).then(r => r.json())
        ]);

        // 设置纹理参数（像素风格）
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;

        atlasTexture = texture;
        atlasUVMap = uvMap;

        console.log(`✅ Atlas 加载成功: ${Object.keys(uvMap.textures).length} 张贴图`);

        return { atlasTexture, atlasUVMap };
    } catch (err) {
        console.error('❌ Atlas 加载失败:', err);
        throw err;
    }
}

/**
 * 创建 atlas 材质（共享同一张 atlas 纹理）
 * @returns {THREE.MeshLambertMaterial}
 */
export function createAtlasMaterial() {
    if (!atlasTexture) {
        throw new Error('Atlas not loaded. Call loadAtlas() first.');
    }

    return new THREE.MeshLambertMaterial({
        map: atlasTexture,
        transparent: true,
        alphaTest: 0.5,  // 提高到 0.5，过滤半透明像素
        side: THREE.FrontSide
    });
}

/**
 * 解析贴图引用（如 "#torch" → "block/torch"）
 * @param {string} ref - 贴图引用（可能以 # 开头）
 * @param {object} texturesBlock - 方块的 textures 定义
 * @param {string} blockType - 方块类型（用于自动推断）
 * @returns {string|null} 解析后的贴图路径
 */
export function resolveTextureRef(ref, texturesBlock, blockType = null) {
    if (!ref) return null;

    // 如果是变量引用（#variable），从 textures 块解析
    if (ref.startsWith('#')) {
        const key = ref.slice(1);
        const resolved = texturesBlock[key];

        // 递归解析（有些引用可能嵌套，如 #all → #side → block/stone）
        if (resolved && resolved.startsWith('#')) {
            return resolveTextureRef(resolved, texturesBlock, blockType);
        }

        // 如果解析成功，返回
        if (resolved) {
            return resolved;
        }

        // 如果没有定义，尝试根据变量名和方块类型推断
        // 例如：#lantern + blockType=lantern → block/lantern
        if (blockType) {
            const cleanType = blockType.replace(/^(template_|hanging_)/, '');
            // 如果变量名与方块类型相关，使用方块类型作为贴图路径
            if (key === cleanType || key === 'texture' || key === 'particle') {
                return `block/${cleanType}`;
            }
        }

        return null;
    }

    // 直接路径
    return ref;
}

/**
 * 获取贴图在 atlas 上的 UV 坐标
 * @param {string} texturePath - 贴图路径（如 "block/torch"）
 * @returns {number[]} [u0, v0, u1, v1] 归一化UV坐标
 */
export function getTextureUV(texturePath) {
    if (!atlasUVMap) {
        throw new Error('Atlas UV map not loaded.');
    }

    // 去掉 minecraft: 前缀（如果有）
    const cleanPath = texturePath.replace(/^minecraft:/, '');
    const entry = atlasUVMap.textures[cleanPath];

    if (!entry) {
        console.warn(`⚠️  贴图未在 atlas 中找到: ${texturePath}, 使用默认UV`);
        // Fallback 到第一个格子
        return [0, 0, 16 / atlasUVMap.atlasSize[0], 16 / atlasUVMap.atlasSize[1]];
    }

    return entry.uv; // [u0, v0, u1, v1]
}

/**
 * 将 face 的像素 UV 映射到 atlas 上的归一化 UV
 * @param {number[]} faceUV - face 在单张贴图上的像素坐标 [x0, y0, x1, y1]
 * @param {number[]} atlasUV - 该贴图在 atlas 上的归一化坐标 [u0, v0, u1, v1]
 * @param {number} tileSize - 单张贴图尺寸（默认16）
 * @returns {number[]} 最终的归一化 UV 坐标 [u0, v0, u1, v1]
 */
export function mapFaceUVToAtlas(faceUV, atlasUV, tileSize = 16) {
    const [x0, y0, x1, y1] = faceUV;
    const [au0, av0, au1, av1] = atlasUV;

    // 将像素坐标归一化到 0-1 范围
    const nx0 = x0 / tileSize;
    const ny0 = y0 / tileSize;
    const nx1 = x1 / tileSize;
    const ny1 = y1 / tileSize;

    // 映射到 atlas 上的实际位置
    const finalU0 = au0 + nx0 * (au1 - au0);
    const finalV0 = av0 + ny0 * (av1 - av0);
    const finalU1 = au0 + nx1 * (au1 - au0);
    const finalV1 = av0 + ny1 * (av1 - av0);

    return [finalU0, finalV0, finalU1, finalV1];
}

/**
 * 检查 atlas 是否已加载
 * @returns {boolean}
 */
export function isAtlasLoaded() {
    return atlasTexture !== null && atlasUVMap !== null;
}
