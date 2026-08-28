/**
 * parser.js 单元测试
 * 测试 VoxelBuilder 代码片段的指令解析
 */
import { describe, it, expect } from 'vitest';
import { parseAIOutput } from '../parser.js';

describe('parser.js - parseAIOutput', () => {
  it('应该解析单个方块格式：[<x,y,z>, block_name, properties]', () => {
    const text = '[<0,0,0>, stone, 0]';
    const blocks = parseAIOutput(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      position: [0, 0, 0],
      type: 'stone',
      properties: '0'
    });
  });

  it('应该解析填充区域格式：[<x1,y1,z1><x2,y2,z2>, block_name, properties]', () => {
    const text = '[<0,0,0><2,0,2>, grass_block, 0]';
    const blocks = parseAIOutput(text);
    
    // 3x1x3 = 9 个方块
    expect(blocks.length).toBe(9);
    expect(blocks.every(b => b.type === 'grass_block')).toBe(true);
    expect(blocks.every(b => b.properties === '0')).toBe(true);
  });

  it('应该解析语义格式（无 properties）：[<x,y,z>, TYPE]', () => {
    const text = '[<5,10,5>, WALL]';
    const blocks = parseAIOutput(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      position: [5, 10, 5],
      type: 'WALL',
      properties: '0'
    });
  });

  it('应该解析语义填充格式：[<x1,y1,z1><x2,y2,z2>, TYPE]', () => {
    const text = '[<0,0,0><1,2,1>, FLOOR]';
    const blocks = parseAIOutput(text);
    
    // 2x3x2 = 12 个方块
    expect(blocks.length).toBe(12);
    expect(blocks.every(b => b.type === 'FLOOR')).toBe(true);
  });

  it('应该解析多个混合格式的指令', () => {
    const text = `
      [<0,0,0>, stone, 0]
      [<1,0,0><3,0,0>, dirt, 0]
      [<10,10,10>, PILLAR]
    `;
    const blocks = parseAIOutput(text);
    
    // 1 (stone) + 3 (dirt fill) + 1 (PILLAR) = 5
    expect(blocks.length).toBe(5);
    
    const stoneBlock = blocks.find(b => b.type === 'stone');
    expect(stoneBlock).toBeDefined();
    expect(stoneBlock.position).toEqual([0, 0, 0]);
    
    const pillarBlock = blocks.find(b => b.type === 'PILLAR');
    expect(pillarBlock).toBeDefined();
    expect(pillarBlock.position).toEqual([10, 10, 10]);
  });

  it('应该处理负坐标', () => {
    const text = '[<-5,-10,-5>, bedrock, 0]';
    const blocks = parseAIOutput(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0].position).toEqual([-5, -10, -5]);
  });

  it('应该忽略无效文本', () => {
    const text = 'This is just some random text without blocks';
    const blocks = parseAIOutput(text);
    
    expect(blocks).toEqual([]);
  });

  it('应该处理带有 properties 的方块', () => {
    const text = '[<0,1,0>, oak_door, facing=north,half=lower]';
    const blocks = parseAIOutput(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'oak_door',
      properties: 'facing=north,half=lower'
    });
  });

  it('应该解析无 properties 的普通方块格式', () => {
    const text = '[<0,0,0>, cobblestone]';
    const blocks = parseAIOutput(text);
    
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({
      type: 'cobblestone',
      properties: '0'
    });
  });
});
