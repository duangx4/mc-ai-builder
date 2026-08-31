/**
 * PrismarineWorld - Prismarine Viewer 的 React 包装器
 *
 * 替代原有的 VoxelWorld 组件，提供 100% MC 原生渲染
 */

import React, { useEffect, useRef, useState } from 'react';
import { Viewer } from 'prismarine-viewer/viewer';
import { Vec3 } from 'vec3';
import mcData from 'minecraft-data';
import useStore from '../store/useStore';

function PrismarineWorld() {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [isReady, setIsReady] = useState(false);

    // 从 store 获取数据
    const blocks = useStore(state => state.blocks);
    const version = '1.20.1';

    // 初始化 Viewer
    useEffect(() => {
        if (!containerRef.current) return;

        let viewer;

        const initViewer = async () => {
            try {
                console.log('[PrismarineWorld] Initializing viewer...');

                // 创建 Viewer 实例
                viewer = new Viewer({
                    version: version,
                });

                viewerRef.current = viewer;

                // 将 canvas 添加到容器
                const canvas = viewer.renderer.domElement;
                canvas.style.width = '100%';
                canvas.style.height = '100%';
                containerRef.current.appendChild(canvas);

                // 设置摄像机位置
                viewer.camera.position.set(20, 20, 20);
                viewer.camera.lookAt(0, 0, 0);

                setIsReady(true);
                console.log('[PrismarineWorld] Viewer initialized successfully');

            } catch (error) {
                console.error('[PrismarineWorld] Failed to initialize viewer:', error);
            }
        };

        initViewer();

        // 清理函数
        return () => {
            if (viewer) {
                try {
                    viewer.close();
                    console.log('[PrismarineWorld] Viewer closed');
                } catch (error) {
                    console.error('[PrismarineWorld] Error closing viewer:', error);
                }
            }
        };
    }, [version]);

    // 同步方块数据到 Prismarine World
    useEffect(() => {
        if (!isReady || !viewerRef.current) return;

        const viewer = viewerRef.current;
        const mcDataInstance = mcData(version);

        console.log('[PrismarineWorld] Syncing blocks:', blocks.length);

        // 清空现有方块（可选，取决于需求）
        // TODO: 实现增量更新而不是全量重建

        // 放置所有方块
        blocks.forEach(block => {
            try {
                const pos = new Vec3(
                    block.position[0],
                    block.position[1],
                    block.position[2]
                );

                // 获取方块数据
                const blockData = mcDataInstance.blocksByName[block.type];
                if (!blockData) {
                    console.warn('[PrismarineWorld] Unknown block type:', block.type);
                    return;
                }

                // 使用默认状态或指定状态
                const stateId = blockData.defaultState || blockData.minStateId;

                // 设置方块
                viewer.world.setBlockStateId(pos, stateId);

            } catch (error) {
                console.error('[PrismarineWorld] Error placing block:', block, error);
            }
        });

        console.log('[PrismarineWorld] Blocks synced successfully');

    }, [blocks, isReady, version]);

    return (
        <div
            ref={containerRef}
            style={{
                width: '100%',
                height: '100%',
                position: 'relative',
                background: '#87CEEB' // 天空蓝
            }}
        >
            {!isReady && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    fontSize: '20px',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.5)'
                }}>
                    Loading Minecraft World...
                </div>
            )}
        </div>
    );
}

export default PrismarineWorld;
