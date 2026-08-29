/**
 * 方块连接状态测试（inferConnections + validateBlockStates）
 */

import { describe, it, expect } from 'vitest';
import { inferConnections, validateBlockStates } from './blockConnections.js';

describe('inferConnections 栅栏/墙连接推断', () => {
  it('孤立 fence：全 false', () => {
    const blocks = [
      { position: [0, 10, 0], type: 'oak_fence' }
    ];
    const connections = inferConnections(blocks);
    
    const conn = connections.get('0,10,0');
    expect(conn).toBeDefined();
    expect(conn.n).toBe(false);
    expect(conn.s).toBe(false);
    expect(conn.e).toBe(false);
    expect(conn.w).toBe(false);
  });

  it('直排 3 个 fence：中间连接 n+s', () => {
    const blocks = [
      { position: [0, 10, 0], type: 'oak_fence' },
      { position: [0, 10, 1], type: 'oak_fence' },
      { position: [0, 10, 2], type: 'oak_fence' }
    ];
    const connections = inferConnections(blocks);
    
    const middle = connections.get('0,10,1');
    expect(middle).toBeDefined();
    expect(middle.n).toBe(true); // 连接到 z=0
    expect(middle.s).toBe(true); // 连接到 z=2
    expect(middle.e).toBe(false);
    expect(middle.w).toBe(false);
  });

  it('L 形 fence：角块连接 n+e', () => {
    const blocks = [
      { position: [0, 10, 0], type: 'oak_fence' }, // 角点
      { position: [0, 10, -1], type: 'oak_fence' }, // 北
      { position: [1, 10, 0], type: 'oak_fence' }  // 东
    ];
    const connections = inferConnections(blocks);
    
    const corner = connections.get('0,10,0');
    expect(corner).toBeDefined();
    expect(corner.n).toBe(true); // 连接到 z=-1
    expect(corner.s).toBe(false);
    expect(corner.e).toBe(true); // 连接到 x=1
    expect(corner.w).toBe(false);
  });

  it('wall 不连 fence（同族连接）', () => {
    const blocks = [
      { position: [0, 10, 0], type: 'oak_fence' },
      { position: [1, 10, 0], type: 'cobblestone_wall' }
    ];
    const connections = inferConnections(blocks);
    
    const fence = connections.get('0,10,0');
    expect(fence).toBeDefined();
    expect(fence.e).toBe(false); // 不连 wall
    
    const wall = connections.get('1,10,0');
    expect(wall).toBeDefined();
    expect(wall.w).toBe(false); // 不连 fence
  });

  it('fence_gate 和 wall_banner 不参与连接', () => {
    const blocks = [
      { position: [0, 10, 0], type: 'oak_fence' },
      { position: [1, 10, 0], type: 'oak_fence_gate' }, // 应忽略
      { position: [0, 10, 1], type: 'wall_banner' }     // 应忽略（wall_ 前缀）
    ];
    const connections = inferConnections(blocks);
    
    // oak_fence 应该是孤立的（fence_gate 不算同族）
    const fence = connections.get('0,10,0');
    expect(fence).toBeDefined();
    expect(fence.e).toBe(false);
    expect(fence.s).toBe(false);
    
    // fence_gate 和 wall_banner 不应出现在连接表中
    expect(connections.has('1,10,0')).toBe(false);
    expect(connections.has('0,10,1')).toBe(false);
  });
});

describe('validateBlockStates 状态方块校验', () => {
  it('无 facing stairs 计数', () => {
    const blocks = [
      { position: [0, 10, 0], type: 'oak_stairs', properties: '' }, // 缺 facing
      { position: [1, 10, 0], type: 'oak_stairs', properties: 'facing=north,half=bottom' }, // 正常
      { position: [2, 10, 0], type: 'stone' } // 非台阶
    ];
    const result = validateBlockStates(blocks);
    
    expect(result.total).toBe(3);
    expect(result.noFacingStairs).toBe(1);
    expect(result.ok).toBe(false); // 有缺失
  });

  it('无 half slab 计数', () => {
    const blocks = [
      { position: [0, 10, 0], type: 'oak_slab', properties: '' }, // 缺 half
      { position: [1, 10, 0], type: 'oak_slab', properties: 'half=bottom' } // 正常
    ];
    const result = validateBlockStates(blocks);
    
    expect(result.total).toBe(2);
    expect(result.noHalfSlab).toBe(1);
    expect(result.ok).toBe(false);
  });

  it('全部正常时 ok=true', () => {
    const blocks = [
      { position: [0, 10, 0], type: 'oak_stairs', properties: 'facing=north,half=bottom' },
      { position: [1, 10, 0], type: 'oak_slab', properties: 'half=top' },
      { position: [2, 10, 0], type: 'stone' }
    ];
    const result = validateBlockStates(blocks);
    
    expect(result.noFacingStairs).toBe(0);
    expect(result.noHalfSlab).toBe(0);
    expect(result.ok).toBe(true);
  });

  it('全孤立 fence 不算错误（连接由渲染层推断）', () => {
    const blocks = [
      { position: [0, 10, 0], type: 'oak_fence', properties: '' },
      { position: [2, 10, 0], type: 'oak_fence', properties: '' }
    ];
    const result = validateBlockStates(blocks);
    
    expect(result.noConnFence).toBe(0); // 不作为校验项
    expect(result.ok).toBe(true); // 不影响 ok 状态
  });
});
