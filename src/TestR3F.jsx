import React from 'react';
import { Canvas } from '@react-three/fiber';

// 最小化测试组件
export default function TestR3F() {
  console.log('[TestR3F] Component rendering');

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas>
        <color attach="background" args={['#a8d5f0']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* 简单的红色立方体 */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="red" />
        </mesh>

        {/* 简单的相机控制 */}
        <OrbitControlsSimple />
      </Canvas>
    </div>
  );
}

function OrbitControlsSimple() {
  console.log('[OrbitControls] Mounted');
  return null;
}
