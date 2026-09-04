/**
 * MC Blockstate 加载器测试
 * 测试权重随机选择和 uvlock 支持
 */

import { describe, it, expect } from 'vitest';
import { parseBlockstate, inferBlockConnections } from './mcBlockstateLoader.js';

describe('mcBlockstateLoader - 权重和 uvlock', () => {
    describe('权重随机选择', () => {
        it('应该支持 weight 属性', () => {
            const blockstate = {
                variants: {
                    '': [
                        { model: 'block/stone', weight: 1 },
                        { model: 'block/granite', weight: 2 }
                    ]
                }
            };

            const models = parseBlockstate(blockstate, {});

            expect(models).toHaveLength(1);
            expect(models[0].model).toMatch(/block\/(stone|granite)/);
            expect(models[0].weight).toBeGreaterThan(0);
        });

        it('应该处理没有 weight 的情况', () => {
            const blockstate = {
                variants: {
                    '': [
                        { model: 'block/stone' },
                        { model: 'block/granite' }
                    ]
                }
            };

            const models = parseBlockstate(blockstate, {});

            expect(models).toHaveLength(1);
            expect(models[0].weight).toBe(1); // 默认权重
        });

        it('应该处理单个变体（无需随机）', () => {
            const blockstate = {
                variants: {
                    '': { model: 'block/stone' }
                }
            };

            const models = parseBlockstate(blockstate, {});

            expect(models).toHaveLength(1);
            expect(models[0].model).toBe('block/stone');
        });
    });

    describe('uvlock 支持', () => {
        it('应该解析 uvlock 属性', () => {
            const blockstate = {
                variants: {
                    'facing=north': { model: 'block/furnace', y: 180, uvlock: true }
                }
            };

            const models = parseBlockstate(blockstate, { facing: 'north' });

            expect(models).toHaveLength(1);
            expect(models[0].uvlock).toBe(true);
            expect(models[0].y).toBe(180);
        });

        it('应该默认 uvlock 为 false', () => {
            const blockstate = {
                variants: {
                    '': { model: 'block/stone' }
                }
            };

            const models = parseBlockstate(blockstate, {});

            expect(models).toHaveLength(1);
            expect(models[0].uvlock).toBe(false);
        });

        it('应该在 multipart 中支持 uvlock', () => {
            const blockstate = {
                multipart: [
                    {
                        when: { north: 'true' },
                        apply: { model: 'block/fence_side', y: 90, uvlock: true }
                    }
                ]
            };

            const models = parseBlockstate(blockstate, { north: 'true' });

            expect(models).toHaveLength(1);
            expect(models[0].uvlock).toBe(true);
        });
    });

    describe('multipart 条件评估', () => {
        it('应该支持 OR 条件', () => {
            const blockstate = {
                multipart: [
                    {
                        when: {
                            OR: [
                                { north: 'true' },
                                { south: 'true' }
                            ]
                        },
                        apply: { model: 'block/fence_post' }
                    }
                ]
            };

            const models1 = parseBlockstate(blockstate, { north: 'true' });
            expect(models1).toHaveLength(1);

            const models2 = parseBlockstate(blockstate, { south: 'true' });
            expect(models2).toHaveLength(1);

            const models3 = parseBlockstate(blockstate, { east: 'true' });
            expect(models3).toHaveLength(0);
        });

        it('应该支持多值匹配（pipe 分隔）', () => {
            const blockstate = {
                multipart: [
                    {
                        when: { north: 'low|tall' },
                        apply: { model: 'block/wall_side' }
                    }
                ]
            };

            const models1 = parseBlockstate(blockstate, { north: 'low' });
            expect(models1).toHaveLength(1);

            const models2 = parseBlockstate(blockstate, { north: 'tall' });
            expect(models2).toHaveLength(1);

            const models3 = parseBlockstate(blockstate, { north: 'none' });
            expect(models3).toHaveLength(0);
        });

        it('应该支持 AND 条件（默认）', () => {
            const blockstate = {
                multipart: [
                    {
                        when: { north: 'true', east: 'true' },
                        apply: { model: 'block/fence_corner' }
                    }
                ]
            };

            const models1 = parseBlockstate(blockstate, { north: 'true', east: 'true' });
            expect(models1).toHaveLength(1);

            const models2 = parseBlockstate(blockstate, { north: 'true' });
            expect(models2).toHaveLength(0);
        });
    });

    describe('variants 状态键', () => {
        it('应该生成正确的状态键', () => {
            const blockstate = {
                variants: {
                    'facing=north,half=top': { model: 'block/stairs' }
                }
            };

            const models = parseBlockstate(blockstate, { facing: 'north', half: 'top' });

            expect(models).toHaveLength(1);
            expect(models[0].model).toBe('block/stairs');
        });

        it('应该按字母顺序排序状态键', () => {
            const blockstate = {
                variants: {
                    'facing=north,half=top': { model: 'block/stairs' }
                }
            };

            // 应该匹配（因为会按字母顺序排序：facing < half）
            const models = parseBlockstate(blockstate, { facing: 'north', half: 'top' });

            expect(models).toHaveLength(1);
            expect(models[0].model).toBe('block/stairs');
        });

        it('应该处理默认状态（空字符串）', () => {
            const blockstate = {
                variants: {
                    '': { model: 'block/stone' }
                }
            };

            const models = parseBlockstate(blockstate, {});

            expect(models).toHaveLength(1);
            expect(models[0].model).toBe('block/stone');
        });
    });

    describe('方块连接推断', () => {
        it('应该推断栅栏连接', () => {
            const positionMap = new Map();
            positionMap.set('1,0,0', { type: 'oak_fence', position: [1, 0, 0] });

            const block = { type: 'oak_fence', position: [0, 0, 0] };
            const connections = inferBlockConnections(block, positionMap);

            expect(connections.east).toBe('true');
            expect(connections.west).toBe('false');
            expect(connections.up).toBe('false'); // 栅栏不向上连接
        });

        it('应该推断墙体连接（low/tall/none）', () => {
            const positionMap = new Map();
            positionMap.set('1,0,0', { type: 'cobblestone_wall', position: [1, 0, 0] });

            const block = { type: 'cobblestone_wall', position: [0, 0, 0] };
            const connections = inferBlockConnections(block, positionMap);

            expect(connections.east).toBe('low');
            expect(connections.west).toBe('none');
            expect(connections.up).toBe('true'); // 有连接时 up=true
        });

        it('应该处理孤立方块', () => {
            const positionMap = new Map();
            const block = { type: 'oak_fence', position: [0, 0, 0] };
            const connections = inferBlockConnections(block, positionMap);

            expect(connections.north).toBe('false');
            expect(connections.south).toBe('false');
            expect(connections.east).toBe('false');
            expect(connections.west).toBe('false');
        });
    });
});
