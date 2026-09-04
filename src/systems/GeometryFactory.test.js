/**
 * 几何体工厂测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import GeometryFactory from './GeometryFactory.js';

describe('GeometryFactory', () => {
    afterEach(() => {
        // 清理缓存
        GeometryFactory.clearCache();
    });

    describe('getGeometry', () => {
        it('应该返回几何体', async () => {
            const geometry = await GeometryFactory.getGeometry('stone', {}, '1.20.1');

            expect(geometry).toBeDefined();
            expect(geometry.attributes.position).toBeDefined();
        });

        it('应该缓存几何体', async () => {
            const geo1 = await GeometryFactory.getGeometry('stone', {}, '1.20.1');
            const geo2 = await GeometryFactory.getGeometry('stone', {}, '1.20.1');

            // 应该返回克隆，不是同一个对象
            expect(geo1).not.toBe(geo2);
            // 但属性应该相同
            expect(geo1.attributes.position.count).toBe(geo2.attributes.position.count);
        });

        it('应该处理不同版本', async () => {
            const geo1 = await GeometryFactory.getGeometry('stone', {}, '1.20.1');
            const geo2 = await GeometryFactory.getGeometry('stone', {}, '1.19.4');

            expect(geo1).toBeDefined();
            expect(geo2).toBeDefined();
        });
    });

    describe('isCrossPlant', () => {
        it('应该识别十字植物', () => {
            expect(GeometryFactory.isCrossPlant('poppy')).toBe(true);
            expect(GeometryFactory.isCrossPlant('dandelion')).toBe(true);
            expect(GeometryFactory.isCrossPlant('grass')).toBe(true);
            expect(GeometryFactory.isCrossPlant('fern')).toBe(true);
        });

        it('应该排除非植物', () => {
            expect(GeometryFactory.isCrossPlant('stone')).toBe(false);
            expect(GeometryFactory.isCrossPlant('dirt')).toBe(false);
            expect(GeometryFactory.isCrossPlant('oak_planks')).toBe(false);
        });
    });

    describe('isFlatBlock', () => {
        it('应该识别扁平方块', () => {
            expect(GeometryFactory.isFlatBlock('redstone_wire')).toBe(true);
            expect(GeometryFactory.isFlatBlock('rail')).toBe(true);
            expect(GeometryFactory.isFlatBlock('carpet')).toBe(true);
            expect(GeometryFactory.isFlatBlock('lily_pad')).toBe(true);
        });

        it('应该排除普通方块', () => {
            expect(GeometryFactory.isFlatBlock('stone')).toBe(false);
            expect(GeometryFactory.isFlatBlock('dirt')).toBe(false);
        });
    });

    describe('mergeGeometries', () => {
        it('应该合并多个几何体', async () => {
            const THREE = await import('three');
            const geo1 = new THREE.BoxGeometry(1, 1, 1);
            const geo2 = new THREE.BoxGeometry(1, 1, 1);

            const merged = GeometryFactory.mergeGeometries([geo1, geo2]);

            expect(merged).toBeDefined();
            expect(merged.attributes.position).toBeDefined();
            // 两个立方体，每个 24 个顶点（6面 × 4顶点）
            expect(merged.attributes.position.count).toBeGreaterThan(24);
        });

        it('应该处理空数组', () => {
            const merged = GeometryFactory.mergeGeometries([]);
            expect(merged).toBeDefined();
            expect(merged.attributes.position).toBeUndefined();
        });

        it('应该处理单个几何体', async () => {
            const THREE = await import('three');
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const merged = GeometryFactory.mergeGeometries([geo]);

            expect(merged).toBe(geo);
        });
    });
});
