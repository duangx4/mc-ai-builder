import { describe, it, expect } from 'vitest';
import { buildAdjacencyTable, validateSeams } from './adjacencyEngine.js';

describe('buildAdjacencyTable', () => {
  it('should return empty array for empty input', () => {
    expect(buildAdjacencyTable([])).toEqual([]);
  });

  it('should detect x-axis adjacent blocks', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10] },
      { id: 'b', position: [10, 0, 0], size: [10, 10, 10] }
    ];
    const table = buildAdjacencyTable(tasks);
    expect(table).toHaveLength(1);
    expect(table[0].axis).toBe('x');
    expect(table[0].gap).toBe(0);
  });

  it('should detect z-axis adjacent blocks', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10] },
      { id: 'b', position: [0, 0, 10], size: [10, 10, 10] }
    ];
    const table = buildAdjacencyTable(tasks);
    expect(table).toHaveLength(1);
    expect(table[0].axis).toBe('z');
  });

  it('should not detect diagonal adjacency', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10] },
      { id: 'b', position: [10, 10, 10], size: [10, 10, 10] }
    ];
    expect(buildAdjacencyTable(tasks)).toHaveLength(0);
  });

  it('should detect gap size', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10] },
      { id: 'b', position: [12, 0, 0], size: [10, 10, 10] }
    ];
    const table = buildAdjacencyTable(tasks);
    expect(table[0].gap).toBe(2);
  });

  it('should record height alignment', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10] },
      { id: 'b', position: [10, 0, 0], size: [10, 10, 10] }
    ];
    const table = buildAdjacencyTable(tasks);
    expect(table[0].aligned).toBe(true);
  });

  it('should detect misaligned heights', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10] },
      { id: 'b', position: [10, 0, 0], size: [10, 15, 10] }
    ];
    const table = buildAdjacencyTable(tasks);
    expect(table[0].aligned).toBe(false);
  });
});

describe('validateSeams', () => {
  it('should return empty for empty table', () => {
    const result = validateSeams([], {}, []);
    expect(result.issues).toHaveLength(0);
  });

  it('should detect no issues for perfect adjacency', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] },
      { id: 'b', position: [10, 0, 0], size: [10, 10, 10], materials: ['stone'] }
    ];
    const table = buildAdjacencyTable(tasks);
    const result = validateSeams(tasks, {}, table);
    expect(result.issues).toHaveLength(0);
  });

  it('should generate fill code for gaps', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] },
      { id: 'b', position: [12, 0, 0], size: [10, 10, 10], materials: ['stone'] }
    ];
    const table = buildAdjacencyTable(tasks);
    const result = validateSeams(tasks, {}, table);
    expect(result.issues[0].type).toBe('fixable');
    expect(result.fillCode).toContain('Fill gap');
  });

  it('should detect overlap as fatal', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10] },
      { id: 'b', position: [8, 0, 0], size: [10, 10, 10] }
    ];
    const table = buildAdjacencyTable(tasks);
    const result = validateSeams(tasks, {}, table);
    expect(result.issues.some(i => i.type === 'fatal')).toBe(true);
  });

  it('should warn about large gaps', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10] },
      { id: 'b', position: [15, 0, 0], size: [10, 10, 10] }
    ];
    const table = buildAdjacencyTable(tasks);
    const result = validateSeams(tasks, {}, table);
    expect(result.issues.some(i => i.type === 'warning')).toBe(true);
  });

  it('should generate level-up code', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] },
      { id: 'b', position: [10, 0, 0], size: [10, 12, 10], materials: ['stone'] }
    ];
    const table = buildAdjacencyTable(tasks);
    const result = validateSeams(tasks, {}, table);
    expect(result.fillCode).toContain('Level up');
  });

  it('should detect fatal for large height diff', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10] },
      { id: 'b', position: [10, 0, 0], size: [10, 20, 10] }
    ];
    const table = buildAdjacencyTable(tasks);
    const result = validateSeams(tasks, {}, table);
    expect(result.issues.some(i => i.type === 'fatal')).toBe(true);
  });

  it('should validate groundY', () => {
    const tasks = [
      { id: 'a', position: [0, 5, 0], size: [10, 10, 10] },
      { id: 'b', position: [10, 5, 0], size: [10, 10, 10] }
    ];
    const plan = { sections: { groundY: 0 } };
    const table = buildAdjacencyTable(tasks);
    const result = validateSeams(tasks, plan, table);
    expect(result.issues.filter(i => i.message.includes('groundY')).length).toBe(2);
  });

  it('should handle multiple pairs', () => {
    const tasks = [
      { id: 'a', position: [0, 0, 0], size: [10, 10, 10], materials: ['stone'] },
      { id: 'b', position: [12, 0, 0], size: [10, 10, 10], materials: ['stone'] },
      { id: 'c', position: [24, 0, 0], size: [10, 10, 10], materials: ['stone'] }
    ];
    const table = buildAdjacencyTable(tasks);
    expect(table).toHaveLength(2);
  });
});
