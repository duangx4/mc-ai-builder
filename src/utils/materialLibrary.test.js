/**
 * 材质库测试 (Material Library Tests)
 */

import { describe, it, expect } from 'vitest';
import { MATERIAL_LIBRARY, MATERIAL_CATEGORIES } from './materialLibrary.js';

describe('materialLibrary', () => {
  describe('MATERIAL_LIBRARY', () => {
    it('应该至少包含 1300 个材质条目', () => {
      expect(MATERIAL_LIBRARY.length).toBeGreaterThanOrEqual(1300);
    });

    it('所有 ID 应该唯一', () => {
      const ids = MATERIAL_LIBRARY.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('每个条目应该有必需字段', () => {
      MATERIAL_LIBRARY.forEach(material => {
        expect(material).toHaveProperty('id');
        expect(material).toHaveProperty('name');
        expect(material).toHaveProperty('category');
        expect(material).toHaveProperty('tags');
        expect(material).toHaveProperty('version');
        expect(typeof material.id).toBe('string');
        expect(typeof material.name).toBe('string');
        expect(typeof material.category).toBe('string');
        expect(Array.isArray(material.tags)).toBe(true);
        expect(typeof material.version).toBe('string');
      });
    });

    it('应该包含主流方块 ID', () => {
      const ids = MATERIAL_LIBRARY.map(m => m.id);
      const mustHaveBlocks = [
        'oak_planks',
        'stone_bricks',
        'white_concrete',
        'glass',
        'iron_block',
        'redstone_block',
        'dirt',
        'cobblestone',
        'spruce_log',
        'black_wool'
      ];

      mustHaveBlocks.forEach(blockId => {
        expect(ids).toContain(blockId);
      });
    });

    it('木材类应该包含所有木材种类', () => {
      const woods = MATERIAL_LIBRARY.filter(m => m.category === 'woods');
      const woodTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 
                        'dark_oak', 'mangrove', 'cherry', 'crimson', 'warped', 'bamboo'];
      
      woodTypes.forEach(woodType => {
        const hasWoodType = woods.some(w => w.id.includes(woodType));
        expect(hasWoodType).toBe(true);
      });
    });

    it('混凝土应该包含 16 色', () => {
      const concretes = MATERIAL_LIBRARY.filter(m => 
        m.category === 'concrete' && !m.id.includes('powder')
      );
      expect(concretes.length).toBeGreaterThanOrEqual(16);
    });

    it('羊毛应该包含 16 色', () => {
      const wools = MATERIAL_LIBRARY.filter(m => 
        m.category === 'wool' && m.id.endsWith('_wool')
      );
      expect(wools.length).toBe(16);
    });

    it('玻璃类应该包含透明标签', () => {
      const glasses = MATERIAL_LIBRARY.filter(m => m.category === 'glass');
      glasses.forEach(glass => {
        expect(glass.tags).toContain('transparent');
      });
    });
  });

  describe('MATERIAL_CATEGORIES', () => {
    it('应该至少包含 10 个类别', () => {
      expect(MATERIAL_CATEGORIES.length).toBeGreaterThanOrEqual(10);
    });

    it('应该包含核心类别', () => {
      const categoryIds = MATERIAL_CATEGORIES.map(c => c.id);
      const coreCategories = ['woods', 'stones', 'concrete', 'wool', 'glass', 'metals', 'natural'];
      
      coreCategories.forEach(cat => {
        expect(categoryIds).toContain(cat);
      });
    });

    it('每个类别应该有统计数据', () => {
      MATERIAL_CATEGORIES.forEach(cat => {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('name');
        expect(cat).toHaveProperty('count');
        expect(cat.count).toBeGreaterThan(0);
      });
    });

    it('类别统计应该与实际条目数匹配', () => {
      MATERIAL_CATEGORIES.forEach(cat => {
        const actualCount = MATERIAL_LIBRARY.filter(m => m.category === cat.id).length;
        expect(cat.count).toBe(actualCount);
      });
    });
  });

  describe('版本兼容性', () => {
    it('应该标记版本信息', () => {
      const versions = new Set(MATERIAL_LIBRARY.map(m => m.version));
      expect(versions.size).toBeGreaterThan(0);
      // 应该包含 1.21 或 1.20.1
      expect(versions.has('1.21') || versions.has('1.20.1')).toBe(true);
    });
  });
});
