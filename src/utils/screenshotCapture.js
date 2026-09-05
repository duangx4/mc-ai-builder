/**
 * screenshotCapture.js - 3D 场景截图工具
 *
 * 为极致模式提供多角度建筑截图功能
 */

/**
 * 等待渲染完成
 * @param {number} delay - 延迟时间（毫秒）
 */
export async function waitForRender(delay = 1000) {
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * 从 Canvas 捕获截图
 * @param {HTMLCanvasElement} canvas - Three.js Canvas 元素
 * @param {string} format - 图片格式 'image/png' | 'image/jpeg'
 * @param {number} quality - JPEG 质量 (0-1)
 * @returns {string} Base64 图片数据
 */
export function captureCanvas(canvas, format = 'image/png', quality = 0.92) {
  if (!canvas) {
    throw new Error('Canvas not found');
  }

  return canvas.toDataURL(format, quality);
}

/**
 * 设置相机到指定位置和角度
 * @param {THREE.Camera} camera - Three.js 相机
 * @param {THREE.Controls} controls - OrbitControls
 * @param {Object} position - 相机位置 {x, y, z}
 * @param {Object} target - 相机目标点 {x, y, z}
 */
export function setCameraView(camera, controls, position, target) {
  if (!camera || !controls) {
    throw new Error('Camera or controls not found');
  }

  camera.position.set(position.x, position.y, position.z);
  controls.target.set(target.x, target.y, target.z);
  controls.update();
}

/**
 * 计算建筑的边界和中心点
 * @param {Array} blocks - 方块数组
 * @returns {Object} { center: {x, y, z}, size: {x, y, z}, bounds: {...} }
 */
export function calculateBuildingBounds(blocks) {
  if (!blocks || blocks.length === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      size: { x: 0, y: 0, z: 0 },
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }
    };
  }

  // 过滤空气方块
  const validBlocks = blocks.filter(b =>
    b && b.position && b.type && b.type.toLowerCase() !== 'air'
  );

  if (validBlocks.length === 0) {
    return {
      center: { x: 0, y: 0, z: 0 },
      size: { x: 0, y: 0, z: 0 },
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }
    };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  validBlocks.forEach(block => {
    const [x, y, z] = block.position;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  });

  const center = {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    z: (minZ + maxZ) / 2
  };

  const size = {
    x: maxX - minX + 1,
    y: maxY - minY + 1,
    z: maxZ - minZ + 1
  };

  return {
    center,
    size,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ }
  };
}

/**
 * 生成多角度相机位置配置
 * @param {Object} center - 建筑中心点 {x, y, z}
 * @param {Object} size - 建筑尺寸 {x, y, z}
 * @returns {Array} 相机配置数组
 */
export function generateCameraAngles(center, size) {
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = maxDim * 1.8; // 相机距离，确保完整可见

  return [
    {
      name: 'front',
      label: '正面视角',
      position: {
        x: center.x,
        y: center.y + distance * 0.5,
        z: center.z + distance
      },
      target: center
    },
    {
      name: 'top',
      label: '俯视视角',
      position: {
        x: center.x,
        y: center.y + distance * 1.2,
        z: center.z + distance * 0.3
      },
      target: center
    },
    {
      name: 'perspective',
      label: '透视视角',
      position: {
        x: center.x + distance * 0.7,
        y: center.y + distance * 0.8,
        z: center.z + distance * 0.7
      },
      target: center
    },
    {
      name: 'side',
      label: '侧面视角',
      position: {
        x: center.x + distance,
        y: center.y + distance * 0.5,
        z: center.z
      },
      target: center
    }
  ];
}

/**
 * 捕获多角度截图
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {THREE.Camera} camera - 相机
 * @param {THREE.Controls} controls - 控制器
 * @param {Array} blocks - 方块数组
 * @param {Array} angles - 角度名称数组，默认 ['front', 'top', 'perspective']
 * @returns {Promise<Object>} { screenshots: [{angle, label, data}], bounds, center }
 */
export async function captureMultiAngleScreenshots(
  canvas,
  camera,
  controls,
  blocks,
  angles = ['front', 'top', 'perspective']
) {
  if (!canvas || !camera || !controls) {
    throw new Error('Canvas, camera or controls not found');
  }

  // 计算建筑边界
  const { center, size, bounds } = calculateBuildingBounds(blocks);

  // 生成相机角度配置
  const allAngles = generateCameraAngles(center, size);
  const selectedAngles = allAngles.filter(a => angles.includes(a.name));

  const screenshots = [];

  // 保存原始相机状态
  const originalPosition = camera.position.clone();
  const originalTarget = controls.target.clone();

  try {
    for (const angle of selectedAngles) {
      // 设置相机视角
      setCameraView(camera, controls, angle.position, angle.target);

      // 等待渲染更新
      await waitForRender(300);

      // 捕获截图
      const imageData = captureCanvas(canvas);

      screenshots.push({
        angle: angle.name,
        label: angle.label,
        data: imageData,
        timestamp: Date.now()
      });

      console.log(`[Screenshot] Captured ${angle.label}`);
    }

    return {
      screenshots,
      bounds,
      center,
      size,
      capturedAt: new Date().toISOString()
    };
  } finally {
    // 恢复原始相机状态
    camera.position.copy(originalPosition);
    controls.target.copy(originalTarget);
    controls.update();
  }
}

/**
 * 压缩图片以减少 API 传输大小
 * @param {string} base64Image - Base64 图片数据
 * @param {number} maxWidth - 最大宽度
 * @param {number} quality - 压缩质量 (0-1)
 * @returns {Promise<string>} 压缩后的 Base64 图片
 */
export async function compressImage(base64Image, maxWidth = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // 计算缩放比例
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制并压缩
      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL('image/jpeg', quality);

      resolve(compressed);
    };
    img.onerror = reject;
    img.src = base64Image;
  });
}

/**
 * 从 store 获取 Canvas 元素（适配 React Three Fiber）
 * @returns {HTMLCanvasElement|null}
 */
export function getThreeCanvas() {
  // 查找 React Three Fiber 的 Canvas
  const canvas = document.querySelector('canvas');
  return canvas;
}

/**
 * 极致模式截图工作流
 * @param {Array} blocks - 方块数组
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 截图结果
 */
export async function captureForUltraMode(blocks, options = {}) {
  const {
    angles = ['front', 'top', 'perspective'],
    compress = true,
    maxWidth = 1024,
    quality = 0.85
  } = options;

  const canvas = getThreeCanvas();
  if (!canvas) {
    throw new Error('Three.js Canvas not found');
  }

  // 从 canvas.__three 获取相机和控制器（R3F 特有）
  const camera = canvas.__three?.camera;
  const controls = canvas.__three?.controls;

  if (!camera || !controls) {
    throw new Error('Camera or controls not accessible from canvas');
  }

  // 捕获多角度截图
  const result = await captureMultiAngleScreenshots(
    canvas,
    camera,
    controls,
    blocks,
    angles
  );

  // 压缩图片（如果启用）
  if (compress) {
    const compressedScreenshots = await Promise.all(
      result.screenshots.map(async (shot) => ({
        ...shot,
        data: await compressImage(shot.data, maxWidth, quality),
        compressed: true
      }))
    );

    return {
      ...result,
      screenshots: compressedScreenshots
    };
  }

  return result;
}
