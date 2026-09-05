/**
 * UltraModeViewer.jsx - 极致模式进度查看器
 *
 * 显示迭代进度、Vision 分析结果、评分变化
 */

import React, { useState } from 'react';
import { X, Image as ImageIcon, TrendingUp, DollarSign, Clock, AlertCircle, CheckCircle, Zap } from 'lucide-react';

/**
 * 迭代卡片组件
 */
function IterationCard({ iteration, isLatest }) {
  const [showDetails, setShowDetails] = useState(false);
  const { score, analysis, cost, screenshots, blockCount } = iteration;

  // 评分颜色
  const getScoreColor = (score) => {
    if (score >= 8.5) return 'text-green-400';
    if (score >= 7.0) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 8.5) return 'bg-green-500/20 border-green-500/30';
    if (score >= 7.0) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className={`
      bg-neutral-800/50 border rounded-xl p-4 transition-all
      ${isLatest ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' : 'border-neutral-700'}
    `}>
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`
            px-3 py-1 rounded-full text-xs font-bold
            ${isLatest ? 'bg-blue-500/20 text-blue-300' : 'bg-neutral-700 text-neutral-400'}
          `}>
            第 {iteration.iteration} 轮
          </div>
          {isLatest && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <Zap size={12} />
              最新
            </span>
          )}
        </div>

        {/* 评分 */}
        <div className={`
          px-4 py-2 rounded-lg border text-lg font-bold
          ${getScoreBg(score)}
        `}>
          <span className={getScoreColor(score)}>{score.toFixed(1)}</span>
          <span className="text-neutral-500 text-sm">/10</span>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <p className="text-xs text-neutral-500">成本</p>
          <p className="text-sm font-semibold text-white">${cost.toFixed(3)}</p>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <p className="text-xs text-neutral-500">方块数</p>
          <p className="text-sm font-semibold text-white">{blockCount}</p>
        </div>
        <div className="bg-neutral-900/50 rounded-lg p-2 text-center">
          <p className="text-xs text-neutral-500">截图</p>
          <p className="text-sm font-semibold text-white">{screenshots?.length || 0}</p>
        </div>
      </div>

      {/* 三维度评分 */}
      {analysis?.dimensions && (
        <div className="space-y-2 mb-3">
          {Object.entries(analysis.dimensions).map(([key, data]) => (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-neutral-400 capitalize">
                  {key === 'structure' ? '结构' : key === 'style' ? '风格' : '细节'}
                </span>
                <span className={getScoreColor(data.score)}>{data.score.toFixed(1)}/10</span>
              </div>
              <div className="h-1.5 bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    data.score >= 8.5 ? 'bg-green-500' :
                    data.score >= 7.0 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${(data.score / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 展开详情按钮 */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full py-2 text-xs text-neutral-400 hover:text-white transition-colors"
      >
        {showDetails ? '收起详情 ▲' : '查看详情 ▼'}
      </button>

      {/* 详情内容 */}
      {showDetails && analysis && (
        <div className="mt-3 pt-3 border-t border-neutral-700 space-y-3">
          {/* 问题列表 */}
          {Object.entries(analysis.dimensions).map(([key, data]) => (
            data.issues && data.issues.length > 0 && (
              <div key={key}>
                <p className="text-xs font-semibold text-red-400 mb-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {key === 'structure' ? '结构' : key === 'style' ? '风格' : '细节'}问题
                </p>
                <ul className="text-xs text-neutral-400 space-y-1 ml-4">
                  {data.issues.map((issue, idx) => (
                    <li key={idx}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )
          ))}

          {/* 改进建议 */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-400 mb-1 flex items-center gap-1">
                <CheckCircle size={12} />
                改进建议
              </p>
              <ul className="text-xs text-neutral-400 space-y-1 ml-4">
                {analysis.recommendations.slice(0, 5).map((rec, idx) => (
                  <li key={idx}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 极致模式查看器主组件
 */
export default function UltraModeViewer({ result, onClose, isRunning }) {
  if (!result) return null;

  const { iterations, finalScore, totalCost, duration, scoreImprovement, success, error } = result;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 rounded-2xl border border-neutral-700 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-neutral-700 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="text-pink-500" size={24} />
              极致模式
              {isRunning && (
                <span className="text-sm font-normal text-yellow-400 animate-pulse">
                  运行中...
                </span>
              )}
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              AI 视觉反馈 · 迭代改进
            </p>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <X size={20} className="text-neutral-400" />
            </button>
          )}
        </div>

        {/* 主内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 错误显示 */}
          {!success && error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400 font-semibold mb-1 flex items-center gap-2">
                <AlertCircle size={16} />
                执行失败
              </p>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* 总览卡片 */}
          {success && iterations && iterations.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={16} className="text-blue-400" />
                  <p className="text-xs text-blue-300">最终评分</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {finalScore?.toFixed(1) || '0.0'}
                  <span className="text-sm text-neutral-400">/10</span>
                </p>
                {scoreImprovement > 0 && (
                  <p className="text-xs text-green-400 mt-1">
                    +{scoreImprovement.toFixed(1)} 提升
                  </p>
                )}
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={16} className="text-green-400" />
                  <p className="text-xs text-green-300">迭代次数</p>
                </div>
                <p className="text-2xl font-bold text-white">{iterations.length}</p>
                <p className="text-xs text-neutral-400 mt-1">轮改进</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign size={16} className="text-yellow-400" />
                  <p className="text-xs text-yellow-300">总成本</p>
                </div>
                <p className="text-2xl font-bold text-white">${totalCost?.toFixed(3) || '0.000'}</p>
                <p className="text-xs text-neutral-400 mt-1">Vision API</p>
              </div>

              <div className="bg-gradient-to-br from-pink-500/20 to-red-500/20 border border-pink-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={16} className="text-pink-400" />
                  <p className="text-xs text-pink-300">耗时</p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {duration ? (duration / 1000).toFixed(1) : '0.0'}
                </p>
                <p className="text-xs text-neutral-400 mt-1">秒</p>
              </div>
            </div>
          )}

          {/* 迭代历史 */}
          {iterations && iterations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-neutral-300 mb-3">迭代历史</h3>
              <div className="space-y-3">
                {iterations.map((iter, idx) => (
                  <IterationCard
                    key={iter.iteration}
                    iteration={iter}
                    isLatest={idx === iterations.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 运行中占位 */}
          {isRunning && (!iterations || iterations.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-4" />
              <p className="text-neutral-400">正在初始化极致模式...</p>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        {!isRunning && success && (
          <div className="px-6 py-4 border-t border-neutral-700 flex items-center justify-between flex-shrink-0">
            <p className="text-xs text-neutral-500">
              {iterations?.length > 1
                ? `经过 ${iterations.length} 轮迭代优化，质量提升 ${scoreImprovement?.toFixed(1)} 分`
                : '首轮即达到质量标准'}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              关闭
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
