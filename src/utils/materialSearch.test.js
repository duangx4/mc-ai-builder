/**
 * 材质搜索测试 (Material Search Tests)
 */

import { describe, it, expect } from 'vitest';
import { 
  searchMaterial, 
  getMaterialsByCategory, 
  getMaterialsByTag,
  getRandomMaterials
} from './materialSearch.js';

describe('materialSearch', () => {
  describe('searchMaterial', () => {
    it('应该通过精确 ID 匹配返回结果', () => {
      const results = searchMaterial('oak_planks');
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('oak_planks');
    });

    it('应该通过 ID 前缀匹配返回结果', () => {
      const results = searchMaterial('oak');
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.id.includes('oak'))).toBe(true);
    });

    it('应该通过名称部分匹配返回结果', () => {
      const results = searchMaterial('concrete');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.id.includes('concrete') || r.name.toLowerCase().includes('concrete'))).toBe(true);
    });

    it('应该通过类别查询返回该类别的材质', () => {
      const results = searchMaterial('wool');
      expect(results.length).toBeGreaterThan(0);
      // 应该包含羊毛类材质
      expect(results.some(r => r.category === 'wool')).toBe(true);
    });

    it('空查询应该返回空数组', () => {
      expect(searchMaterial('')).toEqual([]);
      expect(searchMaterial('   ')).toEqual([]);
      expect(searchMaterial(null)).toEqual([]);
      expect(searchMaterial(undefined)).toEqual([]);
    });

    it('无结果查询应该返回空数组', () => {
      const results = searchMaterial('nonexistent_block_xyz_12345');
      expect(results).toEqual([]);
    });

    it('结果应该不超过 20 条', () => {
      const results = searchMaterial('stone');
      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('结果应该按匹配度排序', () => {
      const results = searchMaterial('stone');
      // 精确 ID 匹配应该排在前面
      if (results.length > 0) {
        const exactMatch = results.find(r => r.id === 'stone');
        if (exactMatch) {
          expect(results[0].id).toBe('stone');
        }
      }
    });

    it('应该不区分大小写', () => {
      const lower = searchMaterial('oak');
      const upper = searchMaterial('OAK');
      const mixed = searchMaterial('Oak');
      expect(lower.length).toBe(upper.length);
      expect(lower.length).toBe(mixed.length);
    });
  });

  describe('getMaterialsByCategory', () => {
    it('应该返回指定类别的材质', () => {
      const woods = getMaterialsByCategory('woods');
      expect(woods.length).toBeGreaterThan(0);
      expect(woods.every(m => m.category === 'woods')).toBe(true);
    });

    it('应该限制返回数量', () => {
      const materials = getMaterialsByCategory('woods', 5);
      expect(materials.length).toBeLessThanOrEqual(5);
    });

    it('应该不区分大小写', () => {
      const lower = getMaterialsByCategory('concrete');
      const upper = getMaterialsByCategory('CONCRETE');
      expect(lower.length).toBe(upper.length);
    });
  });

  describe('getMaterialsByTag', () => {
    it('应该返回包含指定标签的材质', () => {
      const building = getMaterialsByTag('building');
      expect(building.length).toBeGreaterThan(0);
      expect(building.every(m => m.tags.includes('building'))).toBe(true);
    });

    it('应该限制返回数量', () => {
      const materials = getMaterialsByTag('building', 10);
      expect(materials.length).toBeLessThanOrEqual(10);
    });
  });

  describe('getRandomMaterials', () => {
    it('应该返回指定数量的随机材质', () => {
      const materials = getRandomMaterials(5);
      expect(materials.length).toBe(5);
    });

    it('返回的材质应该有完整字段', () => {
      const materials = getRandomMaterials(3);
      materials.forEach(m => {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('name');
        expect(m).toHaveProperty('category');
        expect(m).toHaveProperty('tags');
      });
    });
  });
});
