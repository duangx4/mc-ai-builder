import React, { useState, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import InteractiveRegionBox from './InteractiveRegionBox';
import * as THREE from 'three';

/**
 * Gizmo 模式区域选择器
 * 单击创建黄色方块，使用 TransformControls 调整位置和大小
 */
const GizmoRegionSelector = ({
  isActive,
  onBoundsChange,
  onBoxCreated
}) => {
  const { camera, gl } = useThree();
  const [boxPosition, setBoxPosition] = useState(null);
  const [controlMode, setControlMode] = useState('translate');
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());

  useEffect(() => {
    if (!isActive) {
      setBoxPosition(null);
      return;
    }

    const handleClick = (event) => {
      // 如果已经创建了方块，不再响应点击
      if (boxPosition) return;

      // 计算鼠标位置
      const rect = gl.domElement.getBoundingClientRect();
      mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // 射线检测
      raycaster.current.setFromCamera(mouse.current, camera);

      // 与 Y=0 平面相交
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersectPoint = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(plane, intersectPoint);

      if (intersectPoint) {
        // 对齐到整数坐标，Y 坐标设为 2（默认高度）
        const position = [
          Math.round(intersectPoint.x),
          2,
          Math.round(intersectPoint.z)
        ];
        setBoxPosition(position);

        if (onBoxCreated) {
          onBoxCreated(position);
        }

        console.log('[GizmoRegionSelector] Box created at:', position);
      }
    };

    gl.domElement.addEventListener('click', handleClick);

    return () => {
      gl.domElement.removeEventListener('click', handleClick);
    };
  }, [isActive, boxPosition, camera, gl, onBoxCreated]);

  // 当 isActive 变为 false 时，清除方块
  useEffect(() => {
    if (!isActive) {
      setBoxPosition(null);
    }
  }, [isActive]);

  if (!isActive || !boxPosition) return null;

  return (
    <InteractiveRegionBox
      initialPosition={boxPosition}
      initialSize={[3, 3, 3]}
      onBoundsChange={onBoundsChange}
      mode={controlMode}
    />
  );
};

export default GizmoRegionSelector;
