/**
 * Prismarine 集成测试页面
 *
 * 用于测试 PrismarineWorld 是否正常工作
 */

import React, { useEffect } from 'react';
import PrismarineWorld from '../components/PrismarineWorld';
import useStore from '../store/useStore';

function PrismarineTestPage() {
    const setBlocks = useStore(state => state.setBlocks);

    // 测试：添加一些方块
    useEffect(() => {
        const testBlocks = [
            // 地面
            { id: 1, type: 'grass_block', position: [0, 0, 0] },
            { id: 2, type: 'grass_block', position: [1, 0, 0] },
            { id: 3, type: 'grass_block', position: [2, 0, 0] },
            { id: 4, type: 'grass_block', position: [0, 0, 1] },
            { id: 5, type: 'grass_block', position: [1, 0, 1] },
            { id: 6, type: 'grass_block', position: [2, 0, 1] },

            // 栅栏（测试连接）
            { id: 10, type: 'oak_fence', position: [0, 1, 0] },
            { id: 11, type: 'oak_fence', position: [1, 1, 0] },
            { id: 12, type: 'oak_fence', position: [2, 1, 0] },

            // 其他方块
            { id: 20, type: 'stone', position: [0, 1, 1] },
            { id: 21, type: 'oak_planks', position: [1, 1, 1] },
            { id: 22, type: 'glass', position: [2, 1, 1] },
        ];

        setBlocks(testBlocks);
        console.log('[PrismarineTestPage] Test blocks added');
    }, [setBlocks]);

    return (
        <div style={{ width: '100vw', height: '100vh' }}>
            <div style={{
                position: 'absolute',
                top: 10,
                left: 10,
                zIndex: 1000,
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '10px',
                borderRadius: '5px'
            }}>
                <h3>Prismarine Viewer Test</h3>
                <p>应该看到：</p>
                <ul>
                    <li>3x2 的草地平台</li>
                    <li>3个连续的橡木栅栏</li>
                    <li>石头、橡木板、玻璃方块</li>
                </ul>
                <p>控制：</p>
                <ul>
                    <li>鼠标拖动 - 旋转视角</li>
                    <li>滚轮 - 缩放</li>
                </ul>
            </div>

            <PrismarineWorld />
        </div>
    );
}

export default PrismarineTestPage;
