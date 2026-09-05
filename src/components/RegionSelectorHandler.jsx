import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { RegionSelector } from '../utils/RegionSelector';

/**
 * 区域选择处理组件
 * 在 R3F Canvas 内部，通过 useThree 获取 scene/camera/gl
 */
const RegionSelectorHandler = ({
  isActive,
  onBoundsChange,
  onSelectionEnd
}) => {
  const { scene, camera, gl } = useThree();
  const selectorRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      // 清理选择器
      if (selectorRef.current) {
        selectorRef.current.disable();
        selectorRef.current = null;
      }
      return;
    }

    // 创建选择器
    const selector = new RegionSelector(scene, camera, gl.domElement);
    selectorRef.current = selector;

    // 设置回调
    selector.onSelectionChange = (bounds) => {
      if (onBoundsChange) {
        onBoundsChange(bounds);
      }
    };

    selector.onSelectionEnd = (bounds) => {
      if (onSelectionEnd) {
        onSelectionEnd(bounds);
      }
    };

    // 启用选择器
    selector.enable();

    console.log('[RegionSelectorHandler] Enabled');

    // 清理
    return () => {
      if (selector) {
        selector.dispose();
        console.log('[RegionSelectorHandler] Disposed');
      }
    };
  }, [isActive, scene, camera, gl, onBoundsChange, onSelectionEnd]);

  // 暴露 selector 到外部（通过 ref）
  useEffect(() => {
    if (window.__regionSelector) {
      window.__regionSelector.current = selectorRef.current;
    }
  }, [selectorRef.current]);

  return null; // 不渲染任何内容
};

export default RegionSelectorHandler;
