/**
 * stateCleanup.js - 状态清理工具
 *
 * 确保模式切换和操作取消时状态正确重置
 */

/**
 * 清理蓝图模式相关状态
 */
export function cleanupBlueprintState(setters) {
  const {
    setIsBlueprintQuestionnaireOpen,
    setIsBlueprintViewerOpen,
    setBlueprintData,
    setBlueprintRequirements,
    setIsProcessing
  } = setters;

  setIsBlueprintQuestionnaireOpen(false);
  setIsBlueprintViewerOpen(false);
  setBlueprintData(null);
  setBlueprintRequirements(null);
  setIsProcessing(false);
}

/**
 * 清理精确修改模式相关状态
 */
export function cleanupPreciseModificationState(setters, refs) {
  const {
    setIsPrecisePlanViewerOpen,
    setPreciseModificationPlan,
    setPreciseModificationAnalysis,
    setIsProcessing,
    setIsRegionSelecting,
    setRegionBounds,
    setSelectedRegionBlocks
  } = setters;

  const { preservedBlocksRef, regionSelectorRef } = refs;

  setIsPrecisePlanViewerOpen(false);
  setPreciseModificationPlan(null);
  setPreciseModificationAnalysis(null);
  setIsProcessing(false);
  setIsRegionSelecting(false);
  setRegionBounds(null);
  setSelectedRegionBlocks([]);

  if (preservedBlocksRef?.current) {
    preservedBlocksRef.current = null;
  }

  if (regionSelectorRef?.current) {
    regionSelectorRef.current.clearSelection?.();
  }
}

/**
 * 清理所有模式的状态（模式切换时）
 */
export function cleanupAllModes(setters, refs) {
  cleanupBlueprintState(setters);
  cleanupPreciseModificationState(setters, refs);
}

/**
 * 检查是否有正在进行的操作
 */
export function hasActiveOperation(state) {
  return (
    state.isProcessing ||
    state.isBlueprintQuestionnaireOpen ||
    state.isBlueprintViewerOpen ||
    state.isPrecisePlanViewerOpen ||
    state.isRegionSelecting
  );
}

/**
 * 防抖包装器（防止重复提交）
 */
export function createDebouncer() {
  let timeout = null;
  let isRunning = false;

  return {
    run: async (fn, delay = 300) => {
      // 如果正在运行，忽略
      if (isRunning) {
        console.log('[Debouncer] Operation already running, skipping');
        return;
      }

      // 清除之前的定时器
      if (timeout) {
        clearTimeout(timeout);
      }

      // 设置新的定时器
      return new Promise((resolve, reject) => {
        timeout = setTimeout(async () => {
          isRunning = true;
          try {
            const result = await fn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            isRunning = false;
          }
        }, delay);
      });
    },

    isRunning: () => isRunning,

    cancel: () => {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      isRunning = false;
    }
  };
}

/**
 * 创建操作锁（防止并发操作）
 */
export function createOperationLock() {
  let locked = false;

  return {
    acquire: () => {
      if (locked) {
        throw new Error('操作正在进行中，请稍候');
      }
      locked = true;
    },

    release: () => {
      locked = false;
    },

    isLocked: () => locked,

    withLock: async (fn) => {
      if (locked) {
        throw new Error('操作正在进行中，请稍候');
      }

      locked = true;
      try {
        return await fn();
      } finally {
        locked = false;
      }
    }
  };
}

/**
 * 模式切换验证
 */
export function validateModeSwitch(currentMode, newMode, state) {
  // 如果有正在进行的操作，阻止切换
  if (hasActiveOperation(state)) {
    return {
      allowed: false,
      reason: '当前有操作正在进行，请先完成或取消'
    };
  }

  // 精确模式需要选中区域
  if (newMode === 'precise' && (!state.regionBounds || state.selectedRegionBlocks.length === 0)) {
    return {
      allowed: false,
      reason: '精确模式需要先框选区域'
    };
  }

  return { allowed: true };
}
