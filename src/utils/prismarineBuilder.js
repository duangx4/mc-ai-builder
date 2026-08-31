/**
 * Prismarine Builder API 适配器
 *
 * 提供与原有 builder.set() / builder.fill() 兼容的 API
 */

import { Vec3 } from 'vec3';
import mcData from 'minecraft-data';

class PrismarineBuilder {
    constructor(viewer, version = '1.20.1') {
        this.viewer = viewer;
        this.version = version;
        this.mcData = mcData(version);
    }

    /**
     * 放置单个方块
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {string} blockType 方块类型，如 'stone', 'oak_fence'
     * @param {object} properties 方块属性（可选）
     */
    set(x, y, z, blockType, properties = {}) {
        try {
            const pos = new Vec3(x, y, z);
            const blockData = this.mcData.blocksByName[blockType];

            if (!blockData) {
                console.warn('[PrismarineBuilder] Unknown block type:', blockType);
                return;
            }

            // TODO: 根据 properties 选择正确的 state
            const stateId = blockData.defaultState || blockData.minStateId;

            this.viewer.world.setBlockStateId(pos, stateId);

        } catch (error) {
            console.error('[PrismarineBuilder] Error in set():', error);
        }
    }

    /**
     * 填充区域
     * @param {number} x1
     * @param {number} y1
     * @param {number} z1
     * @param {number} x2
     * @param {number} y2
     * @param {number} z2
     * @param {string} blockType
     */
    fill(x1, y1, z1, x2, y2, z2, blockType) {
        // 确保坐标顺序正确
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        const minZ = Math.min(z1, z2);
        const maxZ = Math.max(z1, z2);

        // 逐个放置方块
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    this.set(x, y, z, blockType);
                }
            }
        }
    }

    /**
     * 移除方块（设置为空气）
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    remove(x, y, z) {
        this.set(x, y, z, 'air');
    }
}

export default PrismarineBuilder;
