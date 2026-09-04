/**
 * 方块分组器
 * 按渲染签名分组方块，优化实例化渲染
 */

import { loadBlockstateJson, parseBlockstate, inferBlockConnections } from '../utils/mcBlockstateLoader.js';
import { getBlockRenderType } from '../utils/blockClassifier.js';

/**
 * 计算方块的渲染签名
 * 签名格式: "modelPath:textureKeys:materialProps"
 *
 * @param {Object} block - 方块对象
 * @param {Map} positionMap - 位置映射（用于推断连接）
 * @param {string} version - MC 版本
 * @returns {Promise<string>} 渲染签名
 */
async function computeRenderSignature(block, positionMap, version = '1.20.1') {
    const blockType = (block.type || '').toLowerCase().replace(/\[.*\]/, '');

    try {
        // 1. 加载 blockstate
        const blockstateJson = await loadBlockstateJson(blockType, version);
        if (!blockstateJson) {
            return `fallback:${blockType}:opaque`;
        }

        // 2. 推断方块属性（连接状态等）
        const blockProperties = block.properties || inferBlockConnections(block, positionMap);

        // 3. 解析适用的模型
        const models = parseBlockstate(blockstateJson, blockProperties);
        if (models.length === 0) {
            return `fallback:${blockType}:opaque`;
        }

        // 4. 构建签名
        const modelPath = models.map(m => m.model).join('+');
        const rotation = models.map(m => `${m.x},${m.y}`).join('+');
        const uvlock = models.some(m => m.uvlock) ? 'uvlock' : 'nolock';

        // 5. 材质属性
        const renderType = getBlockRenderType(blockType);
        const materialProps = [
            renderType.transparent ? 'transparent' : 'opaque',
            renderType.emissive ? 'emissive' : 'normal',
            renderType.doubleSided ? 'double' : 'single'
        ].join(':');

        return `${modelPath}@${rotation}@${uvlock}:${blockType}:${materialProps}`;
    } catch (err) {
        console.warn('[BlockGrouper] Failed to compute signature:', blockType, err);
        return `fallback:${blockType}:opaque`;
    }
}

/**
 * 按渲染签名分组方块
 *
 * @param {Array} blocks - 方块数组
 * @param {string} version - MC 版本
 * @returns {Promise<Array>} 分组结果
 */
export async function groupByRenderSignature(blocks, version = '1.20.1') {
    if (!blocks || blocks.length === 0) {
        return [];
    }

    // 构建位置映射（用于连接推断）
    const positionMap = new Map();
    blocks.forEach(block => {
        const key = block.position.join(',');
        positionMap.set(key, block);
    });

    // 计算每个方块的签名
    const signatures = await Promise.all(
        blocks.map(block => computeRenderSignature(block, positionMap, version))
    );

    // 按签名分组
    const groups = new Map();
    blocks.forEach((block, index) => {
        const signature = signatures[index];

        if (!groups.has(signature)) {
            groups.set(signature, {
                signature,
                blocks: [],
                geometry: null,
                material: null
            });
        }

        groups.get(signature).blocks.push(block);
    });

    return Array.from(groups.values());
}

/**
 * 简化分组（用于简单方块）
 * 只按方块类型分组，不考虑 blockstate
 *
 * @param {Array} blocks - 方块数组
 * @returns {Array} 分组结果
 */
export function groupByBlockType(blocks) {
    if (!blocks || blocks.length === 0) {
        return [];
    }

    const groups = new Map();

    blocks.forEach(block => {
        const blockType = (block.type || '').toLowerCase().replace(/\[.*\]/, '');

        if (!groups.has(blockType)) {
            groups.set(blockType, {
                signature: `simple:${blockType}`,
                blockType,
                blocks: [],
                geometry: null,
                material: null
            });
        }

        groups.get(blockType).blocks.push(block);
    });

    return Array.from(groups.values());
}

export default {
    groupByRenderSignature,
    groupByBlockType,
    computeRenderSignature
};
