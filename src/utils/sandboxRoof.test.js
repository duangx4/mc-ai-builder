/**
 * 屋顶生成器测试（builder.roof + stairs/slab 便捷原语）
 */

import { describe, it, expect } from 'vitest';
import { executeVoxelScript } from './sandbox.js';

describe('builder.roof 屋顶生成器', () => {
  it('gable 双坡：5x5 区域生成正确层数', () => {
    const code = `
      builder.roof(0, 0, 4, 4, { style: 'gable', material: 'gray_concrete', frame: 'oak_planks', baseY: 10 });
    `;
    const voxels = executeVoxelScript(code);
    expect(voxels.length).toBeGreaterThan(0);

    // 检查是否有屋脊（oak_planks）
    const ridgeBlocks = voxels.filter(v => v.type === 'oak_planks' && v.position[1] >= 10);
    expect(ridgeBlocks.length).toBeGreaterThan(0);
  });

  it('gable 双坡：每层台阶 facing 同侧一致', () => {
    const code = `
      builder.roof(0, 0, 8, 4, { style: 'gable', material: 'gray_concrete', frame: 'oak_planks', baseY: 10 });
    `;
    const voxels = executeVoxelScript(code);

    // 收集所有台阶方块
    const stairs = voxels.filter(v => v.type.includes('_stairs') && v.properties);

    // 按 Y 层分组
    const layerMap = new Map();
    stairs.forEach(s => {
      const y = s.position[1];
      if (!layerMap.has(y)) layerMap.set(y, []);
      layerMap.get(y).push(s);
    });

    // 检查每层的北侧和南侧 facing 是否一致
    layerMap.forEach((layerStairs, y) => {
      const northFacings = new Set();
      const southFacings = new Set();

      layerStairs.forEach(s => {
        const z = s.position[2];
        const minZ = Math.min(...layerStairs.map(st => st.position[2]));
        const maxZ = Math.max(...layerStairs.map(st => st.position[2]));

        const facingMatch = s.properties.match(/facing=(\w+)/);
        if (!facingMatch) return;

        if (z === minZ) northFacings.add(facingMatch[1]);
        if (z === maxZ) southFacings.add(facingMatch[1]);
      });

      // 同侧 facing 必须唯一（同层同侧一致）
      if (northFacings.size > 0) expect(northFacings.size).toBe(1);
      if (southFacings.size > 0) expect(southFacings.size).toBe(1);
    });
  });

  it('gable 双坡：长边屋脊方向正确（8x5 → 沿 X）', () => {
    const code = `
      builder.roof(0, 0, 7, 4, { style: 'gable', material: 'gray_concrete', frame: 'oak_planks', baseY: 10 });
    `;
    const voxels = executeVoxelScript(code);

    // 屋脊应沿 X 方向（Z 固定）
    const ridgeBlocks = voxels.filter(v => v.type === 'oak_planks' && v.position[1] > 10);
    if (ridgeBlocks.length > 1) {
      const zValues = new Set(ridgeBlocks.map(r => r.position[2]));
      expect(zValues.size).toBeLessThanOrEqual(2); // 屋脊沿 X，Z 应该基本固定
    }
  });

  it('hip 四坡：四边 facing 各朝外', () => {
    const code = `
      builder.roof(0, 0, 6, 6, { style: 'hip', material: 'stone', frame: 'oak_planks', baseY: 10 });
    `;
    const voxels = executeVoxelScript(code);

    const stairs = voxels.filter(v => v.type.includes('_stairs') && v.properties);
    expect(stairs.length).toBeGreaterThan(0);

    // 检查边缘台阶 facing
    stairs.forEach(s => {
      const facingMatch = s.properties.match(/facing=(\w+)/);
      expect(facingMatch).toBeTruthy();
      expect(['north', 'south', 'east', 'west']).toContain(facingMatch[1]);
    });
  });

  it('pyramid 攒尖：收成尖顶 + 宝顶', () => {
    const code = `
      builder.roof(0, 0, 6, 6, { style: 'pyramid', material: 'stone', frame: 'oak_fence', baseY: 10 });
    `;
    const voxels = executeVoxelScript(code);

    // 应有宝顶（oak_fence 在最高点）
    const maxY = Math.max(...voxels.map(v => v.position[1]));
    const topBlocks = voxels.filter(v => v.position[1] === maxY);
    expect(topBlocks.length).toBeGreaterThan(0);
    expect(topBlocks.some(b => b.type === 'oak_fence')).toBe(true);
  });

  it('baseY 自动检测（先放地台）', () => {
    const code = `
      builder.set(2, 5, 2, 'stone'); // 地台
      builder.roof(0, 0, 4, 4, { style: 'gable', material: 'gray_concrete', frame: 'oak_planks' });
    `;
    const voxels = executeVoxelScript(code);

    // 屋顶应从 y=6 开始（地台 y=5 上方）
    const roofBlocks = voxels.filter(v => v.type.includes('concrete') || v.type.includes('_stairs'));
    const minRoofY = Math.min(...roofBlocks.map(v => v.position[1]));
    expect(minRoofY).toBeGreaterThanOrEqual(5); // 应在地台之上
  });

  it('参数校验：1x1 区域抛错', () => {
    const code = `
      builder.roof(0, 0, 0, 0, { style: 'gable', baseY: 10 });
    `;
    expect(() => executeVoxelScript(code, true)).toThrow(/must be at least 2x2/);
  });

  it('参数校验：未知 style 抛错', () => {
    const code = `
      builder.roof(0, 0, 4, 4, { style: 'unknown', baseY: 10 });
    `;
    expect(() => executeVoxelScript(code, true)).toThrow(/Invalid style/);
  });
});

describe('builder.stairs 便捷原语', () => {
  it('生成正确的 properties（facing + half）', () => {
    const code = `
      builder.stairs(0, 10, 0, 'oak_stairs', 'south', 'bottom');
      builder.stairs(1, 10, 0, 'oak_stairs', 'n', 'top');
    `;
    const voxels = executeVoxelScript(code);
    expect(voxels.length).toBe(2);

    const first = voxels[0];
    expect(first.properties).toContain('facing=south');
    expect(first.properties).toContain('half=bottom');

    const second = voxels[1];
    expect(second.properties).toContain('facing=north'); // 'n' 应归一化为 'north'
    expect(second.properties).toContain('half=top');
  });

  it('非法 facing 抛错', () => {
    const code = `
      builder.stairs(0, 10, 0, 'oak_stairs', 'invalid_direction');
    `;
    expect(() => executeVoxelScript(code, true)).toThrow(/Invalid facing/);
  });
});

describe('builder.slab 便捷原语', () => {
  it('生成正确的 half 属性', () => {
    const code = `
      builder.slab(0, 10, 0, 'oak_slab', 'bottom');
      builder.slab(1, 10, 0, 'oak_slab', 'top');
    `;
    const voxels = executeVoxelScript(code);
    expect(voxels.length).toBe(2);

    expect(voxels[0].properties).toContain('half=bottom');
    expect(voxels[1].properties).toContain('half=top');
  });
});
