/**
 * 楼梯几何体生成器
 * 支持所有 56 种楼梯方块的渲染
 */

import * as THREE from 'three';

/**
 * 创建楼梯几何体
 * @param {string} facing - 朝向: 'north', 'south', 'east', 'west'
 * @param {string} half - 位置: 'top', 'bottom'
 * @param {string} shape - 形状: 'straight', 'inner_left', 'inner_right', 'outer_left', 'outer_right'
 * @returns {THREE.BufferGeometry} 楼梯几何体
 */
export function createStairsGeometry(facing = 'north', half = 'bottom', shape = 'straight') {
  const geometry = new THREE.BufferGeometry();

  // 根据形状生成不同的几何体
  switch (shape) {
    case 'straight':
      return createStraightStairs(facing, half);
    case 'inner_left':
    case 'inner_right':
      return createInnerStairs(facing, half, shape);
    case 'outer_left':
    case 'outer_right':
      return createOuterStairs(facing, half, shape);
    default:
      return createStraightStairs(facing, half);
  }
}

/**
 * 创建直线楼梯（两个立方体组合）
 */
function createStraightStairs(facing, half) {
  const geometry = new THREE.BufferGeometry();

  // 楼梯由两部分组成：
  // 1. 底部台阶（高度 0.5）
  // 2. 顶部台阶（高度 0.5）

  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // 底部台阶：整个底部的一半
  // 顶部台阶：后半部分的上半

  // 根据朝向和半部分生成顶点
  const isTop = half === 'top';
  const rotation = getRotationFromFacing(facing);

  // 基础楼梯形状（朝北）
  // 底部台阶：[0, 0, 0] 到 [1, 0.5, 1]
  // 顶部台阶：[0, 0.5, 0] 到 [1, 1, 0.5]

  const bottomStep = createBox(0, 0, 0, 1, 0.5, 1);
  const topStep = createBox(0, 0.5, 0, 1, 0.5, 0.5);

  // 合并两个台阶
  mergeGeometry(bottomStep, positions, normals, uvs, indices);
  mergeGeometry(topStep, positions, normals, uvs, indices);

  // 应用旋转
  applyRotation(positions, rotation, isTop);

  // 设置几何体属性
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}

/**
 * 创建内角楼梯（L型）
 */
function createInnerStairs(facing, half, shape) {
  // 内角楼梯由三个立方体组成
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const isTop = half === 'top';
  const rotation = getRotationFromFacing(facing);
  const isLeft = shape === 'inner_left';

  // 底部台阶（全底）
  const bottomStep = createBox(0, 0, 0, 1, 0.5, 1);

  // 顶部两个台阶形成 L 型
  const topStep1 = createBox(0, 0.5, 0, 1, 0.5, 0.5);
  const topStep2 = createBox(isLeft ? 0.5 : 0, 0.5, 0.5, 0.5, 0.5, 0.5);

  mergeGeometry(bottomStep, positions, normals, uvs, indices);
  mergeGeometry(topStep1, positions, normals, uvs, indices);
  mergeGeometry(topStep2, positions, normals, uvs, indices);

  applyRotation(positions, rotation, isTop);

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}

/**
 * 创建外角楼梯（凸角）
 */
function createOuterStairs(facing, half, shape) {
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const isTop = half === 'top';
  const rotation = getRotationFromFacing(facing);
  const isLeft = shape === 'outer_left';

  // 外角楼梯更小
  // 底部台阶（四分之一）
  const bottomStep = createBox(isLeft ? 0 : 0.5, 0, 0, 0.5, 0.5, 0.5);

  // 顶部台阶（更小）
  const topStep = createBox(isLeft ? 0 : 0.5, 0.5, 0, 0.5, 0.5, 0.5);

  mergeGeometry(bottomStep, positions, normals, uvs, indices);
  mergeGeometry(topStep, positions, normals, uvs, indices);

  applyRotation(positions, rotation, isTop);

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  return geometry;
}

/**
 * 创建立方体的顶点数据
 */
function createBox(x, y, z, width, height, depth) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // 8 个顶点
  const x0 = x, x1 = x + width;
  const y0 = y, y1 = y + height;
  const z0 = z, z1 = z + depth;

  // 6 个面，每个面 4 个顶点
  const faces = [
    // Front face (z1)
    { vertices: [[x0,y0,z1], [x1,y0,z1], [x1,y1,z1], [x0,y1,z1]], normal: [0,0,1] },
    // Back face (z0)
    { vertices: [[x1,y0,z0], [x0,y0,z0], [x0,y1,z0], [x1,y1,z0]], normal: [0,0,-1] },
    // Top face (y1)
    { vertices: [[x0,y1,z0], [x1,y1,z0], [x1,y1,z1], [x0,y1,z1]], normal: [0,1,0] },
    // Bottom face (y0)
    { vertices: [[x0,y0,z1], [x1,y0,z1], [x1,y0,z0], [x0,y0,z0]], normal: [0,-1,0] },
    // Right face (x1)
    { vertices: [[x1,y0,z1], [x1,y0,z0], [x1,y1,z0], [x1,y1,z1]], normal: [1,0,0] },
    // Left face (x0)
    { vertices: [[x0,y0,z0], [x0,y0,z1], [x0,y1,z1], [x0,y1,z0]], normal: [-1,0,0] }
  ];

  let vertexOffset = 0;
  faces.forEach(face => {
    // 添加 4 个顶点
    face.vertices.forEach(v => {
      positions.push(v[0] - 0.5, v[1] - 0.5, v[2] - 0.5); // 中心化
      normals.push(face.normal[0], face.normal[1], face.normal[2]);
      uvs.push(0, 0); // UV 后续可以根据纹理调整
    });

    // 添加索引（两个三角形）
    indices.push(
      vertexOffset, vertexOffset + 1, vertexOffset + 2,
      vertexOffset, vertexOffset + 2, vertexOffset + 3
    );

    vertexOffset += 4;
  });

  return { positions, normals, uvs, indices };
}

/**
 * 合并几何体数据
 */
function mergeGeometry(box, positions, normals, uvs, indices) {
  const vertexOffset = positions.length / 3;

  positions.push(...box.positions);
  normals.push(...box.normals);
  uvs.push(...box.uvs);

  // 索引需要加上偏移
  box.indices.forEach(idx => {
    indices.push(idx + vertexOffset);
  });
}

/**
 * 根据朝向获取旋转角度
 */
function getRotationFromFacing(facing) {
  switch (facing) {
    case 'north': return 0;
    case 'east': return Math.PI / 2;
    case 'south': return Math.PI;
    case 'west': return -Math.PI / 2;
    default: return 0;
  }
}

/**
 * 应用旋转到顶点
 */
function applyRotation(positions, rotation, isTop) {
  if (rotation === 0 && !isTop) return;

  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i];
    let y = positions[i + 1];
    let z = positions[i + 2];

    // 上下翻转
    if (isTop) {
      y = -y;
    }

    // Y 轴旋转
    if (rotation !== 0) {
      const newX = x * cos - z * sin;
      const newZ = x * sin + z * cos;
      positions[i] = newX;
      positions[i + 2] = newZ;
    } else {
      positions[i + 1] = y;
    }
  }
}

/**
 * 解析楼梯属性
 */
export function parseStairsProperties(properties = {}) {
  return {
    facing: properties.facing || 'north',
    half: properties.half || 'bottom',
    shape: properties.shape || 'straight'
  };
}
