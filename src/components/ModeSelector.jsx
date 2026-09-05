import React from 'react';
import { Zap, Sparkles, FileText, Rocket, Target } from 'lucide-react';

/**
 * 模式选择器组件（简化版）
 * 五种生成模式：快速/智能/蓝图/极致/精确修改
 */
const ModeSelector = ({
  currentMode,
  onModeChange,
  language = 'zh'
}) => {
  const modes = [
    {
      id: 'fast',
      icon: Zap,
      nameEn: 'Fast',
      nameZh: '快速',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      id: 'smart',
      icon: Sparkles,
      nameEn: 'Smart',
      nameZh: '智能',
      color: 'from-purple-500 to-pink-500',
    },
    {
      id: 'workflow',
      icon: FileText,
      nameEn: 'Blueprint',
      nameZh: '蓝图',
      color: 'from-orange-500 to-red-500',
    },
    {
      id: 'agentSkills',
      icon: Rocket,
      nameEn: 'Ultra',
      nameZh: '极致',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 'precise',
      icon: Target,
      nameEn: 'Precision',
      nameZh: '精确',
      color: 'from-indigo-500 to-blue-500',
    }
  ];

  return (
    <div className="flex items-center gap-2 mb-3">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentMode === mode.id;

        return (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg
              transition-all duration-200 text-sm font-medium
              ${isActive
                ? 'bg-gradient-to-br ' + mode.color + ' text-white shadow-lg scale-105'
                : 'bg-neutral-800/50 text-neutral-400 hover:text-white hover:bg-neutral-700/50 border border-white/10'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span>{language === 'zh' ? mode.nameZh : mode.nameEn}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
