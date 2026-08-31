/**
 * PrismarineViewer 测试组件
 *
 * 用于验证 Prismarine Viewer 是否能正常工作
 */

import React, { useEffect, useRef } from 'react';
import { Viewer } from 'prismarine-viewer/viewer';
import { Vec3 } from 'vec3';

function PrismarineTest() {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        try {
            // 初始化 Prismarine Viewer
            const viewer = new Viewer({
                version: '1.20.1',
                // canvas 将被添加到 container 中
            });

            viewerRef.current = viewer;
            containerRef.current.appendChild(viewer.renderer.domElement);

            // 测试：放置一些方块
            const testBlocks = [
                { pos: [0, 0, 0], type: 'stone' },
                { pos: [1, 0, 0], type: 'grass_block' },
                { pos: [2, 0, 0], type: 'oak_planks' },
                { pos: [0, 0, 1], type: 'oak_fence' },
                { pos: [1, 0, 1], type: 'oak_fence' },
                { pos: [2, 0, 1], type: 'oak_fence' },
            ];

            testBlocks.forEach(({ pos, type }) => {
                const position = new Vec3(pos[0], pos[1], pos[2]);
                // 需要获取方块 ID
                const blockId = viewer.world.getBlockStateId(type);
                viewer.world.setBlockStateId(position, blockId);
            });

            console.log('[PrismarineTest] Viewer initialized successfully');

        } catch (error) {
            console.error('[PrismarineTest] Failed to initialize:', error);
        }

        // 清理
        return () => {
            if (viewerRef.current) {
                viewerRef.current.close();
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100vh',
                position: 'relative'
            }}
        />
    );
}

export default PrismarineTest;
