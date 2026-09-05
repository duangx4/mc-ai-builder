/**
 * projection.test.js - 投影计算单元测试
 */

import { describe, it, expect } from 'vitest';
import { computeProjection, getLayerSlice, getBounds } from './projection.js';

describe('projection', () => {
  describe('computeProjection', () => {
    it('应该处理空数组', () => {
      const result = computeProjection([], 'top');
      expect(result).toEqual({ cells: [], width: 0, depth: 0, height: 0 });
    });

    it('应该过滤空气方块', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [1, 0, 0], type: 'air' },
        { position: [2, 0, 0], type: 'AIR' },
      ];
      const result = computeProjection(voxels, 'top');
      expect(result.cells).toHaveLength(1);
      expect(result.cells[0].type).toBe('stone');
    });

    it('应该正确计算俯视图（top）- 3×3×2 立方体', () => {
      const voxels = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 2; y++) {
          for (let z = 0; z < 3; z++) {
            voxels.push({ position: [x, y, z], type: 'stone' });
          }
        }
      }

      const result = computeProjection(voxels, 'top');
      expect(result.width).toBe(3);
      expect(result.depth).toBe(3);
      expect(result.height).toBe(2);
      expect(result.cells).toHaveLength(9); // 3×3 格子
    });

    it('应该正确计算俯视图（top）- 取最高方块', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [0, 1, 0], type: 'dirt' },
        { position: [0, 2, 0], type: 'grass_block' },
        { position: [1, 0, 0], type: 'stone' },
      ];

      const result = computeProjection(voxels, 'top');
      expect(result.cells).toHaveLength(2);

      const cell00 = result.cells.find(c => c.x === 0 && c.y === 0);
      expect(cell00.type).toBe('grass_block'); // 最高的方块

      const cell10 = result.cells.find(c => c.x === 1 && c.y === 0);
      expect(cell10.type).toBe('stone');
    });

    it('应该正确计算正视图（front）- 3×2×3', () => {
      const voxels = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 2; y++) {
          for (let z = 0; z < 3; z++) {
            voxels.push({ position: [x, y, z], type: 'stone' });
          }
        }
      }

      const result = computeProjection(voxels, 'front');
      expect(result.width).toBe(3);
      expect(result.depth).toBe(2); // 高度映射到 depth
      expect(result.cells).toHaveLength(6); // 3×2 格子
    });

    it('应该正确计算正视图（front）- 取最前方块（z最大）', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [0, 0, 1], type: 'dirt' },
        { position: [0, 0, 2], type: 'grass_block' },
        { position: [1, 0, 0], type: 'stone' },
      ];

      const result = computeProjection(voxels, 'front');
      expect(result.cells).toHaveLength(2);

      const cell00 = result.cells.find(c => c.x === 0 && c.y === 0);
      expect(cell00.type).toBe('grass_block'); // z=2 最前
    });

    it('应该正确计算侧视图（side）- 3×2×3', () => {
      const voxels = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 2; y++) {
          for (let z = 0; z < 3; z++) {
            voxels.push({ position: [x, y, z], type: 'stone' });
          }
        }
      }

      const result = computeProjection(voxels, 'side');
      expect(result.width).toBe(3); // depth 映射到 width
      expect(result.depth).toBe(2); // 高度映射到 depth
      expect(result.cells).toHaveLength(6); // 3×2 格子
    });

    it('应该正确计算侧视图（side）- 取最右方块（x最大）', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [1, 0, 0], type: 'dirt' },
        { position: [2, 0, 0], type: 'grass_block' },
        { position: [0, 1, 0], type: 'stone' },
      ];

      const result = computeProjection(voxels, 'side');
      expect(result.cells).toHaveLength(2);

      const cell00 = result.cells.find(c => c.x === 0 && c.y === 0);
      expect(cell00.type).toBe('grass_block'); // x=2 最右
    });

    it('应该处理带台阶差异的建筑', () => {
      const voxels = [
        // 底层 3×3
        { position: [0, 0, 0], type: 'stone' },
        { position: [1, 0, 0], type: 'stone' },
        { position: [2, 0, 0], type: 'stone' },
        { position: [0, 0, 1], type: 'stone' },
        { position: [1, 0, 1], type: 'stone' },
        { position: [2, 0, 1], type: 'stone' },
        { position: [0, 0, 2], type: 'stone' },
        { position: [1, 0, 2], type: 'stone' },
        { position: [2, 0, 2], type: 'stone' },
        // 第二层少一块
        { position: [0, 1, 0], type: 'brick' },
        { position: [1, 1, 0], type: 'brick' },
        // [2, 1, 0] 缺失
        { position: [0, 1, 1], type: 'brick' },
        { position: [1, 1, 1], type: 'brick' },
        { position: [2, 1, 1], type: 'brick' },
      ];

      const result = computeProjection(voxels, 'top');
      expect(result.cells).toHaveLength(9);

      // (2, 0) 位置应该取底层的 stone（因为上层缺失）
      const cell20 = result.cells.find(c => c.x === 2 && c.y === 0);
      expect(cell20.type).toBe('stone');

      // (0, 0) 位置应该取第二层的 brick
      const cell00 = result.cells.find(c => c.x === 0 && c.y === 0);
      expect(cell00.type).toBe('brick');
    });

    it('应该抛出错误当方向无效', () => {
      const voxels = [{ position: [0, 0, 0], type: 'stone' }];
      expect(() => computeProjection(voxels, 'invalid')).toThrow();
    });
  });

  describe('getLayerSlice', () => {
    it('应该返回空切片当数组为空', () => {
      const result = getLayerSlice([], 0);
      expect(result).toEqual({ cells: [], width: 0, depth: 0 });
    });

    it('应该返回空切片当指定层无方块', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [1, 0, 0], type: 'stone' },
      ];
      const result = getLayerSlice(voxels, 5);
      expect(result).toEqual({ cells: [], width: 0, depth: 0 });
    });

    it('应该正确返回指定层的切片', () => {
      const voxels = [
        // y=0 层
        { position: [0, 0, 0], type: 'stone' },
        { position: [1, 0, 0], type: 'stone' },
        { position: [2, 0, 0], type: 'stone' },
        // y=1 层
        { position: [0, 1, 0], type: 'brick' },
        { position: [1, 1, 0], type: 'brick' },
        // y=2 层
        { position: [0, 2, 0], type: 'dirt' },
      ];

      const result = getLayerSlice(voxels, 1);
      expect(result.cells).toHaveLength(2);
      expect(result.width).toBe(2);
      expect(result.cells.every(c => c.type === 'brick')).toBe(true);
    });

    it('应该过滤空气方块', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [1, 0, 0], type: 'air' },
        { position: [2, 0, 0], type: 'stone' },
      ];

      const result = getLayerSlice(voxels, 0);
      expect(result.cells).toHaveLength(2);
      expect(result.cells.every(c => c.type !== 'air')).toBe(true);
    });
  });

  describe('getBounds', () => {
    it('应该返回零边界当数组为空', () => {
      const result = getBounds([]);
      expect(result).toEqual({
        minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0,
        width: 0, height: 0, depth: 0
      });
    });

    it('应该正确计算边界', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [5, 10, 3], type: 'stone' },
        { position: [2, 5, 1], type: 'stone' },
      ];

      const result = getBounds(voxels);
      expect(result.minX).toBe(0);
      expect(result.maxX).toBe(5);
      expect(result.minY).toBe(0);
      expect(result.maxY).toBe(10);
      expect(result.minZ).toBe(0);
      expect(result.maxZ).toBe(3);
      expect(result.width).toBe(6);
      expect(result.height).toBe(11);
      expect(result.depth).toBe(4);
    });

    it('应该过滤空气方块', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [100, 100, 100], type: 'air' },
        { position: [2, 2, 2], type: 'stone' },
      ];

      const result = getBounds(voxels);
      expect(result.maxX).toBe(2); // 不应该包含 air 的 100
      expect(result.maxY).toBe(2);
      expect(result.maxZ).toBe(2);
    });
  });
});
