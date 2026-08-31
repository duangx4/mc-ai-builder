/**
 * MCModelBlock - 基于原版 MC JSON 模型渲染的方块组件
 *
 * 使用 MC 1.20.1 原版模型数据，支持：
 * - 简单方块（variants）
 * - 复杂方块（multipart）：栅栏、墙体、红石等
 * - 自动连接推断
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { loadBlockstateGeometries, inferBlockConnections, loadBlockstateJson, parseBlockstate } from '../utils/mcBlockstateLoader';
import { loadModelCached } from '../utils/mcModelLoader';

/**
 * 单个基于 MC 模型的方块
 */
export function MCModelBlock({ block, positionMap, material, onClick, version = '1.20.1' }) {
    const [geometries, setGeometries] = useState([]);
    const meshRefs = useRef([]);

    useEffect(() => {
        const loadGeometries = async () => {
            try {
                const blockType = block.type.toLowerCase().replace(/\[.*\]/, ''); // 移除属性后缀

                // 推断连接状态
                const connections = inferBlockConnections(block, positionMap);

                // 解析方块属性（如果有）
                const properties = { ...connections, ...block.properties };

                // 加载 blockstate 并获取几何体
                const geos = await loadBlockstateGeometries(blockType, properties, version);

                setGeometries(geos);
            } catch (err) {
                console.error('[MCModelBlock] Failed to load:', block.type, err);
                setGeometries([]);
            }
        };

        loadGeometries();
    }, [block.type, block.position, positionMap, version]);

    if (geometries.length === 0) {
        // 加载中或失败，渲染简单立方体
        return (
            <mesh
                position={[
                    block.position[0] + 0.5,
                    block.position[1] + 0.5,
                    block.position[2] + 0.5
                ]}
                material={material}
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.(block.id, e);
                }}
            >
                <boxGeometry args={[1, 1, 1]} />
            </mesh>
        );
    }

    return (
        <group
            position={[
                block.position[0] + 0.5,
                block.position[1] + 0.5,
                block.position[2] + 0.5
            ]}
            onClick={(e) => {
                e.stopPropagation();
                onClick?.(block.id, e);
            }}
        >
            {geometries.map(({ geometry }, idx) => (
                <mesh
                    key={idx}
                    ref={el => meshRefs.current[idx] = el}
                    geometry={geometry}
                    material={material}
                    castShadow
                    receiveShadow
                />
            ))}
        </group>
    );
}

/**
 * 基于 MC 模型的实例化渲染（高性能）
 *
 * 适用于大量相同类型的方块（如大片栅栏、墙体）
 */
export function MCModelInstancedBlocks({ blocks, blockType, positionMap, material, onClick, version = '1.20.1' }) {
    const [blockstateJson, setBlockstateJson] = useState(null);
    const [instanceGroups, setInstanceGroups] = useState(new Map());
    const meshRefs = useRef(new Map());
    const tempObject = useMemo(() => new THREE.Object3D(), []);

    // 加载 blockstate JSON
    useEffect(() => {
        const load = async () => {
            const json = await loadBlockstateJson(blockType, version);
            setBlockstateJson(json);
        };
        load();
    }, [blockType, version]);

    // 根据每个方块的连接状态，分组到不同的模型组合
    useEffect(() => {
        if (!blockstateJson || blocks.length === 0) return;

        const groups = new Map(); // key: 模型组合签名, value: {blocks, modelDefs}

        blocks.forEach(block => {
            // 推断连接
            const connections = inferBlockConnections(block, positionMap);
            const properties = { ...connections, ...block.properties };

            // 解析 blockstate
            const models = parseBlockstate(blockstateJson, properties);

            // 生成签名（模型+旋转的组合）
            const signature = models
                .map(m => `${m.model}|${m.x}|${m.y}`)
                .sort()
                .join(';');

            if (!groups.has(signature)) {
                groups.set(signature, { blocks: [], modelDefs: models });
            }

            groups.get(signature).blocks.push(block);
        });

        setInstanceGroups(groups);
    }, [blocks, blockstateJson, positionMap]);

    // 加载几何体并更新实例化矩阵
    useEffect(() => {
        if (instanceGroups.size === 0) return;

        const loadAndUpdate = async () => {
            for (const [signature, { blocks: groupBlocks, modelDefs }] of instanceGroups.entries()) {
                // 加载所有模型的几何体
                const geometries = await Promise.all(
                    modelDefs.map(async ({ model, x, y }) => {
                        const modelPath = model.replace(/^(minecraft:)?block\//, 'block/');
                        const geo = await loadModelCached(modelPath, version);

                        // 应用旋转
                        if (x !== 0) geo.rotateX((x * Math.PI) / 180);
                        if (y !== 0) geo.rotateY((y * Math.PI) / 180);

                        return geo;
                    })
                );

                // 为每个模型创建 instancedMesh
                geometries.forEach((geometry, geoIdx) => {
                    const meshKey = `${signature}-${geoIdx}`;
                    const meshRef = meshRefs.current.get(meshKey);

                    if (meshRef) {
                        // 更新实例化矩阵
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
                });
            }
        };

        loadAndUpdate();
    }, [instanceGroups, tempObject, version]);

    const handleClick = (event) => {
        event.stopPropagation();
        const instanceId = event.instanceId;
        if (instanceId !== undefined && blocks[instanceId]) {
            onClick?.(blocks[instanceId].id, event);
        }
    };

    if (instanceGroups.size === 0) {
        return null;
    }

    return (
        <group>
            {Array.from(instanceGroups.entries()).map(([signature, { blocks: groupBlocks, modelDefs }]) =>
                modelDefs.map((modelDef, geoIdx) => {
                    const meshKey = `${signature}-${geoIdx}`;

                    return (
                        <instancedMesh
                            key={meshKey}
                            ref={el => meshRefs.current.set(meshKey, el)}
                            args={[null, null, groupBlocks.length]}
                            material={material}
                            onClick={handleClick}
                            frustumCulled={true}
                            castShadow
                            receiveShadow
                        >
                            {/* geometry 将在 useEffect 中通过 loadModelCached 异步加载 */}
                            <boxGeometry args={[0.1, 0.1, 0.1]} /> {/* 临时占位 */}
                        </instancedMesh>
                    );
                })
            )}
        </group>
    );
}

export default MCModelBlock;
