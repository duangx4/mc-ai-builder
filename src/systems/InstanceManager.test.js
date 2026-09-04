/**
 * 实例管理器测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import InstanceManager from './InstanceManager.js';
import * as THREE from 'three';

describe('InstanceManager', () => {
    let geometry;
    let material;

    beforeEach(() => {
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    });

    describe('createInstancedMesh', () => {
        it('应该创建实例化 mesh', () => {
            const blocks = [
                { type: 'stone', position: [0, 0, 0] },
                { type: 'stone', position: [1, 0, 0] },
                { type: 'stone', position: [2, 0, 0] }
            ];

            const mesh = InstanceManager.createInstancedMesh(geometry, material, blocks);

            expect(mesh).toBeDefined();
            expect(mesh.isInstancedMesh).toBe(true);
            expect(mesh.count).toBe(3);
            expect(mesh.userData.blocks).toEqual(blocks);
        });

        it('应该处理空数组', () => {
            const mesh = InstanceManager.createInstancedMesh(geometry, material, []);
            expect(mesh).toBeNull();
        });

        it('应该设置正确的变换矩阵', () => {
            const blocks = [
                { type: 'stone', position: [5, 10, 15] }
            ];

            const mesh = InstanceManager.createInstancedMesh(geometry, material, blocks);

            const matrix = new THREE.Matrix4();
            mesh.getMatrixAt(0, matrix);

            const position = new THREE.Vector3();
            position.setFromMatrixPosition(matrix);

            expect(position.x).toBe(5);
            expect(position.y).toBe(10);
            expect(position.z).toBe(15);
        });
    });

    describe('updateInstance', () => {
        it('应该更新实例位置', () => {
            const blocks = [
                { type: 'stone', position: [0, 0, 0] }
            ];

            const mesh = InstanceManager.createInstancedMesh(geometry, material, blocks);

            InstanceManager.updateInstance(mesh, 0, [10, 20, 30]);

            const matrix = new THREE.Matrix4();
            mesh.getMatrixAt(0, matrix);

            const position = new THREE.Vector3();
            position.setFromMatrixPosition(matrix);

            expect(position.x).toBe(10);
            expect(position.y).toBe(20);
            expect(position.z).toBe(30);
        });

        it('应该处理无效索引', () => {
            const blocks = [
                { type: 'stone', position: [0, 0, 0] }
            ];

            const mesh = InstanceManager.createInstancedMesh(geometry, material, blocks);

            // 不应该抛出错误
            expect(() => {
                InstanceManager.updateInstance(mesh, 999, [10, 20, 30]);
            }).not.toThrow();
        });
    });

    describe('getInstancePosition', () => {
        it('应该获取实例位置', () => {
            const blocks = [
                { type: 'stone', position: [5, 10, 15] }
            ];

            const mesh = InstanceManager.createInstancedMesh(geometry, material, blocks);
            const position = InstanceManager.getInstancePosition(mesh, 0);

            expect(position.x).toBe(5);
            expect(position.y).toBe(10);
            expect(position.z).toBe(15);
        });
    });

    describe('removeInstance', () => {
        it('应该移除实例（通过缩放为0）', () => {
            const blocks = [
                { type: 'stone', position: [0, 0, 0] }
            ];

            const mesh = InstanceManager.createInstancedMesh(geometry, material, blocks);

            InstanceManager.removeInstance(mesh, 0);

            const matrix = new THREE.Matrix4();
            mesh.getMatrixAt(0, matrix);

            const scale = new THREE.Vector3();
            scale.setFromMatrixScale(matrix);

            expect(scale.x).toBe(0);
            expect(scale.y).toBe(0);
            expect(scale.z).toBe(0);
        });
    });

    describe('createSingleMesh', () => {
        it('应该创建单个 mesh', () => {
            const mesh = InstanceManager.createSingleMesh(geometry, material, [5, 10, 15]);

            expect(mesh).toBeDefined();
            expect(mesh.isInstancedMesh).toBeUndefined();
            expect(mesh.userData.isSingleMesh).toBe(true);
            expect(mesh.position.x).toBe(5);
            expect(mesh.position.y).toBe(10);
            expect(mesh.position.z).toBe(15);
        });
    });
});
