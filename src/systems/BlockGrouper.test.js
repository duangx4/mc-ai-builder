/**
 * 方块分组器测试
 */

import { describe, it, expect } from 'vitest';
import { groupByBlockType } from './BlockGrouper.js';

describe('BlockGrouper', () => {
    describe('groupByBlockType', () => {
        it('应该按方块类型分组', () => {
            const blocks = [
                { type: 'stone', position: [0, 0, 0] },
                { type: 'stone', position: [1, 0, 0] },
                { type: 'dirt', position: [2, 0, 0] }
            ];

            const groups = groupByBlockType(blocks);

            expect(groups).toHaveLength(2);
            expect(groups[0].blockType).toBe('stone');
            expect(groups[0].blocks).toHaveLength(2);
            expect(groups[1].blockType).toBe('dirt');
            expect(groups[1].blocks).toHaveLength(1);
        });

        it('应该处理空数组', () => {
            const groups = groupByBlockType([]);
            expect(groups).toHaveLength(0);
        });

        it('应该处理 null/undefined', () => {
            expect(groupByBlockType(null)).toHaveLength(0);
            expect(groupByBlockType(undefined)).toHaveLength(0);
        });

        it('应该清理方块类型（移除属性后缀）', () => {
            const blocks = [
                { type: 'oak_fence[north=true,south=false]', position: [0, 0, 0] },
                { type: 'oak_fence[north=false,south=true]', position: [1, 0, 0] }
            ];

            const groups = groupByBlockType(blocks);

            expect(groups).toHaveLength(1);
            expect(groups[0].blockType).toBe('oak_fence');
            expect(groups[0].blocks).toHaveLength(2);
        });

        it('应该生成正确的签名', () => {
            const blocks = [
                { type: 'stone', position: [0, 0, 0] }
            ];

            const groups = groupByBlockType(blocks);

            expect(groups[0].signature).toBe('simple:stone');
        });

        it('应该处理大小写', () => {
            const blocks = [
                { type: 'Stone', position: [0, 0, 0] },
                { type: 'STONE', position: [1, 0, 0] }
            ];

            const groups = groupByBlockType(blocks);

            expect(groups).toHaveLength(1);
            expect(groups[0].blockType).toBe('stone');
        });

        it('应该保持方块顺序', () => {
            const blocks = [
                { type: 'stone', position: [0, 0, 0] },
                { type: 'stone', position: [1, 0, 0] },
                { type: 'stone', position: [2, 0, 0] }
            ];

            const groups = groupByBlockType(blocks);

            expect(groups[0].blocks[0].position).toEqual([0, 0, 0]);
            expect(groups[0].blocks[1].position).toEqual([1, 0, 0]);
            expect(groups[0].blocks[2].position).toEqual([2, 0, 0]);
        });

        it('应该处理多种方块类型', () => {
            const blocks = [
                { type: 'stone', position: [0, 0, 0] },
                { type: 'dirt', position: [1, 0, 0] },
                { type: 'grass_block', position: [2, 0, 0] },
                { type: 'oak_planks', position: [3, 0, 0] }
            ];

            const groups = groupByBlockType(blocks);

            expect(groups).toHaveLength(4);
            const types = groups.map(g => g.blockType);
            expect(types).toContain('stone');
            expect(types).toContain('dirt');
            expect(types).toContain('grass_block');
            expect(types).toContain('oak_planks');
        });
    });
});
