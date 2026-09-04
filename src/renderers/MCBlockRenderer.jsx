/**
 * MC 方块渲染器
 * 统一的方块渲染组件
 */

import React, { useMemo, useState, useEffect } from 'react';
import { groupByBlockType } from '../systems/BlockGrouper.js';
import GeometryFactory from '../systems/GeometryFactory.js';
import MaterialManager from '../systems/MaterialManager.js';
import InstanceManager from '../systems/InstanceManager.js';
import { getBlockRenderType } from '../utils/blockClassifier.js';

/**
 * 单个渲染组
 */
function InstancedBlockGroup({ group, materialManager, onBlockClick }) {
    const [mesh, setMesh] = useState(null);

    useEffect(() => {
        let isMounted = true;

        async function createMesh() {
            try {
                const { blockType, blocks } = group;

                // 1. 获取几何体
                const geometry = await GeometryFactory.getGeometry(blockType, {}, materialManager.version);

                if (!isMounted) {
                    geometry.dispose();
                    return;
                }

                // 2. 获取材质属性
                const renderType = getBlockRenderType(blockType);
                const materialProps = {
                    transparent: renderType.transparent,
                    emissive: renderType.emissive,
                    emissiveColor: renderType.emissiveColor,
                    emissiveIntensity: renderType.emissiveIntensity,
                    doubleSided: renderType.doubleSided,
                    opacity: renderType.opacity
                };

                // 3. 获取材质
                const material = await materialManager.getMaterial(blockType, materialProps);

                if (!isMounted) {
                    geometry.dispose();
                    return;
                }

                // 4. 创建实例化 mesh
                const instancedMesh = InstanceManager.createInstancedMesh(geometry, material, blocks);

                setMesh(instancedMesh);
            } catch (err) {
                console.error('[InstancedBlockGroup] Failed to create mesh:', err);
            }
        }

        createMesh();

        return () => {
            isMounted = false;
            if (mesh) {
                if (mesh.geometry) mesh.geometry.dispose();
                // 材质由 MaterialManager 管理，不在这里 dispose
            }
        };
    }, [group, materialManager]);

    // 点击事件处理
    const handleClick = (event) => {
        if (!mesh || !onBlockClick) return;

        const instanceId = event.instanceId;
        if (instanceId !== undefined && mesh.userData.blocks) {
            const block = mesh.userData.blocks[instanceId];
            if (block) {
                onBlockClick(block);
            }
        }
    };

    if (!mesh) return null;

    return <primitive object={mesh} onClick={handleClick} />;
}

/**
 * MC 方块渲染器主组件
 */
function MCBlockRenderer({ blocks, version = '1.20.1', onBlockClick }) {
    // 初始化材质管理器
    const materialManager = useMemo(() => {
        const manager = new MaterialManager(version);
        manager.initialize();
        return manager;
    }, [version]);

    // 按方块类型分组
    const groups = useMemo(() => {
        if (!blocks || blocks.length === 0) {
            return [];
        }

        return groupByBlockType(blocks);
    }, [blocks]);

    // 调试信息
    useEffect(() => {
        console.log('[MCBlockRenderer] Rendering', blocks.length, 'blocks in', groups.length, 'groups');
    }, [blocks.length, groups.length]);

    return (
        <group name="mc-block-renderer">
            {groups.map((group, index) => (
                <InstancedBlockGroup
                    key={`${group.signature}-${index}`}
                    group={group}
                    materialManager={materialManager}
                    onBlockClick={onBlockClick}
                />
            ))}
        </group>
    );
}

export default MCBlockRenderer;
