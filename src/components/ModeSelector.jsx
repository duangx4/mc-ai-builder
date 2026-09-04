import React from 'react';
import { Zap, Sparkles, FileText, Rocket, Target } from 'lucide-react';

/**
 * 模式选择器组件
 * 五种生成模式：快速/智能/蓝图/极致/精确修改
 */
const ModeSelector = ({
  currentMode,
  onModeChange,
  blockEstimate = 0,
  recommendedMode = null,
  language = 'zh'
}) => {
  const modes = [
    {
      id: 'fast',
      icon: Zap,
      nameEn: 'Fast',
      nameZh: '快速',
      descEn: 'Quick builds',
      descZh: '快速生成',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      hoverColor: 'hover:border-blue-500',
      time: '10s',
      cost: '$0.01',
      stars: 3,
      blockRange: '< 500'
    },
    {
      id: 'smart',
      icon: Sparkles,
      nameEn: 'Smart',
      nameZh: '智能',
      descEn: '3-stage flow',
      descZh: '三阶段流程',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      hoverColor: 'hover:border-purple-500',
      time: '30s',
      cost: '$0.03',
      stars: 4,
      blockRange: '500-1500'
    },
    {
      id: 'workflow', // 蓝图模式使用 workflow（现有系统值）
      icon: FileText,
      nameEn: 'Blueprint',
      nameZh: '蓝图',
      descEn: 'Interactive planning',
      descZh: '交互式规划',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      hoverColor: 'hover:border-orange-500',
      time: '2-5m',
      cost: '$0.05',
      stars: 5,
      blockRange: '1500-2500'
    },
    {
      id: 'agentSkills', // 极致模式使用 agentSkills（现有系统值）
      icon: Rocket,
      nameEn: 'Ultra',
      nameZh: '极致',
      descEn: 'Ultimate quality',
      descZh: '极致质量',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      hoverColor: 'hover:border-green-500',
      time: '3-5m',
      cost: '$0.10',
      stars: 5,
      blockRange: '> 2500'
    },
    {
      id: 'precise', // 精确修改模式使用 precise（现有系统值）
      icon: Target,
      nameEn: 'Precision',
      nameZh: '精确',
      descEn: 'Edit regions',
      descZh: '区域编辑',
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-500/10',
      borderColor: 'border-indigo-500/30',
      hoverColor: 'hover:border-indigo-500',
      time: '20s',
      cost: '$0.02',
      stars: 4,
      blockRange: 'Local'
    }
  ];

  const t = (en, zh) => language === 'zh' ? zh : en;

  const renderStars = (count) => {
    return (
      <div className="flex gap-0.5">
        {Array(5).fill(0).map((_, i) => (
          <span key={i} className={`text-xs ${i < count ? 'text-yellow-400' : 'text-gray-600'}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full mb-4">
      {/* 模式卡片网格 */}
      <div className="grid grid-cols-5 gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;
          const isRecommended = recommendedMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`
                relative flex flex-col items-center p-3 rounded-lg
                border-2 transition-all duration-200
                ${isActive
                  ? `${mode.bgColor} ${mode.borderColor.replace('/30', '')} shadow-lg scale-105`
                  : `bg-gray-800/30 ${mode.borderColor} ${mode.hoverColor}`
                }
                hover:shadow-md hover:scale-105
              `}
            >
              {/* 推荐标签 */}
              {isRecommended && !isActive && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-black text-xs font-bold px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                  {t('Recommended', '推荐')}
                </div>
              )}

              {/* 图标 */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center mb-2
                bg-gradient-to-br ${mode.color}
                ${isActive ? 'animate-pulse' : ''}
              `}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              {/* 名称 */}
              <div className="text-sm font-bold text-white mb-1">
                {language === 'zh' ? mode.nameZh : mode.nameEn}
              </div>

              {/* 描述 */}
              <div className="text-xs text-gray-400 mb-2 text-center h-8 flex items-center">
                {language === 'zh' ? mode.descZh : mode.descEn}
              </div>

              {/* 质量星级 */}
              <div className="mb-1">
                {renderStars(mode.stars)}
              </div>

              {/* 时间和成本 */}
              <div className="flex gap-2 text-xs text-gray-500">
                <span>⏱️ {mode.time}</span>
                <span>💰 {mode.cost}</span>
              </div>

              {/* 方块范围 */}
              <div className="text-xs text-gray-600 mt-1">
                {mode.blockRange}
              </div>

              {/* 激活指示器 */}
              {isActive && (
                <div className="absolute inset-0 rounded-lg border-2 border-white/20 pointer-events-none animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* 当前模式信息栏 */}
      <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            <span className="text-gray-400">
              {t('Current Mode:', '当前模式：')}
            </span>
            <span className="font-bold text-white">
              {language === 'zh'
                ? modes.find(m => m.id === currentMode)?.nameZh
                : modes.find(m => m.id === currentMode)?.nameEn
              }
            </span>
          </div>

          {blockEstimate > 0 && (
            <div className="flex items-center gap-4 text-gray-400">
              <span>
                {t('Estimated:', '预估：')}
                <span className="text-white ml-1">{blockEstimate}</span>
                {t(' blocks', ' 方块')}
              </span>
              <span>
                {t('Time:', '耗时：')}
                <span className="text-white ml-1">
                  {modes.find(m => m.id === currentMode)?.time}
                </span>
              </span>
              <span>
                {t('Cost:', '成本：')}
                <span className="text-white ml-1">
                  {modes.find(m => m.id === currentMode)?.cost}
                </span>
              </span>
            </div>
          )}

          {/* 智能推荐按钮 */}
          <button
            className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full hover:shadow-lg transition-all"
            onClick={(e) => {
              e.preventDefault();
              // TODO: 触发智能推荐逻辑
              console.log('[ModeSelector] Smart recommendation triggered');
            }}
          >
            ✨ {t('Smart Recommend', '智能推荐')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModeSelector;
