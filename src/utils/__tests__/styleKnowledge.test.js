/**
 * styleKnowledge.js 单元测试
 * 测试风格检测逻辑
 */
import { describe, it, expect } from 'vitest';
import { detectStyle, getAvailableStyles } from '../styleKnowledge.js';

describe('styleKnowledge.js - detectStyle', () => {
  it('应该检测中式古典风格关键词', () => {
    const result = detectStyle('建造一个中式古典的宫殿');
    
    expect(result).not.toBeNull();
    expect(result.key).toBe('chinese_classical');
    expect(result.name).toContain('中式');
    expect(result.knowledge).toBeTruthy();
  });

  it('应该检测唐风关键词', () => {
    const result = detectStyle('我想要唐风建筑');
    
    expect(result).not.toBeNull();
    expect(result.key).toBe('chinese_classical');
  });

  it('应该检测日式神社关键词', () => {
    const result = detectStyle('build a Japanese shrine');
    
    expect(result).not.toBeNull();
    expect(result.key).toBe('japanese_shrine');
    expect(result.name).toContain('神社');
  });

  it('应该检测鸟居关键词', () => {
    const result = detectStyle('我想要一个鸟居');
    
    expect(result).not.toBeNull();
    expect(result.key).toBe('japanese_shrine');
  });

  it('应该检测日式民居关键词', () => {
    const result = detectStyle('建造日式小屋');
    
    expect(result).not.toBeNull();
    expect(result.key).toBe('japanese_vernacular');
    expect(result.name).toContain('民居');
  });

  it('应该检测雕像关键词', () => {
    const result = detectStyle('make a statue of a dragon');
    
    expect(result).not.toBeNull();
    expect(result.key).toBe('type_statue');
    expect(result.name).toContain('雕像');
  });

  it('应该检测载具关键词', () => {
    const result = detectStyle('build a spaceship');
    
    expect(result).not.toBeNull();
    expect(result.key).toBe('type_vehicle');
    expect(result.name).toContain('载具');
  });

  it('未匹配到风格时应返回 null', () => {
    const result = detectStyle('just build something random');
    
    expect(result).toBeNull();
  });

  it('空字符串应返回 null', () => {
    const result = detectStyle('');
    
    expect(result).toBeNull();
  });

  it('应该不区分大小写', () => {
    const result1 = detectStyle('CHINESE CLASSICAL');
    const result2 = detectStyle('chinese classical');
    
    expect(result1).toEqual(result2);
    expect(result1).not.toBeNull();
  });

  it('应该检测部分匹配（关键词在句子中间）', () => {
    const result = detectStyle('I want to create a beautiful 神社 in the forest');
    
    expect(result).not.toBeNull();
    expect(result.key).toBe('japanese_shrine');
  });
});

describe('styleKnowledge.js - getAvailableStyles', () => {
  it('应该返回所有可用风格列表', () => {
    const styles = getAvailableStyles();
    
    expect(Array.isArray(styles)).toBe(true);
    expect(styles.length).toBeGreaterThan(0);
    
    // 每个风格应包含 key, name, keywords
    styles.forEach(style => {
      expect(style).toHaveProperty('key');
      expect(style).toHaveProperty('name');
      expect(style).toHaveProperty('keywords');
      expect(Array.isArray(style.keywords)).toBe(true);
    });
  });

  it('应该包含特殊结构类型风格', () => {
    const styles = getAvailableStyles();
    const keys = styles.map(s => s.key);
    
    expect(keys).toContain('type_statue');
    expect(keys).toContain('type_vehicle');
    expect(keys).toContain('type_landscape');
  });

  it('应该包含日式风格', () => {
    const styles = getAvailableStyles();
    const keys = styles.map(s => s.key);
    
    expect(keys).toContain('japanese_shrine');
    expect(keys).toContain('japanese_vernacular');
  });
});
