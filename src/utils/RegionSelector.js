import * as THREE from 'three';

/**
 * 区域选择工具（两次单击模式）
 * 用于在 3D 场景中框选特定区域（精确修改模式）
 * 交互方式：第一次点击设置起点，第二次点击设置终点
 */
export class RegionSelector {
  constructor(scene, camera, canvas) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;

    this.clickCount = 0; // 0: 未开始, 1: 已设置起点, 2: 已完成
    this.startPoint = null;
    this.endPoint = null;
    this.currentHoverPoint = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 选中区域的边界框
    this.selectionBox = null;
    this.boxHelper = null;

    // 预览框（第一次点击后，跟随鼠标）
    this.previewBox = null;
    this.previewHelper = null;

    // 回调函数
    this.onSelectionStart = null;
    this.onSelectionChange = null;
    this.onSelectionEnd = null;
  }

  /**
   * 启用区域选择
   */
  enable() {
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.style.cursor = 'crosshair';
    console.log('[RegionSelector] Enabled (two-click mode)');
  }

  /**
   * 禁用区域选择
   */
  disable() {
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.style.cursor = 'default';
    this.clearSelection();
    this.clearPreview();
    console.log('[RegionSelector] Disabled');
  }

  /**
   * 点击事件处理
   */
  handleClick = (event) => {
    const point = this.getWorldPoint(event);
    if (!point) return;

    if (this.clickCount === 0) {
      // 第一次点击：设置起点
      this.startPoint = point;
      this.clickCount = 1;

      if (this.onSelectionStart) {
        this.onSelectionStart(this.startPoint);
      }

      console.log('[RegionSelector] First click:', this.startPoint);
    } else if (this.clickCount === 1) {
      // 第二次点击：设置终点，完成选择
      this.endPoint = point;
      this.clickCount = 2;

      this.clearPreview();
      this.updateSelectionBox();

      if (this.onSelectionEnd) {
        this.onSelectionEnd(this.getSelectionBounds());
      }

      console.log('[RegionSelector] Second click:', this.endPoint);
      console.log('[RegionSelector] Selection completed');
    }
  }

  /**
   * 鼠标移动 - 更新预览框
   */
  handleMouseMove = (event) => {
    if (this.clickCount !== 1) return; // 只在第一次点击后才显示预览

    const point = this.getWorldPoint(event);
    if (!point) return;

    this.currentHoverPoint = point;
    this.updatePreviewBox();

    if (this.onSelectionChange) {
      this.onSelectionChange(this.getPreviewBounds());
    }
  }

  /**
   * 获取鼠标点击的世界坐标
   */
  getWorldPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 创建一个水平面用于投射（Y=0平面）
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectPoint);

    if (intersectPoint) {
      // 四舍五入到整数坐标（对齐方块网格）
      return new THREE.Vector3(
        Math.round(intersectPoint.x),
        Math.round(intersectPoint.y),
        Math.round(intersectPoint.z)
      );
    }

    return null;
  }

  /**
   * 更新预览框（第一次点击后，跟随鼠标）
   */
  updatePreviewBox() {
    if (!this.startPoint || !this.currentHoverPoint) return;

    // 清除旧的预览框
    if (this.previewBox) {
      this.scene.remove(this.previewBox);
      this.previewBox.geometry.dispose();
      this.previewBox.material.dispose();
    }
    if (this.previewHelper) {
      this.scene.remove(this.previewHelper);
      this.previewHelper.geometry.dispose();
      this.previewHelper.material.dispose();
    }

    // 计算边界框
    const minX = Math.min(this.startPoint.x, this.currentHoverPoint.x);
    const maxX = Math.max(this.startPoint.x, this.currentHoverPoint.x);
    const minY = Math.min(this.startPoint.y, this.currentHoverPoint.y);
    const maxY = Math.max(this.startPoint.y, this.currentHoverPoint.y);
    const minZ = Math.min(this.startPoint.z, this.currentHoverPoint.z);
    const maxZ = Math.max(this.startPoint.z, this.currentHoverPoint.z);

    // 创建预览框几何体（黄色半透明）
    const geometry = new THREE.BoxGeometry(
      maxX - minX + 1,
      maxY - minY + 1,
      maxZ - minZ + 1
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 0.15,
      depthWrite: false
    });

    this.previewBox = new THREE.Mesh(geometry, material);
    this.previewBox.position.set(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    );
    this.scene.add(this.previewBox);

    // 创建预览框边框线（黄色）
    this.previewHelper = new THREE.BoxHelper(this.previewBox, 0xffff00);
    this.scene.add(this.previewHelper);
  }

  /**
   * 更新最终选择框（绿色）
   */
  updateSelectionBox() {
    if (!this.startPoint || !this.endPoint) return;

    // 移除旧的 BoxHelper
    if (this.boxHelper) {
      this.scene.remove(this.boxHelper);
      this.boxHelper.geometry.dispose();
      this.boxHelper.material.dispose();
    }

    // 计算边界框
    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);
    const minZ = Math.min(this.startPoint.z, this.endPoint.z);
    const maxZ = Math.max(this.startPoint.z, this.endPoint.z);

    // 创建边界框几何体（绿色半透明）
    const geometry = new THREE.BoxGeometry(
      maxX - minX + 1,
      maxY - minY + 1,
      maxZ - minZ + 1
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.1,
      depthWrite: false
    });

    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox.geometry.dispose();
      this.selectionBox.material.dispose();
    }

    this.selectionBox = new THREE.Mesh(geometry, material);
    this.selectionBox.position.set(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2
    );
    this.scene.add(this.selectionBox);

    // 创建边框线（绿色）
    this.boxHelper = new THREE.BoxHelper(this.selectionBox, 0x00ff00);
    this.scene.add(this.boxHelper);
  }

  /**
   * 获取预览边界（第一次点击后）
   */
  getPreviewBounds() {
    if (!this.startPoint || !this.currentHoverPoint) return null;

    const minX = Math.min(this.startPoint.x, this.currentHoverPoint.x);
    const maxX = Math.max(this.startPoint.x, this.currentHoverPoint.x);
    const minY = Math.min(this.startPoint.y, this.currentHoverPoint.y);
    const maxY = Math.max(this.startPoint.y, this.currentHoverPoint.y);
    const minZ = Math.min(this.startPoint.z, this.currentHoverPoint.z);
    const maxZ = Math.max(this.startPoint.z, this.currentHoverPoint.z);

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      size: {
        x: maxX - minX + 1,
        y: maxY - minY + 1,
        z: maxZ - minZ + 1
      }
    };
  }

  /**
   * 获取选中区域的边界
   */
  getSelectionBounds() {
    if (!this.startPoint || !this.endPoint) return null;

    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);
    const minZ = Math.min(this.startPoint.z, this.endPoint.z);
    const maxZ = Math.max(this.startPoint.z, this.endPoint.z);

    return {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      size: {
        x: maxX - minX + 1,
        y: maxY - minY + 1,
        z: maxZ - minZ + 1
      }
    };
  }

  /**
   * 清除预览框
   */
  clearPreview() {
    if (this.previewBox) {
      this.scene.remove(this.previewBox);
      this.previewBox.geometry.dispose();
      this.previewBox.material.dispose();
      this.previewBox = null;
    }

    if (this.previewHelper) {
      this.scene.remove(this.previewHelper);
      this.previewHelper.geometry.dispose();
      this.previewHelper.material.dispose();
      this.previewHelper = null;
    }
  }

  /**
   * 清除选择
   */
  clearSelection() {
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox.geometry.dispose();
      this.selectionBox.material.dispose();
      this.selectionBox = null;
    }

    if (this.boxHelper) {
      this.scene.remove(this.boxHelper);
      this.boxHelper.geometry.dispose();
      this.boxHelper.material.dispose();
      this.boxHelper = null;
    }

    this.clearPreview();

    this.startPoint = null;
    this.endPoint = null;
    this.currentHoverPoint = null;
    this.clickCount = 0;
  }

  /**
   * 销毁选择器
   */
  dispose() {
    this.disable();
    this.clearSelection();
  }
}

/**
 * 从方块列表中提取选中区域的方块
 */
export function extractBlocksInRegion(blocks, bounds) {
  if (!bounds) return [];

  return blocks.filter(block => {
    const [x, y, z] = block.position;
    return (
      x >= bounds.min.x && x <= bounds.max.x &&
      y >= bounds.min.y && y <= bounds.max.y &&
      z >= bounds.min.z && z <= bounds.max.z
    );
  });
}

/**
 * 分析选中区域周围的方块（用于上下文匹配）
 */
export function analyzeRegionContext(blocks, bounds, contextRadius = 2) {
  if (!bounds) return { materials: {}, styles: [] };

  const contextBlocks = blocks.filter(block => {
    const [x, y, z] = block.position;

    // 排除选中区域内的方块
    const isInside = (
      x >= bounds.min.x && x <= bounds.max.x &&
      y >= bounds.min.y && y <= bounds.max.y &&
      z >= bounds.min.z && z <= bounds.max.z
    );

    if (isInside) return false;

    // 检查是否在周围 contextRadius 范围内
    const isNearby = (
      x >= bounds.min.x - contextRadius && x <= bounds.max.x + contextRadius &&
      y >= bounds.min.y - contextRadius && y <= bounds.max.y + contextRadius &&
      z >= bounds.min.z - contextRadius && z <= bounds.max.z + contextRadius
    );

    return isNearby;
  });

  // 统计材质使用频率
  const materialCounts = {};
  contextBlocks.forEach(block => {
    const type = block.type;
    materialCounts[type] = (materialCounts[type] || 0) + 1;
  });

  // 按频率排序
  const sortedMaterials = Object.entries(materialCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));

  return {
    materials: sortedMaterials,
    totalBlocks: contextBlocks.length,
    bounds: bounds
  };
}
