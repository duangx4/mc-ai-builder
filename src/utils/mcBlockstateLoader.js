/**
 * MC Blockstate 加载器
 * 解析 blockstates/*.json 文件，处理 multipart 条件组合
 *
 * 基于 Minecraft 1.20.1 blockstate 格式
 */

import { loadModelCached } from './mcModelLoader';

/**
 * 评估 multipart 条件
 *
 * @param {Object|string} when - 条件对象或 OR 条件
 * @param {Object} blockProperties - 方块属性 {north: 'true', south: 'false', ...}
 * @returns {boolean}
 */
function evaluateCondition(when, blockProperties) {
    if (!when) return true; // 无条件 = 始终满足

    // OR 条件: { "OR": [ {条件1}, {条件2} ] }
    if (when.OR) {
        return when.OR.some(cond => evaluateCondition(cond, blockProperties));
    }

    // AND 条件: { "prop1": "value1", "prop2": "value2" }
    return Object.entries(when).every(([prop, value]) => {
        const blockValue = blockProperties[prop];

        // 支持多值匹配: "north=true|false"
        if (typeof value === 'string' && value.includes('|')) {
            const validValues = value.split('|');
            return validValues.includes(String(blockValue));
        }

        return String(blockValue) === String(value);
    });
}

/**
 * 从模型数组中选择一个（支持权重随机）
 *
 * @param {Array} models - 模型数组，每个可能包含 weight 属性
 * @returns {Object} 选中的模型
 */
function selectModelWithWeight(models) {
    if (!Array.isArray(models) || models.length === 0) {
        return null;
    }

    if (models.length === 1) {
        return models[0];
    }

    // 检查是否有权重
    const hasWeight = models.some(m => m.weight !== undefined);

    if (!hasWeight) {
        // 无权重，随机选择
        return models[Math.floor(Math.random() * models.length)];
    }

    // 有权重，按权重随机选择
    const totalWeight = models.reduce((sum, m) => sum + (m.weight || 1), 0);
    let random = Math.random() * totalWeight;

    for (const model of models) {
        const weight = model.weight || 1;
        random -= weight;
        if (random <= 0) {
            return model;
        }
    }

    // 兜底返回最后一个
    return models[models.length - 1];
}

/**
 * 解析 blockstate JSON 并返回适用的模型列表
 *
 * @param {Object} blockstateJson - blockstate JSON 对象
 * @param {Object} blockProperties - 方块属性
 * @returns {Array<{model: string, x: number, y: number, uvlock: boolean, weight: number}>}
 */
export function parseBlockstate(blockstateJson, blockProperties = {}) {
    const { multipart, variants } = blockstateJson;

    const applicableModels = [];

    if (multipart) {
        // Multipart 系统（栅栏、墙体、红石等）
        multipart.forEach(part => {
            const { when, apply } = part;

            // 检查条件是否满足
            if (evaluateCondition(when, blockProperties)) {
                // apply 可以是单个对象或数组（随机选择）
                const models = Array.isArray(apply) ? apply : [apply];

                // 支持权重随机选择
                const model = selectModelWithWeight(models);

                if (model) {
                    applicableModels.push({
                        model: model.model,
                        x: model.x || 0,
                        y: model.y || 0,
                        uvlock: model.uvlock || false,
                        weight: model.weight || 1
                    });
                }
            }
        });
    } else if (variants) {
        // Variants 系统（简单方块状态）
        // 构建状态字符串，如 "facing=north,half=top"
        const stateKey = Object.entries(blockProperties)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join(',');

        const variantKey = stateKey || ''; // 空字符串表示默认状态
        const variantDef = variants[variantKey] || variants[''];

        if (variantDef) {
            const models = Array.isArray(variantDef) ? variantDef : [variantDef];

            // 支持权重随机选择
            const model = selectModelWithWeight(models);

            if (model) {
                applicableModels.push({
                    model: model.model,
                    x: model.x || 0,
                    y: model.y || 0,
                    uvlock: model.uvlock || false,
                    weight: model.weight || 1
                });
            }
        }
    }

    return applicableModels;
}

/**
 * 根据方块类型和属性，推断连接状态
 *
 * @param {Object} block - 方块对象 {type, position, properties}
 * @param {Map} positionMap - 位置查找表 (key: "x,y,z", value: block)
 * @returns {Object} 连接属性 {north, south, east, west, up, down}
 */
export function inferBlockConnections(block, positionMap) {
    const [x, y, z] = block.position;
    const blockType = (block.type || '').toLowerCase().replace(/\[.*\]/, '');

    const connections = {};

    // 检查六个方向的相邻方块
    const directions = [
        { key: 'north', offset: [0, 0, -1] },
        { key: 'south', offset: [0, 0, 1] },
        { key: 'west', offset: [-1, 0, 0] },
        { key: 'east', offset: [1, 0, 0] },
        { key: 'up', offset: [0, 1, 0] },
        { key: 'down', offset: [0, -1, 0] }
    ];

    // 特殊处理：墙体需要 "low"/"tall"/"none" 而不是 "true"/"false"
    const isWall = blockType.includes('_wall') && !blockType.startsWith('wall_');

    directions.forEach(({ key, offset }) => {
        const neighborKey = `${x + offset[0]},${y + offset[1]},${z + offset[2]}`;
        const neighbor = positionMap.get(neighborKey);

        if (neighbor && canConnect(blockType, (neighbor.type || '').toLowerCase().replace(/\[.*\]/, ''), key)) {
            if (isWall) {
                // 墙体使用 "low" 或 "tall"（简化：都用 "low"）
                connections[key] = 'low';
            } else {
                connections[key] = 'true';
            }
        } else {
            if (isWall) {
                connections[key] = 'none';
            } else {
                connections[key] = 'false';
            }
        }
    });

    // 墙体的 up 属性：有任何连接时为 true，否则 false
    if (isWall) {
        const hasConnection = ['north', 'south', 'east', 'west'].some(dir => connections[dir] !== 'none');
        connections.up = hasConnection ? 'true' : 'false';
    }

    // 灯笼和火把的特殊属性
    if (blockType === 'lantern' || blockType === 'soul_lantern') {
        connections.hanging = 'false'; // 默认放在地面
    }

    if (blockType.includes('torch') && !blockType.includes('torchflower')) {
        // 火把默认直立
        // wall_torch 会有不同的 blockstate
    }

    return connections;
}

/**
 * 判断两个方块是否可以连接
 */
function canConnect(blockType, neighborType, direction) {
    // 栅栏连接规则
    if (blockType.includes('_fence') && !blockType.includes('fence_gate')) {
        // 栅栏只与同类型栅栏或实心方块连接（上下不连接）
        if (direction === 'up' || direction === 'down') return false;

        if (neighborType.includes('_fence') && !neighborType.includes('fence_gate')) {
            return true;
        }

        // 简化：认为大部分方块是实心的
        // 完整实现需要检查方块的碰撞箱
        return !neighborType.includes('air') &&
               !neighborType.includes('glass') &&
               !neighborType.includes('pane');
    }

    // 墙体连接规则
    if (blockType.includes('_wall')) {
        // 墙体与同类型墙体、实心方块连接（上下不连接）
        if (direction === 'up' || direction === 'down') return false;

        if (neighborType.includes('_wall')) {
            return true;
        }

        return !neighborType.includes('air') &&
               !neighborType.includes('glass') &&
               !neighborType.includes('pane');
    }

    // 红石、管道等其他可连接方块
    // TODO: 添加更多连接规则

    return false;
}

/**
 * 应用 UV lock（旋转时保持 UV 坐标不变）
 *
 * @param {THREE.BufferGeometry} geometry - 几何体
 * @param {number} rotationY - Y 轴旋转角度（度）
 */
function applyUVLock(geometry, rotationY) {
    if (rotationY === 0 || !geometry.attributes.uv) {
        return;
    }

    const uvAttribute = geometry.attributes.uv;
    const uvArray = uvAttribute.array;

    // UV lock 的作用：当方块旋转时，纹理保持不旋转
    // 实现方式：对 UV 坐标应用反向旋转
    const angleRad = -(rotationY * Math.PI) / 180;
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    // 对每个 UV 坐标应用旋转矩阵（围绕 UV 中心 (0.5, 0.5) 旋转）
    for (let i = 0; i < uvArray.length; i += 2) {
        const u = uvArray[i] - 0.5;
        const v = uvArray[i + 1] - 0.5;

        uvArray[i] = u * cos - v * sin + 0.5;
        uvArray[i + 1] = u * sin + v * cos + 0.5;
    }

    uvAttribute.needsUpdate = true;
}

/**
 * 加载 blockstate 并返回适用的几何体列表
 *
 * @param {string} blockType - 方块类型，如 'oak_fence'
 * @param {Object} blockProperties - 方块属性
 * @param {string} version - MC 版本
 * @returns {Promise<Array<{geometry, x, y, uvlock}>>}
 */
export async function loadBlockstateGeometries(blockType, blockProperties = {}, version = '1.20.1') {
    try {
        // 加载 blockstate JSON
        const blockstatePath = `/minecraft-${version}/blockstates/${blockType}.json`;
        const response = await fetch(blockstatePath);

        if (!response.ok) {
            throw new Error(`Failed to load blockstate: ${blockstatePath}`);
        }

        const blockstateJson = await response.json();

        // 解析 blockstate，获取适用的模型列表
        const models = parseBlockstate(blockstateJson, blockProperties);

        // 加载所有模型的几何体
        const geometries = await Promise.all(
            models.map(async ({ model, x, y, uvlock }) => {
                // 移除 "block/" 前缀（如果有）
                const modelPath = model.replace(/^(minecraft:)?block\//, 'block/');

                const geometry = await loadModelCached(modelPath, version);

                // 应用旋转
                if (x !== 0) geometry.rotateX((x * Math.PI) / 180);
                if (y !== 0) {
                    geometry.rotateY((y * Math.PI) / 180);

                    // 如果启用 uvlock，应用 UV 锁定
                    if (uvlock) {
                        applyUVLock(geometry, y);
                    }
                }

                return { geometry, x, y, uvlock };
            })
        );

        return geometries;
    } catch (err) {
        console.error('[MCBlockstateLoader] Load failed:', blockType, err);
        return [];
    }
}

/**
 * Blockstate 缓存
 */
const blockstateCache = new Map();

/**
 * 加载并缓存 blockstate JSON
 */
export async function loadBlockstateJson(blockType, version = '1.20.1') {
    const cacheKey = `${version}:${blockType}`;

    if (blockstateCache.has(cacheKey)) {
        return blockstateCache.get(cacheKey);
    }

    try {
        const blockstatePath = `/minecraft-${version}/blockstates/${blockType}.json`;
        const response = await fetch(blockstatePath);

        if (!response.ok) {
            throw new Error(`Failed to load blockstate: ${blockstatePath}`);
        }

        const json = await response.json();
        blockstateCache.set(cacheKey, json);
        return json;
    } catch (err) {
        console.error('[MCBlockstateLoader] Load JSON failed:', blockType, err);
        return null;
    }
}

export default {
    parseBlockstate,
    inferBlockConnections,
    loadBlockstateGeometries,
    loadBlockstateJson
};
