/**
 * SDF 曲面体素化原语单元测试 (P3-① SDF Surface Voxelization Primitives Tests)
 */

import { describe, it, expect } from 'vitest';
import { executeVoxelScript } from './sandbox.js';

describe('SDF 曲面原语 (SDF Curved Surface Primitives)', () => {
  
  describe('builder.sphere - 球体原语', () => {
    it('实心球体：半径 2 应生成约 33 个方块', () => {
      const code = 'builder.sphere(0, 10, 0, 2, "stone");';
      const voxels = executeVoxelScript(code, true);
      
      expect(voxels.length).toBeGreaterThan(0);
      expect(voxels.length).toBeGreaterThanOrEqual(25);
      expect(voxels.length).toBeLessThanOrEqual(45);
    });

    it('实心球体：中心方块必须存在', () => {
      const code = 'builder.sphere(0, 10, 0, 3, "stone_bricks");';
      const voxels = executeVoxelScript(code, true);
      
      const centerBlock = voxels.find(v => 
        v.position[0] === 0 && v.position[1] === 10 && v.position[2] === 0
      );
      expect(centerBlock).toBeDefined();
      expect(centerBlock.type).toBe('stone_bricks');
    });

    it('空心球体：hollow=true 应只生成球壳', () => {
      const code = 'builder.sphere(0, 10, 0, 3, "glass", { hollow: true, wall: 1 });';
      const voxels = executeVoxelScript(code, true);
      
      expect(voxels.length).toBeGreaterThan(0);
      expect(voxels.length).toBeLessThan(120);
      
      const centerBlock = voxels.find(v => 
        v.position[0] === 0 && v.position[1] === 10 && v.position[2] === 0
      );
      expect(centerBlock).toBeUndefined();
    });

    it('参数校验：负半径应抛出错误', () => {
      const code = 'builder.sphere(0, 10, 0, -5, "stone");';
      expect(() => executeVoxelScript(code, true)).toThrow(/Invalid radius/);
    });

    it('参数校验：NaN 半径应抛出错误', () => {
      const code = 'builder.sphere(0, 10, 0, NaN, "stone");';
      expect(() => executeVoxelScript(code, true)).toThrow(/Invalid radius/);
    });

    it('参数校验：超出范围的坐标应抛出错误', () => {
      const code = 'builder.sphere(1000, 10, 0, 5, "stone");';
      expect(() => executeVoxelScript(code, true)).toThrow(/out of range/);
    });
  });

  describe('builder.dome - 穹顶原语', () => {
    it('穹顶：半径 3 高度 3 应生成方块', () => {
      const code = 'builder.dome(0, 10, 0, 3, 3, "sandstone");';
      const voxels = executeVoxelScript(code, true);
      
      expect(voxels.length).toBeGreaterThan(20);
      expect(voxels.length).toBeLessThan(80);
    });

    it('穹顶：Y 坐标应在 [cy, cy+height) 范围内', () => {
      const code = 'builder.dome(0, 10, 0, 4, 5, "stone_bricks");';
      const voxels = executeVoxelScript(code, true);
      
      voxels.forEach(v => {
        expect(v.position[1]).toBeGreaterThanOrEqual(10);
        expect(v.position[1]).toBeLessThan(15);
      });
      
      const bottomBlocks = voxels.filter(v => v.position[1] === 10);
      expect(bottomBlocks.length).toBeGreaterThan(0);
    });

    it('穹顶：不应有低于底面的方块', () => {
      const code = 'builder.dome(0, 10, 0, 3, 3, "sandstone");';
      const voxels = executeVoxelScript(code, true);
      
      const belowBlocks = voxels.filter(v => v.position[1] < 10);
      expect(belowBlocks.length).toBe(0);
    });

    it('参数校验：负高度应抛出错误', () => {
      const code = 'builder.dome(0, 10, 0, 5, -3, "stone");';
      expect(() => executeVoxelScript(code, true)).toThrow(/Invalid height/);
    });
  });

  describe('builder.cylinder - 圆柱原语', () => {
    it('实心圆柱：半径 3 高度 5 应生成方块', () => {
      const code = 'builder.cylinder(0, 10, 0, 3, 5, "oak_log");';
      const voxels = executeVoxelScript(code, true);
      
      expect(voxels.length).toBeGreaterThan(100);
      expect(voxels.length).toBeLessThan(180);
    });

    it('空心圆柱：hollow=true 应只生成壳', () => {
      const code = 'builder.cylinder(0, 10, 0, 3, 5, "stone_bricks", { hollow: true, wall: 1 });';
      const voxels = executeVoxelScript(code, true);
      
      expect(voxels.length).toBeGreaterThan(0);
      expect(voxels.length).toBeLessThan(100);
      
      const centerBottom = voxels.find(v => 
        v.position[0] === 0 && v.position[1] === 10 && v.position[2] === 0
      );
      expect(centerBottom).toBeUndefined();
    });

    it('参数校验：负半径应抛出错误', () => {
      const code = 'builder.cylinder(0, 10, 0, -3, 5, "stone");';
      expect(() => executeVoxelScript(code, true)).toThrow(/Invalid radius/);
    });
  });

  describe('builder.torus - 环面原语', () => {
    it('环面：majorR=4 minorR=1 应生成环形结构', () => {
      const code = 'builder.torus(0, 10, 0, 4, 1, "quartz_block");';
      const voxels = executeVoxelScript(code, true);
      
      expect(voxels.length).toBeGreaterThan(50);
    });

    it('环面：中心孔应该是空的', () => {
      const code = 'builder.torus(0, 10, 0, 4, 1, "stone");';
      const voxels = executeVoxelScript(code, true);
      
      const centerBlock = voxels.find(v => 
        v.position[0] === 0 && v.position[1] === 10 && v.position[2] === 0
      );
      expect(centerBlock).toBeUndefined();
    });

    it('参数校验：负 majorR 应抛出错误', () => {
      const code = 'builder.torus(0, 10, 0, -5, 1, "stone");';
      expect(() => executeVoxelScript(code, true)).toThrow(/Invalid majorR/);
    });
  });

  describe('综合测试 - 曲面组合', () => {
    it('组合：穹顶 + 圆柱 = 圆塔', () => {
      const code = 'builder.cylinder(0, 0, 0, 5, 15, "stone_bricks", { hollow: true, wall: 1 }); builder.dome(0, 15, 0, 5, 5, "dark_oak_stairs");';
      const voxels = executeVoxelScript(code, true);
      
      expect(voxels.length).toBeGreaterThan(100);
      
      const towerBlocks = voxels.filter(v => v.position[1] < 15);
      expect(towerBlocks.length).toBeGreaterThan(0);
      
      const roofBlocks = voxels.filter(v => v.position[1] >= 15);
      expect(roofBlocks.length).toBeGreaterThan(0);
    });
  });
});
