import * as THREE from 'three';

/**
 * 区域选择工具
 * 用于在 3D 场景中框选特定区域（精确修改模式）
 */
export class RegionSelector {
  constructor(scene, camera, canvas) {
    this.scene = scene;
    this.camera = camera;
    this.canvas = canvas;

    this.isSelecting = false;
    this.startPoint = null;
    this.endPoint = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 选中区域的边界框
    this.selectionBox = null;
    this.boxHelper = null;

    // 回调函数
    this.onSelectionStart = null;
    this.onSelectionChange = null;
    this.onSelectionEnd = null;
  }

  /**
   * 启用区域选择
   */
  enable() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.style.cursor = 'crosshair';
  }

  /**
   * 禁用区域选择
   */
  disable() {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.style.cursor = 'default';
    this.clearSelection();
  }

  /**
   * 鼠标按下 - 开始选择
   */
  handleMouseDown = (event) => {
    const point = this.getWorldPoint(event);
    if (!point) return;

    this.isSelecting = true;
    this.startPoint = point;
    this.endPoint = point.clone();

    if (this.onSelectionStart) {
      this.onSelectionStart(this.startPoint);
    }

    this.updateSelectionBox();
  }

  /**
   * 鼠标移动 - 更新选择区域
   */
  handleMouseMove = (event) => {
    if (!this.isSelecting) return;

    const point = this.getWorldPoint(event);
    if (!point) return;

    this.endPoint = point;
    this.updateSelectionBox();

    if (this.onSelectionChange) {
      this.onSelectionChange(this.getSelectionBounds());
    }
  }

  /**
   * 鼠标释放 - 完成选择
   */
  handleMouseUp = (event) => {
    if (!this.isSelecting) return;

    const point = this.getWorldPoint(event);
    if (point) {
      this.endPoint = point;
      this.updateSelectionBox();
    }

    this.isSelecting = false;

    if (this.onSelectionEnd) {
      this.onSelectionEnd(this.getSelectionBounds());
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
   * 更新选择框的可视化
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

    // 创建边界框几何体
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

    // 创建边框线
    this.boxHelper = new THREE.BoxHelper(this.selectionBox, 0x00ff00);
    this.scene.add(this.boxHelper);
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

    this.startPoint = null;
    this.endPoint = null;
    this.isSelecting = false;
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
