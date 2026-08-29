import { describe, it, expect } from 'vitest';
import {
  getTextureBasePath,
  getFaceTextureNames,
  resolveBlockTextures,
  BLOCK_TEXTURE_ALIASES,
  FALLBACK_COLORS,
  GLOW_BLOCKS,
  WATER_BLOCKS
} from './textureMapping';

describe('纹理映射工具', () => {
  describe('getTextureBasePath - 版本化路径', () => {
    it('1.20.1 版本应返回正确路径', () => {
      expect(getTextureBasePath('1.20.1')).toBe('/minecraft-1.20.1/textures/block/');
    });

    it('1.21 版本应返回默认路径', () => {
      expect(getTextureBasePath('1.21')).toBe('/minecraft/textures/block/');
    });

    it('未知版本应兜底到 1.21 路径', () => {
      expect(getTextureBasePath('1.19.4')).toBe('/minecraft/textures/block/');
      expect(getTextureBasePath('unknown')).toBe('/minecraft/textures/block/');
    });
  });

  describe('getFaceTextureNames - 分面纹理规则', () => {
    it('oak_log 应返回侧面和顶底面纹理', () => {
      const result = getFaceTextureNames('oak_log');
      expect(result).toEqual({
        side: 'oak_log',
        top: 'oak_log_top',
        bottom: 'oak_log_top'
      });
    });

    it('grass_block 应返回三个不同的面', () => {
      const result = getFaceTextureNames('grass_block');
      expect(result).toEqual({
        side: 'grass_block_side',
        top: 'grass_block_top',
        bottom: 'dirt'
      });
    });

    it('stone 应返回三面同图', () => {
      const result = getFaceTextureNames('stone');
      expect(result).toEqual({
        side: 'stone',
        top: 'stone',
        bottom: 'stone'
      });
    });

    it('_log 族应自动匹配分面规则', () => {
      const logs = ['spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log'];
      logs.forEach(log => {
        const result = getFaceTextureNames(log);
        expect(result.side).toBe(log);
        expect(result.top).toBe(log + '_top');
        expect(result.bottom).toBe(log + '_top');
      });
    });

    it('剥皮原木应返回正确分面', () => {
      const result = getFaceTextureNames('stripped_oak_log');
      expect(result).toEqual({
        side: 'stripped_oak_log',
        top: 'stripped_oak_log_top',
        bottom: 'stripped_oak_log_top'
      });
    });

    it('菌柄应返回正确分面', () => {
      const crimson = getFaceTextureNames('crimson_stem');
      expect(crimson).toEqual({
        side: 'crimson_stem',
        top: 'crimson_stem_top',
        bottom: 'crimson_stem_top'
      });

      const warped = getFaceTextureNames('warped_stem');
      expect(warped).toEqual({
        side: 'warped_stem',
        top: 'warped_stem_top',
        bottom: 'warped_stem_top'
      });
    });

    it('mycelium 应返回正确分面', () => {
      const result = getFaceTextureNames('mycelium');
      expect(result).toEqual({
        side: 'mycelium_side',
        top: 'mycelium_top',
        bottom: 'dirt'
      });
    });

    it('podzol 应返回正确分面', () => {
      const result = getFaceTextureNames('podzol');
      expect(result).toEqual({
        side: 'podzol_side',
        top: 'podzol_top',
        bottom: 'dirt'
      });
    });

    it('farmland 应返回正确分面', () => {
      const result = getFaceTextureNames('farmland');
      expect(result).toEqual({
        side: 'dirt',
        top: 'farmland',
        bottom: 'dirt'
      });
    });

    it('basalt 应返回正确分面', () => {
      const result = getFaceTextureNames('basalt');
      expect(result).toEqual({
        side: 'basalt_side',
        top: 'basalt_top',
        bottom: 'basalt_top'
      });
    });

    it('ancient_debris 应返回正确分面', () => {
      const result = getFaceTextureNames('ancient_debris');
      expect(result).toEqual({
        side: 'ancient_debris_side',
        top: 'ancient_debris_top',
        bottom: 'ancient_debris_top'
      });
    });

    it('bamboo_block 应返回正确分面', () => {
      const result = getFaceTextureNames('bamboo_block');
      expect(result).toEqual({
        side: 'bamboo_block',
        top: 'bamboo_block_top',
        bottom: 'bamboo_block_top'
      });
    });
  });

  describe('BLOCK_TEXTURE_ALIASES - 别名映射', () => {
    it('应保留现有别名：oak_door', () => {
      expect(BLOCK_TEXTURE_ALIASES['oak_door']).toBe('oak_door_bottom');
    });

    it('应保留现有别名：cobble', () => {
      expect(BLOCK_TEXTURE_ALIASES['cobble']).toBe('cobblestone');
    });

    it('应保留现有别名：planks', () => {
      expect(BLOCK_TEXTURE_ALIASES['planks']).toBe('oak_planks');
    });

    it('deepslate 系列别名应存在', () => {
      expect(BLOCK_TEXTURE_ALIASES['deepslate_bricks']).toBe('deepslate_bricks');
      expect(BLOCK_TEXTURE_ALIASES['polished_deepslate']).toBe('polished_deepslate');
      expect(BLOCK_TEXTURE_ALIASES['deepslate_tiles']).toBe('deepslate_tiles');
    });

    it('warped 和 crimson planks 应存在', () => {
      expect(BLOCK_TEXTURE_ALIASES['warped_planks']).toBe('warped_planks');
      expect(BLOCK_TEXTURE_ALIASES['crimson_planks']).toBe('crimson_planks');
    });
  });

  describe('FALLBACK_COLORS - 兜底颜色', () => {
    it('未知方块应返回 default 颜色', () => {
      expect(FALLBACK_COLORS['unknown_block_xyz']).toBeUndefined();
      expect(FALLBACK_COLORS['default']).toBe('#888888');
    });

    it('oak_planks 应有兜底颜色', () => {
      expect(FALLBACK_COLORS['oak_planks']).toBe('#b8945f');
    });

    it('stone 应有兜底颜色', () => {
      expect(FALLBACK_COLORS['stone']).toBe('#8a8a8a');
    });

    it('glass 应有兜底颜色', () => {
      expect(FALLBACK_COLORS['glass']).toBe('#c0e8f8');
    });
  });

  describe('GLOW_BLOCKS - 发光方块列表', () => {
    it('应包含常见发光方块', () => {
      expect(GLOW_BLOCKS).toContain('glowstone');
      expect(GLOW_BLOCKS).toContain('lantern');
      expect(GLOW_BLOCKS).toContain('sea_lantern');
      expect(GLOW_BLOCKS).toContain('magma_block');
      expect(GLOW_BLOCKS).toContain('shroomlight');
    });

    it('列表不应为空', () => {
      expect(GLOW_BLOCKS.length).toBeGreaterThan(0);
    });

    it('列表不应有重复项', () => {
      const unique = [...new Set(GLOW_BLOCKS)];
      expect(unique.length).toBe(GLOW_BLOCKS.length);
    });

    it('列表不应有空条目', () => {
      expect(GLOW_BLOCKS.every(b => b && b.trim().length > 0)).toBe(true);
    });
  });

  describe('WATER_BLOCKS - 水方块列表', () => {
    it('应包含水相关方块', () => {
      expect(WATER_BLOCKS).toContain('water');
      expect(WATER_BLOCKS).toContain('flowing_water');
      expect(WATER_BLOCKS).toContain('kelp');
      expect(WATER_BLOCKS).toContain('seagrass');
    });

    it('列表不应为空', () => {
      expect(WATER_BLOCKS.length).toBeGreaterThan(0);
    });

    it('列表不应有重复项', () => {
      const unique = [...new Set(WATER_BLOCKS)];
      expect(unique.length).toBe(WATER_BLOCKS.length);
    });

    it('列表不应有空条目', () => {
      expect(WATER_BLOCKS.every(b => b && b.trim().length > 0)).toBe(true);
    });

    it('GLOW_BLOCKS 和 WATER_BLOCKS 不应有重复', () => {
      const overlap = GLOW_BLOCKS.filter(b => WATER_BLOCKS.includes(b));
      expect(overlap.length).toBe(0);
    });
  });

  describe('resolveBlockTextures - 综合解析', () => {
    it('oak_log 应返回完整纹理信息（含分面和兜底色）', () => {
      const result = resolveBlockTextures('oak_log', '1.20.1');
      expect(result.side).toBe('oak_log');
      expect(result.top).toBe('oak_log_top');
      expect(result.bottom).toBe('oak_log_top');
      expect(result.fallbackColor).toBe('#6b4423');
    });

    it('grass_block 应返回完整纹理信息', () => {
      const result = resolveBlockTextures('grass_block', '1.20.1');
      expect(result.side).toBe('grass_block_side');
      expect(result.top).toBe('grass_block_top');
      expect(result.bottom).toBe('dirt');
      expect(result.fallbackColor).toBeDefined();
    });

    it('stone 应返回三面同图', () => {
      const result = resolveBlockTextures('stone', '1.20.1');
      expect(result.side).toBe('stone');
      expect(result.top).toBe('stone');
      expect(result.bottom).toBe('stone');
      expect(result.fallbackColor).toBe('#8a8a8a');
    });

    it('oak_door 应通过别名解析', () => {
      const result = resolveBlockTextures('oak_door', '1.20.1');
      expect(result.side).toBe('oak_door_bottom');
      expect(result.top).toBe('oak_door_bottom');
      expect(result.bottom).toBe('oak_door_bottom');
    });

    it('未知方块应返回 default 兜底色', () => {
      const result = resolveBlockTextures('unknown_block_xyz', '1.20.1');
      expect(result.fallbackColor).toBe('#888888');
    });

    it('大小写不敏感', () => {
      const lower = resolveBlockTextures('oak_log', '1.20.1');
      const upper = resolveBlockTextures('OAK_LOG', '1.20.1');
      const mixed = resolveBlockTextures('Oak_Log', '1.20.1');

      expect(lower).toEqual(upper);
      expect(lower).toEqual(mixed);
    });

    it('版本参数默认为 1.20.1', () => {
      const withVersion = resolveBlockTextures('stone', '1.20.1');
      const withoutVersion = resolveBlockTextures('stone');

      expect(withVersion).toEqual(withoutVersion);
    });
  });
});
