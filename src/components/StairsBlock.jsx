/**
 * StairsBlock Component
 * 渲染楼梯方块
 */

import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { createStairsGeometry, parseStairsProperties } from '../utils/stairsGeometry';

/**
 * 单个楼梯方块组件
 */
export const StairsBlock = React.memo(function StairsBlock({ data, isSelected, onClick, texture, fallbackColor }) {
  const meshRef = useRef();

  const { facing, half, shape } = parseStairsProperties(data.properties);

  const position = [
    data.position[0] + 0.5,
    data.position[1] + 0.5,
    data.position[2] + 0.5
  ];

  const geometry = useMemo(() => {
    return createStairsGeometry(facing, half, shape);
  }, [facing, half, shape]);

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
          <boxGeometry args={[1.1, 1.1, 1.1]} />
          <meshBasicMaterial color="#fbbf24" wireframe={true} />
        </mesh>
      )}
    </group>
  );
});

/**
 * 实例化楼梯渲染器
 * 用于批量渲染相同类型的楼梯
 */
export const InstancedStairsBlocks = React.memo(function InstancedStairsBlocks({
  blocks,
  blockType,
  texture,
  fallbackColor,
  onBlockClick
}) {
  const meshRef = useRef();
  const tempObject = useMemo(() => new THREE.Object3D(), []);

  // 按属性分组楼梯
  const groupedBlocks = useMemo(() => {
    const groups = {};

    blocks.forEach(block => {
      const { facing, half, shape } = parseStairsProperties(block.properties);
      const key = `${facing}_${half}_${shape}`;

      if (!groups[key]) {
        groups[key] = {
          blocks: [],
          properties: { facing, half, shape }
        };
      }
      groups[key].blocks.push(block);
    });

    return groups;
  }, [blocks]);

  return (
    <>
      {Object.entries(groupedBlocks).map(([key, group]) => {
        const geometry = createStairsGeometry(
          group.properties.facing,
          group.properties.half,
          group.properties.shape
        );

        return (
          <instancedMesh
            key={key}
            ref={meshRef}
            args={[geometry, null, group.blocks.length]}
            frustumCulled={true}
            onClick={(event) => {
              event.stopPropagation();
              const instanceId = event.instanceId;
              if (instanceId !== undefined && group.blocks[instanceId]) {
                onBlockClick(group.blocks[instanceId].id);
              }
            }}
          >
            <meshStandardMaterial
              map={texture}
              color={texture ? '#ffffff' : fallbackColor}
              toneMapped={false}
            />
            <InstancedStairsUpdater
              blocks={group.blocks}
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
 * 更新实例化楼梯的位置
 */
function InstancedStairsUpdater({ blocks, meshRef, tempObject }) {
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
