/**
 * MC 模型加载器测试组件
 * 用于验证原版 MC JSON 模型解析是否正常工作
 */

import React, { useEffect, useState } from 'react';
import { MCModelBlock, MCModelInstancedBlocks } from './MCModelBlock';
import { getOrCreateMaterial } from './VoxelWorld';

export function MCModelTest() {
    const [testBlocks, setTestBlocks] = useState([]);
    const [positionMap, setPositionMap] = useState(new Map());

    useEffect(() => {
        // 创建测试方块
        const blocks = [
            // 单个火把
            { id: 'test-torch-1', type: 'torch', position: [0, 0, 0] },

            // 单个灯笼
            { id: 'test-lantern-1', type: 'lantern', position: [2, 0, 0] },

            // 栅栏（3个连续）
            { id: 'test-fence-1', type: 'oak_fence', position: [0, 0, 2] },
            { id: 'test-fence-2', type: 'oak_fence', position: [1, 0, 2] },
            { id: 'test-fence-3', type: 'oak_fence', position: [2, 0, 2] },

            // 墙体（3个连续）
            { id: 'test-wall-1', type: 'cobblestone_wall', position: [0, 0, 4] },
            { id: 'test-wall-2', type: 'cobblestone_wall', position: [1, 0, 4] },
            { id: 'test-wall-3', type: 'cobblestone_wall', position: [2, 0, 4] },
        ];

        setTestBlocks(blocks);

        // 构建位置查找表
        const posMap = new Map();
        blocks.forEach(block => {
            const key = `${block.position[0]},${block.position[1]},${block.position[2]}`;
            posMap.set(key, block);
        });
        setPositionMap(posMap);
    }, []);

    const handleClick = (blockId, event) => {
        console.log('[MCModelTest] Clicked:', blockId);
    };

    // 按类型分组方块
    const blockGroups = testBlocks.reduce((groups, block) => {
        const type = block.type;
        if (!groups[type]) groups[type] = [];
        groups[type].push(block);
        return groups;
    }, {});

    return (
        <group>
            {Object.entries(blockGroups).map(([blockType, blocks]) => {
                const material = getOrCreateMaterial(blockType, '1.20.1');

                return (
                    <MCModelInstancedBlocks
                        key={blockType}
                        blocks={blocks}
                        blockType={blockType}
                        positionMap={positionMap}
                        material={material}
                        onClick={handleClick}
                        version="1.20.1"
                    />
                );
            })}
        </group>
    );
}

export default MCModelTest;
