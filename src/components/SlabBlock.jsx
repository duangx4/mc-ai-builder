/**
 * SlabBlock Component
 * 渲染台阶方块
 */

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { createSlabGeometry, parseSlabProperties } from '../utils/slabGeometry';

/**
 * 单个台阶方块组件
 */
export const SlabBlock = React.memo(function SlabBlock({ data, isSelected, onClick, texture, fallbackColor }) {
  const meshRef = useRef();

  const { type } = parseSlabProperties(data.properties);

  const position = [
    data.position[0] + 0.5,
    data.position[1] + 0.5,
    data.position[2] + 0.5
  ];

  const geometry = useMemo(() => {
    return createSlabGeometry(type);
  }, [type]);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => {
          e.stopPropagation();
          onClick(data.id);
        }}
      >
        <meshStandardMaterial
          map={texture}
          color={texture ? '#ffffff' : fallbackColor}
          toneMapped={false}
        />
      </mesh>
      {isSelected && (
        <mesh>
          <boxGeometry args={[1.1, type === 'double' ? 1.1 : 0.6, 1.1]} />
          <meshBasicMaterial color="#fbbf24" wireframe={true} />
        </mesh>
      )}
    </group>
  );
});

/**
 * 实例化台阶渲染器
 */
export const InstancedSlabBlocks = React.memo(function InstancedSlabBlocks({
  blocks,
  blockType,
  texture,
  fallbackColor,
  onBlockClick
}) {
  const meshRef = useRef();
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  // 按类型分组台阶
  const groupedBlocks = useMemo(() => {
    const groups = { top: [], bottom: [], double: [] };

    blocks.forEach(block => {
      const { type } = parseSlabProperties(block.properties);
      groups[type].push(block);
    });

    return groups;
  }, [blocks]);

  return (
    <>
      {Object.entries(groupedBlocks).map(([type, typeBlocks]) => {
        if (typeBlocks.length === 0) return null;

        const geometry = createSlabGeometry(type);

        return (
          <instancedMesh
            key={type}
            ref={meshRef}
            args={[geometry, null, typeBlocks.length]}
            frustumCulled={true}
            onClick={(event) => {
              event.stopPropagation();
              const instanceId = event.instanceId;
              if (instanceId !== undefined && typeBlocks[instanceId]) {
                onBlockClick(typeBlocks[instanceId].id);
              }
            }}
          >
            <meshStandardMaterial
              map={texture}
              color={texture ? '#ffffff' : fallbackColor}
              toneMapped={false}
            />
            <InstancedSlabUpdater
              blocks={typeBlocks}
              meshRef={meshRef}
              tempObject={tempObject}
            />
          </instancedMesh>
        );
      })}
    </>
  );
});

/**
 * 更新实例化台阶的位置
 */
function InstancedSlabUpdater({ blocks, meshRef, tempObject }) {
  useEffect(() => {
    if (!meshRef.current || blocks.length === 0) return;

    blocks.forEach((block, i) => {
      tempObject.position.set(
        block.position[0] + 0.5,
        block.position[1] + 0.5,
        block.position[2] + 0.5
      );
      tempObject.rotation.set(0, 0, 0);
      tempObject.scale.set(1, 1, 1);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [blocks, meshRef, tempObject]);

  return null;
}
