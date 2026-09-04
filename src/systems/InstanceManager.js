/**
 * 实例管理器
 * 管理实例化 mesh 的创建和更新
 */

import * as THREE from 'three';

/**
 * 实例管理器类
 */
class InstanceManager {
    /**
     * 创建实例化 mesh
     *
     * @param {THREE.BufferGeometry} geometry - 几何体
     * @param {THREE.Material} material - 材质
     * @param {Array} blocks - 方块数组
     * @returns {THREE.InstancedMesh}
     */
    static createInstancedMesh(geometry, material, blocks) {
        const count = blocks.length;

        if (count === 0) {
            console.warn('[InstanceManager] No blocks provided');
            return null;
        }

        const mesh = new THREE.InstancedMesh(geometry, material, count);

        // 设置每个实例的变换矩阵
        const matrix = new THREE.Matrix4();
        blocks.forEach((block, i) => {
            const [x, y, z] = block.position;
            matrix.makeTranslation(x, y, z);
            mesh.setMatrixAt(i, matrix);
        });

        mesh.instanceMatrix.needsUpdate = true;

        // 添加自定义数据（用于点击检测和调试）
        mesh.userData.blocks = blocks;
        mesh.userData.isInstancedMesh = true;
        mesh.userData.blockType = blocks[0]?.type || 'unknown';

        // 启用视锥剔除
        mesh.frustumCulled = true;

        // 计算边界球（用于视锥剔除）
        mesh.computeBoundingSphere();

        return mesh;
    }

    /**
     * 更新单个实例的位置
     *
     * @param {THREE.InstancedMesh} mesh - 实例化 mesh
     * @param {number} index - 实例索引
     * @param {Array} position - 新位置 [x, y, z]
     */
    static updateInstance(mesh, index, position) {
        if (!mesh || !mesh.isInstancedMesh) {
            console.warn('[InstanceManager] Invalid mesh');
            return;
        }

        if (index < 0 || index >= mesh.count) {
            console.warn('[InstanceManager] Invalid instance index:', index);
            return;
        }

        const matrix = new THREE.Matrix4();
        matrix.makeTranslation(...position);
        mesh.setMatrixAt(index, matrix);
        mesh.instanceMatrix.needsUpdate = true;

        // 更新边界球
        mesh.computeBoundingSphere();
    }

    /**
     * 批量更新实例位置
     *
     * @param {THREE.InstancedMesh} mesh - 实例化 mesh
     * @param {Array} updates - 更新列表 [{index, position}, ...]
     */
    static updateInstances(mesh, updates) {
        if (!mesh || !mesh.isInstancedMesh) {
            console.warn('[InstanceManager] Invalid mesh');
            return;
        }

        const matrix = new THREE.Matrix4();

        updates.forEach(({ index, position }) => {
            if (index >= 0 && index < mesh.count) {
                matrix.makeTranslation(...position);
                mesh.setMatrixAt(index, matrix);
            }
        });

        mesh.instanceMatrix.needsUpdate = true;
        mesh.computeBoundingSphere();
    }

    /**
     * 移除实例（通过设置缩放为 0）
     *
     * @param {THREE.InstancedMesh} mesh - 实例化 mesh
     * @param {number} index - 实例索引
     */
    static removeInstance(mesh, index) {
        if (!mesh || !mesh.isInstancedMesh) {
            console.warn('[InstanceManager] Invalid mesh');
            return;
        }

        if (index < 0 || index >= mesh.count) {
            console.warn('[InstanceManager] Invalid instance index:', index);
            return;
        }

        const matrix = new THREE.Matrix4();
        matrix.makeScale(0, 0, 0); // 缩放为 0 实现隐藏
        mesh.setMatrixAt(index, matrix);
        mesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * 设置实例颜色（需要 instanceColor 属性）
     *
     * @param {THREE.InstancedMesh} mesh - 实例化 mesh
     * @param {number} index - 实例索引
     * @param {THREE.Color} color - 颜色
     */
    static setInstanceColor(mesh, index, color) {
        if (!mesh || !mesh.isInstancedMesh) {
            console.warn('[InstanceManager] Invalid mesh');
            return;
        }

        // 如果没有 instanceColor 属性，创建它
        if (!mesh.instanceColor) {
            const colors = new Float32Array(mesh.count * 3);
            // 默认白色
            for (let i = 0; i < mesh.count; i++) {
                colors[i * 3] = 1;
                colors[i * 3 + 1] = 1;
                colors[i * 3 + 2] = 1;
            }
            mesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
        }

        mesh.instanceColor.setXYZ(index, color.r, color.g, color.b);
        mesh.instanceColor.needsUpdate = true;
    }

    /**
     * 获取实例的世界坐标
     *
     * @param {THREE.InstancedMesh} mesh - 实例化 mesh
     * @param {number} index - 实例索引
     * @returns {THREE.Vector3} 世界坐标
     */
    static getInstancePosition(mesh, index) {
        if (!mesh || !mesh.isInstancedMesh) {
            console.warn('[InstanceManager] Invalid mesh');
            return new THREE.Vector3();
        }

        const matrix = new THREE.Matrix4();
        mesh.getMatrixAt(index, matrix);

        const position = new THREE.Vector3();
        position.setFromMatrixPosition(matrix);

        return position;
    }

    /**
     * 创建单个 mesh（非实例化，用于特殊情况）
     *
     * @param {THREE.BufferGeometry} geometry - 几何体
     * @param {THREE.Material} material - 材质
     * @param {Array} position - 位置 [x, y, z]
     * @returns {THREE.Mesh}
     */
    static createSingleMesh(geometry, material, position) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(...position);
        mesh.userData.isSingleMesh = true;
        return mesh;
    }
}

export default InstanceManager;
