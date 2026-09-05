import React from 'react';
import { X, Check, RotateCcw, Move, Maximize2 } from 'lucide-react';

/**
 * 区域选择 UI 组件
 * 显示选中区域信息和操作按钮
 */
const RegionSelectionUI = ({
  isSelecting,
  bounds,
  blockCount,
  controlMode = 'translate',
  onControlModeChange,
  onConfirm,
  onCancel,
  onReset,
  language = 'zh'
}) => {
  const t = (en, zh) => language === 'zh' ? zh : en;

  if (!isSelecting && !bounds) return null;

  return (
    <div className="fixed top-24 right-6 bg-neutral-900/95 backdrop-blur-sm border border-white/20 rounded-xl p-4 shadow-2xl z-40 min-w-[280px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
        <div className="w-5 h-5 bg-yellow-400 rounded opacity-60"></div>
        <h3 className="text-white font-bold">
          {t('Region Selection', '区域选择')}
        </h3>
      </div>

      {/* Control Mode Switch */}
      {bounds && (
        <div className="mb-4 bg-neutral-800/50 rounded-lg p-2 flex gap-1">
          <button
            onClick={() => onControlModeChange && onControlModeChange('translate')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-medium transition-all ${
              controlMode === 'translate'
                ? 'bg-blue-500 text-white shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            <Move size={14} />
            {t('Move', '移动')}
          </button>
          <button
            onClick={() => onControlModeChange && onControlModeChange('scale')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-medium transition-all ${
              controlMode === 'scale'
                ? 'bg-purple-500 text-white shadow'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-700/50'
            }`}
          >
            <Maximize2 size={14} />
            {t('Scale', '缩放')}
          </button>
        </div>
      )}

      {/* Selection Status */}
      {isSelecting && !bounds ? (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-yellow-400 mb-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            {t('Click scene to place box', '点击场景放置选择框')}
          </div>
        </div>
      ) : null}

      {/* Region Info */}
      {bounds && (
        <div className="space-y-3 mb-4">
          {/* Coordinates */}
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <div className="text-xs text-neutral-400 mb-2">
              {t('Coordinates', '坐标范围')}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-neutral-500">Min:</span>{' '}
                <span className="text-blue-400">
                  ({bounds.min.x}, {bounds.min.y}, {bounds.min.z})
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Max:</span>{' '}
                <span className="text-green-400">
                  ({bounds.max.x}, {bounds.max.y}, {bounds.max.z})
                </span>
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <div className="text-xs text-neutral-400 mb-2">
              {t('Dimensions', '尺寸')}
            </div>
            <div className="flex items-center gap-2 text-white font-mono">
              <span className="text-sm">
                {bounds.size.x} × {bounds.size.y} × {bounds.size.z}
              </span>
              <span className="text-xs text-neutral-500">
                ({t('blocks', '方块')})
              </span>
            </div>
          </div>

          {/* Block Count */}
          {blockCount !== undefined && (
            <div className="bg-neutral-800/50 rounded-lg p-3">
              <div className="text-xs text-neutral-400 mb-2">
                {t('Blocks in Region', '区域内方块数')}
              </div>
              <div className="text-lg font-bold text-white">
                {blockCount}
              </div>
            </div>
          )}

          {/* Volume */}
          <div className="bg-neutral-800/50 rounded-lg p-3">
            <div className="text-xs text-neutral-400 mb-2">
              {t('Total Volume', '总体积')}
            </div>
            <div className="text-sm text-white">
              {bounds.size.x * bounds.size.y * bounds.size.z}{' '}
              <span className="text-xs text-neutral-500">
                {t('cubic blocks', '立方方块')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {!isSelecting && bounds && (
          <>
            <button
              onClick={onConfirm}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:shadow-lg transition-all"
            >
              <Check size={16} />
              {t('Confirm Selection', '确认选择')}
            </button>

            <button
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-neutral-700 text-white rounded-lg font-medium hover:bg-neutral-600 transition-all"
            >
              <RotateCcw size={16} />
              {t('Reselect', '重新选择')}
            </button>
          </>
        )}

        <button
          onClick={onCancel}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-medium hover:bg-red-500/30 transition-all"
        >
          <X size={16} />
          {t('Cancel', '取消')}
        </button>
      </div>

      {/* Instructions */}
      {isSelecting && !bounds && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-neutral-400 space-y-1">
            <div>💡 {t('Click to place yellow box', '单击放置黄色选择框')}</div>
            <div>🔵 {t('Drag blue arrows to move', '拖动蓝色箭头移动')}</div>
            <div>🟣 {t('Switch to scale mode to resize', '切换缩放模式调整大小')}</div>
          </div>
        </div>
      )}

      {bounds && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-neutral-400 space-y-1">
            <div>🎯 {t('Adjust position and size', '调整位置和大小')}</div>
            <div>✅ {t('Click confirm when ready', '完成后点击确认')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionSelectionUI;
