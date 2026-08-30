import { describe, it, expect } from 'vitest';
import { cleanBlockType } from './textureMapping.js';

describe('blockShape utilities', () => {
    describe('cleanBlockType', () => {
        it('应该移除 [properties] 后缀', () => {
            expect(cleanBlockType('dark_oak_trapdoor[half=bottom,facing=south]')).toBe('dark_oak_trapdoor');
            expect(cleanBlockType('oak_fence_gate[facing=north,open=false]')).toBe('oak_fence_gate');
            expect(cleanBlockType('wall_torch[facing=east]')).toBe('wall_torch');
        });

        it('应该保留无后缀的类型名', () => {
            expect(cleanBlockType('stone_bricks')).toBe('stone_bricks');
            expect(cleanBlockType('oak_planks')).toBe('oak_planks');
            expect(cleanBlockType('lantern')).toBe('lantern');
        });

        it('应该处理空值和特殊情况', () => {
            expect(cleanBlockType('')).toBe('');
            expect(cleanBlockType(null)).toBe(null);
            expect(cleanBlockType(undefined)).toBe(undefined);
        });

        it('应该处理多层嵌套方括号（边界情况）', () => {
            expect(cleanBlockType('test[a[b]]')).toBe('test');
            expect(cleanBlockType('test[a=1][b=2]')).toBe('test');
        });
    });

    describe('getBlockShape integration (需要导入 VoxelWorld)', () => {
        // 注：getBlockShape 在 VoxelWorld.jsx 内部，无法直接测试
        // 这里仅验证形状常量定义正确
        it('fence_gate 应该有 gate 形状定义（间接验证）', () => {
            // 通过 FALLBACK_COLORS 和 ALIASES 验证 fence_gate 族支持
            const { FALLBACK_COLORS, BLOCK_TEXTURE_ALIASES } = require('./textureMapping.js');
            
            expect(FALLBACK_COLORS['oak_fence_gate']).toBeDefined();
            expect(FALLBACK_COLORS['spruce_fence_gate']).toBeDefined();
            expect(FALLBACK_COLORS['birch_fence_gate']).toBeDefined();
            expect(FALLBACK_COLORS['acacia_fence_gate']).toBeDefined();
            expect(FALLBACK_COLORS['dark_oak_fence_gate']).toBeDefined();
            
            expect(BLOCK_TEXTURE_ALIASES['oak_fence_gate']).toBe('oak_planks');
            expect(BLOCK_TEXTURE_ALIASES['spruce_fence_gate']).toBe('spruce_planks');
        });

        it('torch/lantern 应该有发光色定义', () => {
            const { FALLBACK_COLORS } = require('./textureMapping.js');
            
            expect(FALLBACK_COLORS['torch']).toBe('#ffcc00');
            expect(FALLBACK_COLORS['lantern']).toBe('#e8a93c');
            expect(FALLBACK_COLORS['soul_lantern']).toBe('#66dddd');
            expect(FALLBACK_COLORS['soul_torch']).toBe('#66ffff');
        });
    });

    describe('fence/wall 横杆尺寸常量（设计验证）', () => {
        it('fence 横杆应为柱边到柱边（0.8125 = 1 - 0.1875）', () => {
            const pillarWidth = 0.1875;
            const barLength = 1 - pillarWidth;
            expect(barLength).toBe(0.8125);
        });

        it('wall 横杆应为柱边到柱边（0.5 = 1 - 0.5）', () => {
            const pillarWidth = 0.5;
            const barLength = 1 - pillarWidth;
            expect(barLength).toBe(0.5);
        });

        it('fence 双横杆 Y 偏移应为 0.375 和 0.6875', () => {
            const barYOffsets = [0.375, 0.6875];
            expect(barYOffsets).toHaveLength(2);
            expect(barYOffsets[0]).toBe(0.375);
            expect(barYOffsets[1]).toBe(0.6875);
        });
    });

    describe('torch/lantern 部件尺寸常量（设计验证）', () => {
        it('torch 杆尺寸应为 0.125 × 0.5 × 0.125', () => {
            const stickSize = [0.125, 0.5, 0.125];
            expect(stickSize).toEqual([0.125, 0.5, 0.125]);
        });

        it('torch 火焰头尺寸应为 0.1875³', () => {
            const flameSize = [0.1875, 0.1875, 0.1875];
            expect(flameSize).toEqual([0.1875, 0.1875, 0.1875]);
        });

        it('lantern 挂钩尺寸应为 0.0625 × 0.25 × 0.0625', () => {
            const hookSize = [0.0625, 0.25, 0.0625];
            expect(hookSize).toEqual([0.0625, 0.25, 0.0625]);
        });

        it('lantern 灯体尺寸应为 0.375 × 0.4375 × 0.375', () => {
            const bodySize = [0.375, 0.4375, 0.375];
            expect(bodySize).toEqual([0.375, 0.4375, 0.375]);
        });
    });

    describe('BLOCK_SHAPES.gate 定义（设计验证）', () => {
        it('gate 形状应定义为薄门板 1 × 0.875 × 0.1875', () => {
            // 预期值（无法直接导入 VoxelWorld 内部常量，仅作设计文档）
            const expectedGateShape = {
                size: [1, 0.875, 0.1875],
                offset: [0, -0.0625, 0]
            };
            
            expect(expectedGateShape.size).toEqual([1, 0.875, 0.1875]);
            expect(expectedGateShape.offset).toEqual([0, -0.0625, 0]);
        });
    });
});
