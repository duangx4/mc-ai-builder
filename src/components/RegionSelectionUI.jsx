import React from 'react';
import { Target, Check, X, RotateCcw } from 'lucide-react';

/**
 * 区域选择 UI 组件
 * 显示选中区域信息和操作按钮
 */
const RegionSelectionUI = ({
  isSelecting,
  bounds,
  blockCount,
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
        <Target className="w-5 h-5 text-green-400" />
        <h3 className="text-white font-bold">
          {t('Region Selection', '区域选择')}
        </h3>
      </div>

      {/* Selection Status */}
      {isSelecting ? (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-sm text-yellow-400 mb-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            {t('Selecting... Click twice to set region', '选择中... 单击两次设置区域')}
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
      {isSelecting && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="text-xs text-neutral-400 space-y-1">
            <div>💡 {t('Click once to set start point', '单击一次设置起点')}</div>
            <div>🎯 {t('Click again to set end point', '再次单击设置终点')}</div>
            <div>🟡 {t('Yellow box shows preview', '黄色框显示预览')}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionSelectionUI;
