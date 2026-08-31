/**
 * MCModelInstancedBlocks - 基于原版 MC JSON 模型的实例化渲染组件
 *
 * 使用 MC 1.20.1 原版模型数据，完全替代手写几何体
 * 支持 multipart 系统（栅栏、墙体等自动连接）
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { loadBlockstateGeometries, inferBlockConnections, loadBlockstateJson, parseBlockstate } from '../utils/mcBlockstateLoader';
import { loadModelCached } from '../utils/mcModelLoader';

function MCModelInstancedBlocks({ blocks, blockType, positionMap, material, onBlockClick, version = '1.20.1' }) {
    const [blockstateJson, setBlockstateJson] = useState(null);
    const [modelGroups, setModelGroups] = useState([]);
    const meshRefs = useRef([]);
    const tempObject = useMemo(() => new THREE.Object3D(), []);

    // 加载 blockstate JSON
    useEffect(() => {
        const load = async () => {
            try {
                const json = await loadBlockstateJson(blockType, version);
                setBlockstateJson(json);
            } catch (err) {
                console.error('[MCModelInstancedBlocks] Failed to load blockstate:', blockType, err);
            }
        };
        load();
    }, [blockType, version]);

    // 分析方块并按模型组合分组
    useEffect(() => {
        if (!blockstateJson || blocks.length === 0) {
            setModelGroups([]);
            return;
        }

        const groups = new Map(); // key: 模型签名, value: { blocks: [], modelDefs: [] }

        blocks.forEach(block => {
            // 推断连接状态
            const connections = inferBlockConnections(block, positionMap);
            const properties = { ...connections, ...block.properties };

            // 调试日志
            console.log('[MCModelInstancedBlocks] Block:', block.type, 'Properties:', properties);

            // 解析 blockstate 获取适用的模型
            const models = parseBlockstate(blockstateJson, properties);

            if (models.length === 0) {
                console.warn('[MCModelInstancedBlocks] No models for block:', block, properties);
                return;
            }

            // 生成唯一签名（模型路径+旋转）
            const signature = models
                .map(m => `${m.model}|x${m.x}|y${m.y}`)
                .sort()
                .join(';');

            if (!groups.has(signature)) {
                groups.set(signature, { blocks: [], modelDefs: models });
            }

            groups.get(signature).blocks.push(block);
        });

        // 转换为数组
        const groupsArray = Array.from(groups.entries()).map(([signature, data]) => ({
            signature,
            ...data
        }));

        setModelGroups(groupsArray);
    }, [blocks, blockstateJson, positionMap]);

    // 加载几何体并更新实例矩阵
    useEffect(() => {
        if (modelGroups.length === 0) return;

        const loadGeometries = async () => {
            for (let groupIdx = 0; groupIdx < modelGroups.length; groupIdx++) {
                const group = modelGroups[groupIdx];
                const { modelDefs, blocks: groupBlocks } = group;

                // 为该组的每个模型加载几何体
                for (let modelIdx = 0; modelIdx < modelDefs.length; modelIdx++) {
                    const { model, x, y } = modelDefs[modelIdx];

                    try {
                        // 加载模型几何体
                        const modelPath = model.replace(/^(minecraft:)?block\//, 'block/');
                        const geometry = await loadModelCached(modelPath, version);

                        // 应用旋转
                        if (x !== 0) geometry.rotateX((x * Math.PI) / 180);
                        if (y !== 0) geometry.rotateY((y * Math.PI) / 180);

                        // 获取对应的 mesh ref
                        const meshKey = `${groupIdx}-${modelIdx}`;
                        const meshRef = meshRefs.current[meshKey];

                        if (meshRef) {
                            // 设置几何体
                            meshRef.geometry = geometry;

                            // 更新所有实例的变换矩阵
                            groupBlocks.forEach((block, i) => {
                                tempObject.position.set(
                                    block.position[0] + 0.5,
                                    block.position[1] + 0.5,
                                    block.position[2] + 0.5
                                );
                                tempObject.updateMatrix();
                                meshRef.setMatrixAt(i, tempObject.matrix);
                            });

                            meshRef.instanceMatrix.needsUpdate = true;
                        }
                    } catch (err) {
                        console.error('[MCModelInstancedBlocks] Failed to load model:', model, err);
                    }
                }
            }
        };

        loadGeometries();
    }, [modelGroups, tempObject, version]);

    const handleClick = (event) => {
        event.stopPropagation();
        const instanceId = event.instanceId;

        // 找到对应的方块
        // 需要根据 groupIdx 计算全局 instanceId
        let globalIndex = 0;
        for (const group of modelGroups) {
            if (instanceId < globalIndex + group.blocks.length) {
                const localIndex = instanceId - globalIndex;
                const block = group.blocks[localIndex];
                if (block) {
                    onBlockClick?.(block.id, event);
                }
                return;
            }
            globalIndex += group.blocks.length;
        }
    };

    if (modelGroups.length === 0) {
        return null;
    }

    return (
        <group>
            {modelGroups.map((group, groupIdx) =>
                group.modelDefs.map((modelDef, modelIdx) => {
                    const meshKey = `${groupIdx}-${modelIdx}`;

                    return (
                        <instancedMesh
                            key={meshKey}
                            ref={el => {
                                if (el) meshRefs.current[meshKey] = el;
                            }}
                            args={[null, material, group.blocks.length]}
                            onClick={handleClick}
                            frustumCulled={true}
                            castShadow
                            receiveShadow
                        >
                            {/* 临时占位几何体，实际几何体在 useEffect 中异步设置 */}
                            <boxGeometry args={[0.1, 0.1, 0.1]} />
                        </instancedMesh>
                    );
                })
            )}
        </group>
    );
}

export default MCModelInstancedBlocks;
