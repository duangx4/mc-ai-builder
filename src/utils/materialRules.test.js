/**
 * 材质规则测试 (Material Rules Tests)
 */

import { describe, it, expect } from 'vitest';
import { MATERIAL_RULES_TEXT, getCuratedMaterialsText, getFullMaterialRules } from './materialRules.js';

describe('materialRules', () => {
  describe('MATERIAL_RULES_TEXT', () => {
    it('应该包含材质一致性铁律文本', () => {
      expect(MATERIAL_RULES_TEXT).toBeTruthy();
      expect(MATERIAL_RULES_TEXT.length).toBeGreaterThan(100);
    });

    it('应该包含关键规则', () => {
      expect(MATERIAL_RULES_TEXT).toContain('一个主材质族');
      expect(MATERIAL_RULES_TEXT).toContain('确定性');
      expect(MATERIAL_RULES_TEXT).toContain('原版方块');
      expect(MATERIAL_RULES_TEXT).toContain('searchMaterial');
    });

    it('应该提及跨区块统一性', () => {
      expect(MATERIAL_RULES_TEXT).toContain('跨区块');
    });

    it('应该禁止随机混搭', () => {
      expect(MATERIAL_RULES_TEXT).toContain('禁止');
      expect(MATERIAL_RULES_TEXT).toContain('随机');
    });
  });

  describe('getCuratedMaterialsText', () => {
    it('应该返回精选材质速查文本', () => {
      const text = getCuratedMaterialsText();
      expect(text).toBeTruthy();
      expect(text.length).toBeGreaterThan(100);
    });

    it('应该包含主要类别', () => {
      const text = getCuratedMaterialsText();
      expect(text).toContain('woods');
      expect(text).toContain('stones');
      expect(text).toContain('concrete');
      expect(text).toContain('glass');
    });

    it('应该包含常用方块', () => {
      const text = getCuratedMaterialsText();
      expect(text).toContain('oak_planks');
      expect(text).toContain('stone_bricks');
      expect(text).toContain('white_concrete');
      expect(text).toContain('glass');
    });
  });

  describe('getFullMaterialRules', () => {
    it('应该返回完整规则（铁律 + 精选速查）', () => {
      const fullRules = getFullMaterialRules();
      expect(fullRules).toBeTruthy();
      expect(fullRules.length).toBeGreaterThan(MATERIAL_RULES_TEXT.length);
    });

    it('应该包含铁律和精选速查内容', () => {
      const fullRules = getFullMaterialRules();
      expect(fullRules).toContain('材质一致性铁律');
      expect(fullRules).toContain('常用材质速查');
    });
  });
});
