import { describe, it, expect } from 'vitest';
import { partitionPlan, diffBlocks, mergeBlockCodes, extractBlockCode } from './partitionEngine.js';

describe('partitionPlan', () => {
  it('should not subdivide small buildings', () => {
    const plan = {
      blocks: [{
        id: 'small_house',
        name: 'small house',
        position: [0, 0, 0],
        size: [10, 8, 10],
        materials: ['oak_planks'],
        notes: 'simple house'
      }]
    };

    const tasks = partitionPlan(plan, { maxBlockSize: 24 });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].id).toBe('small_house');
    expect(tasks[0].depth).toBe(0);
  });

  it('should subdivide large blocks recursively', () => {
    const plan = {
      blocks: [{
        id: 'large_wall',
        name: 'long wall',
        position: [0, 0, 0],
        size: [50, 10, 5],
        materials: ['stone_bricks']
      }]
    };

    const tasks = partitionPlan(plan, { maxBlockSize: 24, maxDepth: 2 });
    expect(tasks.length).toBeGreaterThan(1);
    const childTasks = tasks.filter(t => t.parent === 'large_wall');
    expect(childTasks.length).toBeGreaterThan(0);
  });

  it('should respect maxDepth limit', () => {
    const plan = {
      blocks: [{
        id: 'tower',
        name: 'tall tower',
        position: [0, 0, 0],
        size: [10, 100, 10],
        materials: ['stone']
      }]
    };

    const tasks = partitionPlan(plan, { maxBlockSize: 24, maxDepth: 1 });
    const maxDepth = Math.max(...tasks.map(t => t.depth));
    expect(maxDepth).toBeLessThanOrEqual(1);
  });

  it('should create 2-6 children per subdivision', () => {
    const plan = {
      blocks: [{
        id: 'bridge',
        name: 'long bridge',
        position: [0, 0, 0],
        size: [100, 5, 5],
        materials: ['oak_planks']
      }]
    };

    const tasks = partitionPlan(plan, { maxBlockSize: 24, maxDepth: 1 });
    // When subdivided, children are at depth 1, not depth 0
    const childTasks = tasks.filter(t => t.parent === 'bridge');
    expect(childTasks.length).toBeGreaterThanOrEqual(2);
    expect(childTasks.length).toBeLessThanOrEqual(6);
  });

  it('should cover parent volume precisely', () => {
    const plan = {
      blocks: [{
        id: 'hall',
        name: 'main hall',
        position: [0, 0, 0],
        size: [30, 15, 30],
        materials: ['stone_bricks']
      }]
    };

    const tasks = partitionPlan(plan, { maxBlockSize: 24, maxDepth: 1 });
    const childTasks = tasks.filter(t => t.depth === 1);
    
    if (childTasks.length > 0) {
      const totalVolume = childTasks.reduce((sum, task) => {
        const [w, h, d] = task.size;
        return sum + (w * h * d);
      }, 0);
      expect(totalVolume).toBe(30 * 15 * 30);
    }
  });

  it('should handle empty input', () => {
    expect(partitionPlan(null)).toEqual([]);
    expect(partitionPlan({})).toEqual([]);
    expect(partitionPlan({ blocks: [] })).toEqual([]);
  });
});

describe('diffBlocks', () => {
  it('should skip unchanged blocks', () => {
    const prev = [{ id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] }];
    const next = [{ id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] }];
    const diff = diffBlocks(prev, next);
    
    expect(diff.skip).toHaveLength(1);
    expect(diff.rebuild).toHaveLength(0);
    expect(diff.create).toHaveLength(0);
  });

  it('should detect position changes', () => {
    const prev = [{ id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] }];
    const next = [{ id: 'b1', position: [5, 0, 0], size: [10, 10, 10], materials: ['stone'] }];
    const diff = diffBlocks(prev, next);
    
    expect(diff.rebuild).toHaveLength(1);
  });

  it('should detect size changes', () => {
    const prev = [{ id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] }];
    const next = [{ id: 'b1', position: [0, 0, 0], size: [15, 10, 10], materials: ['stone'] }];
    const diff = diffBlocks(prev, next);
    
    expect(diff.rebuild).toHaveLength(1);
  });

  it('should detect material changes', () => {
    const prev = [{ id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] }];
    const next = [{ id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['wood'] }];
    const diff = diffBlocks(prev, next);
    
    expect(diff.rebuild).toHaveLength(1);
  });

  it('should detect new blocks', () => {
    const prev = [{ id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] }];
    const next = [
      { id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] },
      { id: 'b2', position: [20, 0, 0], size: [10, 10, 10], materials: ['wood'] }
    ];
    const diff = diffBlocks(prev, next);
    
    expect(diff.create).toHaveLength(1);
    expect(diff.create[0].id).toBe('b2');
  });

  it('should detect removed blocks', () => {
    const prev = [
      { id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] },
      { id: 'b2', position: [20, 0, 0], size: [10, 10, 10], materials: ['wood'] }
    ];
    const next = [{ id: 'b1', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] }];
    const diff = diffBlocks(prev, next);
    
    expect(diff.remove).toHaveLength(1);
    expect(diff.remove[0].id).toBe('b2');
  });

  it('should handle complex scenarios', () => {
    const prev = [
      { id: 'unchanged', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] },
      { id: 'modified', position: [20, 0, 0], size: [10, 10, 10], materials: ['wood'] },
      { id: 'removed', position: [40, 0, 0], size: [10, 10, 10], materials: ['dirt'] }
    ];
    const next = [
      { id: 'unchanged', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] },
      { id: 'modified', position: [20, 0, 0], size: [15, 10, 10], materials: ['wood'] },
      { id: 'new', position: [60, 0, 0], size: [10, 10, 10], materials: ['glass'] }
    ];
    const diff = diffBlocks(prev, next);
    
    expect(diff.skip).toHaveLength(1);
    expect(diff.rebuild).toHaveLength(1);
    expect(diff.create).toHaveLength(1);
    expect(diff.remove).toHaveLength(1);
  });

  it('should handle empty inputs', () => {
    expect(diffBlocks([], []).skip).toHaveLength(0);
  });
});

describe('mergeBlockCodes', () => {
  it('should merge multiple block codes', () => {
    const blockResults = [
      { id: 'block1', code: 'builder.set(0, 0, 0, "stone");', success: true },
      { id: 'block2', code: 'builder.set(10, 0, 0, "wood");', success: true }
    ];

    const result = mergeBlockCodes(blockResults, { skipValidation: true });

    expect(result.code).toContain('// BLOCK block1 START');
    expect(result.code).toContain('// BLOCK block1 END');
    expect(result.code).toContain('// BLOCK block2 START');
    expect(result.code).toContain('// BLOCK block2 END');
    expect(result.code).toContain('builder.set(0, 0, 0, "stone")');
    expect(result.code).toContain('builder.set(10, 0, 0, "wood")');
  });

  it('should filter out failed blocks', () => {
    const blockResults = [
      { id: 'block1', code: 'builder.set(0, 0, 0, "stone");', success: true },
      { id: 'block2', code: 'invalid code', success: false, error: 'syntax error' },
      { id: 'block3', code: 'builder.set(20, 0, 0, "glass");', success: true }
    ];

    const result = mergeBlockCodes(blockResults, { skipValidation: true });

    expect(result.code).toContain('BLOCK block1');
    expect(result.code).toContain('BLOCK block3');
    expect(result.code).not.toContain('BLOCK block2');
  });

  it('should handle empty block results', () => {
    const result = mergeBlockCodes([]);

    expect(result.code).toBe('');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.valid).toBe(false);
  });

  it('should validate merged code when not skipped', () => {
    const blockResults = [
      { id: 'block1', code: 'builder.set(0, 0, 0, "stone");', success: true }
    ];

    const result = mergeBlockCodes(blockResults, { skipValidation: false });

    expect(result.valid).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it('should detect invalid code during validation', () => {
    const blockResults = [
      { id: 'block1', code: 'builder.invalidMethod();', success: true }
    ];

    const result = mergeBlockCodes(blockResults, { skipValidation: false });

    expect(result.valid).toBe(false);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should deduplicate top-level const declarations', () => {
    const blockResults = [
      { id: 'block1', code: 'const WALL_MAT = "stone";\nbuilder.set(0, 0, 0, WALL_MAT);', success: true },
      { id: 'block2', code: 'const WALL_MAT = "stone";\nbuilder.set(10, 0, 0, WALL_MAT);', success: true }
    ];

    const result = mergeBlockCodes(blockResults, { skipValidation: true });

    // Count occurrences of "const WALL_MAT"
    const matches = (result.code.match(/const WALL_MAT/g) || []);
    expect(matches.length).toBe(1); // Should be deduplicated to 1
  });

  it('should preserve old block code when provided', () => {
    const oldCode = `// BLOCK oldBlock START
builder.set(5, 5, 5, "dirt");
// BLOCK oldBlock END`;

    const blockResults = [
      { id: 'newBlock', code: 'builder.set(0, 0, 0, "stone");', success: true }
    ];

    const result = mergeBlockCodes(blockResults, { skipValidation: true, oldCode });

    expect(result.code).toContain('BLOCK oldBlock START');
    expect(result.code).toContain('builder.set(5, 5, 5, "dirt")');
    expect(result.code).toContain('BLOCK newBlock START');
  });

  it('should handle duplicate block IDs', () => {
    const blockResults = [
      { id: 'block1', code: 'builder.set(0, 0, 0, "stone");', success: true },
      { id: 'block1', code: 'builder.set(1, 1, 1, "wood");', success: true }
    ];

    const result = mergeBlockCodes(blockResults, { skipValidation: true });

    expect(result.warnings.some(w => w.includes('Duplicate'))).toBe(true);
  });
});

describe('extractBlockCode', () => {
  it('should extract block code with markers', () => {
    const code = `// BLOCK test START
builder.set(0, 0, 0, "stone");
// BLOCK test END`;

    const extracted = extractBlockCode(code, 'test');

    expect(extracted).toContain('// BLOCK test START');
    expect(extracted).toContain('// BLOCK test END');
    expect(extracted).toContain('builder.set');
  });

  it('should return null for missing markers', () => {
    const code = 'builder.set(0, 0, 0, "stone");';

    expect(extractBlockCode(code, 'test')).toBe(null);
  });

  it('should return null for invalid inputs', () => {
    expect(extractBlockCode(null, 'test')).toBe(null);
    expect(extractBlockCode('code', null)).toBe(null);
    expect(extractBlockCode('', '')).toBe(null);
  });
});
