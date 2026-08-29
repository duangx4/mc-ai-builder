/**
 * 投影工具单元测试
 */
import { describe, it, expect } from 'vitest';
import { computeProjection, computeTopProjection, computeFrontProjection, computeSideProjection, getLayerSlice } from './projection';

describe('投影计算工具', () => {
  describe('computeTopProjection - 俯视图', () => {
    it('空数组返回空投影', () => {
      const result = computeTopProjection([]);
      expect(result.cells).toEqual([]);
      expect(result.width).toBe(0);
      expect(result.depth).toBe(0);
      expect(result.height).toBe(0);
    });

    it('3×3×2 立方体（全 stone）返回正确俯视图', () => {
      const voxels = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 2; y++) {
          for (let z = 0; z < 3; z++) {
            voxels.push({ position: [x, y, z], type: 'stone' });
          }
        }
      }

      const result = computeTopProjection(voxels);
      
      expect(result.width).toBe(3);
      expect(result.depth).toBe(3);
      expect(result.height).toBe(2);
      expect(result.cells.length).toBe(9); // 3×3 网格
      
      // 每个格子都应该取 y=1 的方块（最高层）
      result.cells.forEach(cell => {
        expect(cell.type).toBe('stone');
        expect(cell.y).toBe(1); // 最高 y
      });
    });

    it('带台阶差异：底层缺一块时，取最高层正确', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [0, 1, 0], type: 'stone' },
        { position: [1, 0, 0], type: 'stone' },
        // [1, 1, 0] 缺失，导致 (1,0) 位置最高为 y=0
      ];

      const result = computeTopProjection(voxels);
      
      expect(result.cells.length).toBe(2);
      
      const cell_0_0 = result.cells.find(c => c.x === 0 && c.z === 0);
      const cell_1_0 = result.cells.find(c => c.x === 1 && c.z === 0);
      
      expect(cell_0_0.y).toBe(1); // 有两层，取最高
      expect(cell_1_0.y).toBe(0); // 只有一层
    });

    it('过滤 AIR 方块', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [0, 1, 0], type: 'AIR' }, // 应被过滤
      ];

      const result = computeTopProjection(voxels);
      
      expect(result.cells.length).toBe(1);
      expect(result.cells[0].type).toBe('stone');
      expect(result.cells[0].y).toBe(0);
    });
  });

  describe('computeFrontProjection - 正视图', () => {
    it('空数组返回空投影', () => {
      const result = computeFrontProjection([]);
      expect(result.cells).toEqual([]);
    });

    it('3×2×3 立方体返回正确正视图（3×2 网格）', () => {
      const voxels = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 2; y++) {
          for (let z = 0; z < 3; z++) {
            voxels.push({ position: [x, y, z], type: 'stone' });
          }
        }
      }

      const result = computeFrontProjection(voxels);
      
      expect(result.width).toBe(3);
      expect(result.height).toBe(2);
      expect(result.depth).toBe(3);
      expect(result.cells.length).toBe(6); // 3×2 网格
      
      // 每个格子都应该取 z=2 的方块（最前）
      result.cells.forEach(cell => {
        expect(cell.type).toBe('stone');
        expect(cell.z).toBe(2); // 最大 z
      });
    });

    it('多层深度时，取最前（z 最大）', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'dirt' },
        { position: [0, 0, 1], type: 'grass' },
        { position: [0, 0, 2], type: 'stone' },
      ];

      const result = computeFrontProjection(voxels);
      
      expect(result.cells.length).toBe(1);
      expect(result.cells[0].type).toBe('stone'); // z=2 最大
      expect(result.cells[0].z).toBe(2);
    });
  });

  describe('computeSideProjection - 侧视图', () => {
    it('空数组返回空投影', () => {
      const result = computeSideProjection([]);
      expect(result.cells).toEqual([]);
    });

    it('3×2×3 立方体返回正确侧视图（3×2 网格）', () => {
      const voxels = [];
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 2; y++) {
          for (let z = 0; z < 3; z++) {
            voxels.push({ position: [x, y, z], type: 'stone' });
          }
        }
      }

      const result = computeSideProjection(voxels);
      
      expect(result.width).toBe(3);
      expect(result.height).toBe(2);
      expect(result.depth).toBe(3);
      expect(result.cells.length).toBe(6); // 3×2 网格 (depth × height)
      
      // 每个格子都应该取 x=2 的方块（最右）
      result.cells.forEach(cell => {
        expect(cell.type).toBe('stone');
        expect(cell.x).toBe(2); // 最大 x
      });
    });
  });

  describe('getLayerSlice - 层切片', () => {
    it('空数组返回空切片', () => {
      const result = getLayerSlice([], 0);
      expect(result.cells).toEqual([]);
    });

    it('获取指定层的所有方块', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
        { position: [1, 0, 0], type: 'dirt' },
        { position: [0, 1, 0], type: 'grass' },
        { position: [1, 1, 0], type: 'wood' },
      ];

      const layer0 = getLayerSlice(voxels, 0);
      expect(layer0.cells.length).toBe(2);
      expect(layer0.cells.some(c => c.type === 'stone')).toBe(true);
      expect(layer0.cells.some(c => c.type === 'dirt')).toBe(true);

      const layer1 = getLayerSlice(voxels, 1);
      expect(layer1.cells.length).toBe(2);
      expect(layer1.cells.some(c => c.type === 'grass')).toBe(true);
      expect(layer1.cells.some(c => c.type === 'wood')).toBe(true);
    });

    it('不存在的层返回空数组', () => {
      const voxels = [
        { position: [0, 0, 0], type: 'stone' },
      ];

      const result = getLayerSlice(voxels, 99);
      expect(result.cells.length).toBe(0);
    });
  });

  describe('computeProjection - 统一接口', () => {
    it('direction="top" 调用俯视图', () => {
      const voxels = [{ position: [0, 0, 0], type: 'stone' }];
      const result = computeProjection(voxels, 'top');
      expect(result.cells.length).toBeGreaterThan(0);
    });

    it('direction="front" 调用正视图', () => {
      const voxels = [{ position: [0, 0, 0], type: 'stone' }];
      const result = computeProjection(voxels, 'front');
      expect(result.cells.length).toBeGreaterThan(0);
    });

    it('direction="side" 调用侧视图', () => {
      const voxels = [{ position: [0, 0, 0], type: 'stone' }];
      const result = computeProjection(voxels, 'side');
      expect(result.cells.length).toBeGreaterThan(0);
    });

    it('未知方向抛出异常', () => {
      const voxels = [{ position: [0, 0, 0], type: 'stone' }];
      expect(() => computeProjection(voxels, 'invalid')).toThrow();
    });
  });

  describe('边界情况', () => {
    it('处理无效的 position 数据', () => {
      const voxels = [
        { position: null, type: 'stone' },
        { position: [0], type: 'stone' },
        { position: [0, 'invalid', 0], type: 'stone' },
        { position: [0, 0, 0], type: 'stone' }, // 唯一有效
      ];

      const result = computeTopProjection(voxels);
      expect(result.cells.length).toBe(1);
      expect(result.cells[0].type).toBe('stone');
    });

    it('处理负坐标', () => {
      const voxels = [
        { position: [-1, 0, -1], type: 'stone' },
        { position: [0, 0, 0], type: 'dirt' },
        { position: [1, 0, 1], type: 'grass' },
      ];

      const result = computeTopProjection(voxels);
      expect(result.cells.length).toBe(3);
      expect(result.width).toBe(3); // -1 到 1 = 3 格
      expect(result.depth).toBe(3);
    });
  });
});
