import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';

/**
 * 提示词优化器组件
 * 功能：把用户模糊的建造/修改需求交给 LLM 优化成聚焦、范围明确、可执行的提示词
 * 来源：builder@29f2255 prompt-optimizer.js（DOM 注入版）→ React 原生实现
 */

const SYSTEM_PROMPT = `你是一个 Minecraft 建筑建造需求的提示词优化器。用户会输入一段建造/修改需求，并结合上文的建筑对话，把它改写为一份聚焦、明确、可执行的提示词。

改写要求：
1. 以上文为准：仔细阅读上文对话，确定当前建筑的真实风格、材料和建造状态（例如中式古典、哥特、现代等）。风格必须与上文一致，严禁臆造或更换风格。
2. 目标明确：说清要建造/修改什么部位、用什么材料或结构。
3. 范围受限：若是修改现有建筑，明确限定只改哪个局部，其余保持不动，禁止大范围推倒重建。
4. 代码安全：修改类需求要提醒 AI：修改会重新生成完整代码，代码必须语法完整、括号配对；**每个变量只能声明一次**，被替换的旧代码段必须删除，严禁在保留旧代码的情况下插入新代码——同名 const 重复声明（如 DOOR_RX 出现两次）会直接报错，导致整段代码作废。
5. 大门形制：若需求涉及大门/入口/城门/portal，要提醒 AI：大门规格与建筑规模匹配——小屋/内室才用木门方块；大殿/城堡/城门/宅邸大门必须用砖石砌大型门洞/拱门/门楼（半圆拱、哥特尖拱、中式门楼/牌坊、月洞门），严禁用木门方块代表大门。
6. 简洁自然：用中文自然语言输出，不要输出代码，不要 Markdown 表格，控制在 6 句话以内。

输出用下面几个标题分行（不要代码块）：
【目标】...
【改动范围】...
【具体做法】...
【注意事项】...`;

/**
 * @param {Object} props
 * @param {string} props.inputText - 当前输入框文本
 * @param {Function} props.onOptimized - 优化完成回调 (optimizedText) => void
 * @param {Array} props.messages - 聊天历史消息
 * @param {Object} props.settings - 应用设置 {apiKey, baseUrl, model, maxTokens}
 */
const PromptOptimizer = ({ inputText, onOptimized, messages = [], settings = {} }) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState(null);

  const handleOptimize = async () => {
    const text = (inputText || '').trim();
    if (!text) {
      setError('请先输入建造/修改需求');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!settings.apiKey) {
      setError('未配置 API Key，请到右上角「设置」里填写');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsOptimizing(true);
    setError(null);

    try {
      const baseUrl = (settings.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
      const model = settings.model || 'gpt-4o-mini';
      const maxTokens = settings.maxTokens || 16384;

      // 提取最近 8 条有效对话作为上下文（排除优化器自己生成的消息）
      const recentMessages = messages
        .filter(m => m.role !== 'system' && !m.content.includes('【目标】'))
        .slice(-8)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content.slice(0, 1200) // 限制长度
        }));

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...recentMessages,
            { role: 'user', content: text }
          ],
          max_tokens: Math.min(maxTokens, 2048),
          stream: false
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const optimizedContent = data?.choices?.[0]?.message?.content;

      if (!optimizedContent) {
        throw new Error('AI 未返回内容');
      }

      onOptimized(optimizedContent.trim());
    } catch (err) {
      console.error('[PromptOptimizer] Error:', err);
      setError(`优化失败：${err.message || '未知错误'}`);
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="flex items-center justify-end mb-2">
      <button
        onClick={handleOptimize}
        disabled={isOptimizing || !inputText?.trim()}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
          ${isOptimizing || !inputText?.trim()
            ? 'bg-orange-500/10 text-orange-400/50 cursor-not-allowed'
            : 'bg-orange-500/12 text-orange-400 border border-orange-500/35 hover:bg-orange-500/28'
          }`}
        title="使用 AI 优化提示词，使其更聚焦、明确、可执行"
      >
        <Sparkles size={14} />
        <span>{isOptimizing ? '优化中…' : '✨ 优化提示词'}</span>
      </button>
      
      {error && (
        <div className="ml-3 text-xs text-yellow-400 animate-pulse">
          {error}
        </div>
      )}
    </div>
  );
};

export default PromptOptimizer;
