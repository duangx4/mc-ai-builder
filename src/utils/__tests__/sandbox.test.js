/**
 * sandbox.js 单元测试
 * 测试 VoxelBuilder API 和 dedupeTopLevelConsts 去重逻辑
 */
import { describe, it, expect } from 'vitest';
import { executeVoxelScript } from '../sandbox.js';

describe('sandbox.js - executeVoxelScript', () => {
  it('应该执行简单的 builder.set() 指令', () => {
    const code = `
      builder.set(0, 0, 0, 'stone');
      builder.set(1, 0, 0, 'dirt');
    `;
    const voxels = executeVoxelScript(code);
    
    expect(voxels).toHaveLength(2);
    expect(voxels[0]).toMatchObject({
      position: [0, 0, 0],
      type: 'stone'
    });
    expect(voxels[1]).toMatchObject({
      position: [1, 0, 0],
      type: 'dirt'
    });
  });

  it('应该执行 builder.fill() 填充区域', () => {
    const code = `
      builder.fill(0, 0, 0, 2, 0, 2, 'grass_block');
    `;
    const voxels = executeVoxelScript(code);
    
    // 3x1x3 = 9 个方块
    expect(voxels.length).toBe(9);
    expect(voxels.every(v => v.type === 'grass_block')).toBe(true);
  });

  it('应该执行 builder.drawCylinder() 生成圆柱', () => {
    const code = `
      builder.drawCylinder(0, 0, 0, 3, 5, 'stone_bricks');
    `;
    const voxels = executeVoxelScript(code);

    // 圆柱：半径3、高度5 应该生成一些方块
    expect(voxels.length).toBeGreaterThan(0);
    expect(voxels.every(v => v.type === 'stone_bricks')).toBe(true);
  });

  it('应该执行 builder.walls() 生成四面墙', () => {
    const code = `
      builder.walls(0, 0, 0, 10, 5, 10, 'cobblestone');
    `;
    const voxels = executeVoxelScript(code);
    
    // 四面墙：x=0, x=10, z=0, z=10 各一面，y从0到5
    expect(voxels.length).toBeGreaterThan(0);
    expect(voxels.every(v => v.type === 'cobblestone')).toBe(true);
  });
});

describe('sandbox.js - dedupeTopLevelConsts 去重逻辑', () => {
  it('应该去除重复的顶层 const 声明（保留最后一个）', () => {
    const code = `
const DOOR_RX = /door/;
builder.set(0, 0, 0, 'stone');
const DOOR_RX = /window/;
builder.set(1, 0, 0, 'dirt');
    `;
    const voxels = executeVoxelScript(code);
    
    // 不应该抛出 "Identifier 'DOOR_RX' has already been declared" 错误
    expect(voxels.length).toBeGreaterThan(0);
  });

  it('无重复声明时应原样通过', () => {
    const code = `
const MATERIAL = 'stone';
builder.set(0, 0, 0, MATERIAL);
const OTHER = 'dirt';
builder.set(1, 0, 0, OTHER);
    `;
    const voxels = executeVoxelScript(code);
    
    expect(voxels).toHaveLength(2);
    expect(voxels[0].type).toBe('stone');
    expect(voxels[1].type).toBe('dirt');
  });

  it('应该保留块级作用域的 const（不误删）', () => {
    const code = `
for (let i = 0; i < 2; i++) {
  const material = i === 0 ? 'stone' : 'dirt';
  builder.set(i, 0, 0, material);
}
    `;
    const voxels = executeVoxelScript(code);
    
    // 块级 const 不会被误删，循环应正常执行
    expect(voxels).toHaveLength(2);
  });

  it('空代码应返回空数组', () => {
    const voxels = executeVoxelScript('');
    expect(voxels).toEqual([]);
  });

  it('无 builder 调用的代码应返回空数组', () => {
    const code = 'const x = 1; const y = 2;';
    const voxels = executeVoxelScript(code);
    expect(voxels).toEqual([]);
  });
});
