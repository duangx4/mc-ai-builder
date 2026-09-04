/**
 * MC 世界渲染器
 * 管理整个世界的渲染
 */

import React, { useCallback, useMemo } from 'react';
import MCBlockRenderer from './MCBlockRenderer.jsx';
import { GLOW_BLOCKS } from '../utils/textureMapping.js';

/**
 * 光照系统组件
 */
function MCLightingSystem({ blocks }) {
    // 收集发光方块（火把、灯笼等）
    const lightSources = useMemo(() => {
        if (!blocks || blocks.length === 0) return [];

        const sources = [];

        blocks.forEach(block => {
            const blockType = (block.type || '').toLowerCase().replace(/\[.*\]/, '');

            // 火把
            if (blockType.includes('torch') && !blockType.includes('torchflower')) {
                const isSoul = blockType.includes('soul');
                sources.push({
                    position: block.position,
                    color: isSoul ? 0x66ddff : 0xffaa55,
                    intensity: 0.8,
                    distance: 8,
                    offset: [0, 0.5, 0] // 火把光源在顶部
                });
            }

            // 灯笼
            if (blockType === 'lantern' || blockType === 'soul_lantern') {
                const isSoul = blockType === 'soul_lantern';
                sources.push({
                    position: block.position,
                    color: isSoul ? 0x66ddff : 0xffbb66,
                    intensity: 0.9,
                    distance: 8,
                    offset: [0, 0.3, 0] // 灯笼光源在中心
                });
            }

            // 其他发光方块
            if (GLOW_BLOCKS[blockType]) {
                sources.push({
                    position: block.position,
                    color: 0xffcc88,
                    intensity: 0.6,
                    distance: 6,
                    offset: [0, 0, 0]
                });
            }
        });

        // 限制光源数量（Three.js 性能考虑）
        return sources.slice(0, 10);
    }, [blocks]);

    return (
        <>
            {lightSources.map((light, index) => {
                const [x, y, z] = light.position;
                const [ox, oy, oz] = light.offset;

                return (
                    <pointLight
                        key={`light-${index}`}
                        position={[x + ox, y + oy, z + oz]}
                        color={light.color}
                        intensity={light.intensity}
                        distance={light.distance}
                        decay={2}
                    />
                );
            })}
        </>
    );
}

/**
 * MC 世界渲染器主组件
 */
function MCWorldRenderer({ blocks, version = '1.20.1', onBlockClick }) {
    // 点击事件处理
    const handleBlockClick = useCallback((block) => {
        if (onBlockClick) {
            onBlockClick(block);
        }
        console.log('[MCWorldRenderer] Block clicked:', block);
    }, [onBlockClick]);

    return (
        <group name="mc-world">
            {/* 方块渲染 */}
            <MCBlockRenderer
                blocks={blocks}
                version={version}
                onBlockClick={handleBlockClick}
            />

            {/* 光照系统 */}
            <MCLightingSystem blocks={blocks} />

            {/* 环境光 */}
            <ambientLight intensity={0.5} />

            {/* 主光源（模拟太阳光） */}
            <directionalLight
                position={[10, 10, 5]}
                intensity={0.8}
                castShadow={false}
            />

            {/* 辅助光源（填充阴影） */}
            <directionalLight
                position={[-5, 5, -5]}
                intensity={0.3}
            />
        </group>
    );
}

export default MCWorldRenderer;
export { MCLightingSystem };
