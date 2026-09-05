import React, { useRef, useState, useEffect } from 'react';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

/**
 * 交互式区域选择框
 * 使用 TransformControls 进行位置和大小调整
 */
const InteractiveRegionBox = ({
  initialPosition = [0, 2, 0],
  initialSize = [3, 3, 3],
  onBoundsChange,
  onConfirm,
  mode = 'translate' // 'translate' or 'scale'
}) => {
  const meshRef = useRef();
  const controlsRef = useRef();

  const [position, setPosition] = useState(initialPosition);
  const [size, setSize] = useState(initialSize);

  // 当位置或大小改变时，通知父组件
  useEffect(() => {
    if (!onBoundsChange) return;

    const bounds = {
      min: {
        x: Math.round(position[0] - size[0] / 2),
        y: Math.round(position[1] - size[1] / 2),
        z: Math.round(position[2] - size[2] / 2)
      },
      max: {
        x: Math.round(position[0] + size[0] / 2),
        y: Math.round(position[1] + size[1] / 2),
        z: Math.round(position[2] + size[2] / 2)
      },
      size: {
        x: Math.round(size[0]),
        y: Math.round(size[1]),
        z: Math.round(size[2])
      }
    };

    onBoundsChange(bounds);
  }, [position, size, onBoundsChange]);

  // 处理 TransformControls 变化
  const handleDrag = () => {
    if (!meshRef.current) return;

    const newPos = [
      meshRef.current.position.x,
      meshRef.current.position.y,
      meshRef.current.position.z
    ];
    setPosition(newPos);
  };

  const handleScale = () => {
    if (!meshRef.current) return;

    const newSize = [
      Math.abs(meshRef.current.scale.x * initialSize[0]),
      Math.abs(meshRef.current.scale.y * initialSize[1]),
      Math.abs(meshRef.current.scale.z * initialSize[2])
    ];
    setSize(newSize);
  };

  return (
    <group>
      {/* 半透明黄色立方体 */}
      <mesh ref={meshRef} position={initialPosition}>
        <boxGeometry args={initialSize} />
        <meshBasicMaterial
          color={0xffff00}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
        {/* 边框线 */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(...initialSize)]} />
          <lineBasicMaterial color={0xffff00} linewidth={2} />
        </lineSegments>
      </mesh>

      {/* TransformControls */}
      <TransformControls
        ref={controlsRef}
        object={meshRef}
        mode={mode}
        translationSnap={1} // 移动时按 1 格对齐
        scaleSnap={0.5}     // 缩放时按 0.5 倍调整
        rotationSnap={null} // 禁用旋转
        showX
        showY
        showZ
        onChange={mode === 'translate' ? handleDrag : handleScale}
      />
    </group>
  );
};

export default InteractiveRegionBox;
