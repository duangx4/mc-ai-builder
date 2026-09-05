/**
 * ultraMode.js - 极致模式引擎
 *
 * 整合截图、Vision 分析、迭代改进的完整工作流
 */

import { captureForUltraMode } from './screenshotCapture.js';
import { analyzeWithVision, generateImprovementPrompt } from './visionAnalysis.js';

/**
 * 极致模式配置
 */
export const ULTRA_MODE_CONFIG = {
  MAX_ITERATIONS: 3,           // 最多迭代 3 轮
  TARGET_SCORE: 8.5,           // 目标质量分数
  MIN_SCORE_IMPROVEMENT: 0.3,  // 最小改进阈值
  SCREENSHOT_ANGLES: ['front', 'top', 'perspective'], // 截图角度
  COST_PER_IMAGE: 0.015,       // Vision API 成本/图片
  ENABLE_COST_LIMIT: true,     // 启用成本限制
  MAX_COST: 0.20               // 最大成本（美元）
};

/**
 * 极致模式状态
 */
export const UltraModePhase = {
  INIT: 'init',
  GENERATING: 'generating',
  CAPTURING: 'capturing',
  ANALYZING: 'analyzing',
  IMPROVING: 'improving',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * 执行极致模式生成
 * @param {string} userPrompt - 用户提示词
 * @param {Function} generateFn - 生成函数 (prompt) => Promise<blocks>
 * @param {Function} onProgress - 进度回调 (state) => void
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 生成结果
 */
export async function executeUltraMode(userPrompt, generateFn, onProgress = () => {}, options = {}) {
  const config = { ...ULTRA_MODE_CONFIG, ...options };

  const state = {
    phase: UltraModePhase.INIT,
    iteration: 0,
    iterations: [],
    currentPrompt: userPrompt,
    currentBlocks: null,
    totalCost: 0,
    startTime: Date.now()
  };

  try {
    // ========== 第 1 次生成 ==========
    state.phase = UltraModePhase.GENERATING;
    state.iteration = 1;
    onProgress({ ...state, message: '正在生成初始建筑...' });

    state.currentBlocks = await generateFn(state.currentPrompt);

    if (!state.currentBlocks || state.currentBlocks.length === 0) {
      throw new Error('生成失败：未生成任何方块');
    }

    // ========== 迭代改进循环 ==========
    while (state.iteration <= config.MAX_ITERATIONS) {
      // 步骤 1: 捕获截图
      state.phase = UltraModePhase.CAPTURING;
      onProgress({
        ...state,
        message: `第 ${state.iteration} 轮：正在捕获多角度截图...`
      });

      const screenshotResult = await captureForUltraMode(state.currentBlocks, {
        angles: config.SCREENSHOT_ANGLES,
        compress: true,
        maxWidth: 1024,
        quality: 0.85
      });

      // 步骤 2: Vision AI 分析
      state.phase = UltraModePhase.ANALYZING;
      onProgress({
        ...state,
        message: `第 ${state.iteration} 轮：AI 正在分析建筑质量...`
      });

      const analysisResult = await analyzeWithVision(
        screenshotResult.screenshots,
        state.currentPrompt,
        {
          size: screenshotResult.size,
          bounds: screenshotResult.bounds,
          center: screenshotResult.center
        }
      );

      if (!analysisResult.success) {
        throw new Error(`Vision 分析失败: ${analysisResult.error}`);
      }

      const { analysis } = analysisResult;
      const score = analysis.overall_score;
      state.totalCost += analysisResult.cost;

      // 记录本轮结果
      const iterationResult = {
        iteration: state.iteration,
        score,
        analysis,
        screenshots: screenshotResult.screenshots.map(s => ({
          angle: s.angle,
          label: s.label,
          timestamp: s.timestamp
          // data 不保存，避免占用内存
        })),
        cost: analysisResult.cost,
        prompt: state.currentPrompt,
        blockCount: state.currentBlocks.length,
        timestamp: new Date().toISOString()
      };

      state.iterations.push(iterationResult);

      console.log(`[Ultra Mode] 第 ${state.iteration} 轮评分: ${score}/10`);

      // 检查是否达到目标分数
      if (score >= config.TARGET_SCORE) {
        console.log(`[Ultra Mode] ✅ 达到目标分数 ${config.TARGET_SCORE}`);
        state.phase = UltraModePhase.COMPLETED;
        break;
      }

      // 检查成本限制
      if (config.ENABLE_COST_LIMIT && state.totalCost >= config.MAX_COST) {
        console.log(`[Ultra Mode] ⚠️ 达到成本上限 $${config.MAX_COST}`);
        state.phase = UltraModePhase.COMPLETED;
        break;
      }

      // 检查是否还有改进空间
      if (state.iteration > 1) {
        const lastScore = state.iterations[state.iteration - 2].score;
        const improvement = score - lastScore;

        if (improvement < config.MIN_SCORE_IMPROVEMENT && score > 7.0) {
          console.log(`[Ultra Mode] 改进幅度过小 (+${improvement.toFixed(2)})，停止迭代`);
          state.phase = UltraModePhase.COMPLETED;
          break;
        }
      }

      // 如果还未达到最大迭代次数，继续改进
      if (state.iteration < config.MAX_ITERATIONS) {
        // 步骤 3: 生成改进提示词
        const improvementPrompt = generateImprovementPrompt(userPrompt, analysis);

        if (!improvementPrompt) {
          console.log('[Ultra Mode] 无需进一步改进');
          state.phase = UltraModePhase.COMPLETED;
          break;
        }

        state.currentPrompt = improvementPrompt;

        // 步骤 4: 重新生成
        state.iteration++;
        state.phase = UltraModePhase.IMPROVING;
        onProgress({
          ...state,
          message: `第 ${state.iteration} 轮：根据反馈改进中...`
        });

        state.currentBlocks = await generateFn(state.currentPrompt);

        if (!state.currentBlocks || state.currentBlocks.length === 0) {
          throw new Error(`第 ${state.iteration} 轮生成失败`);
        }
      } else {
        // 达到最大迭代次数
        console.log(`[Ultra Mode] 达到最大迭代次数 ${config.MAX_ITERATIONS}`);
        state.phase = UltraModePhase.COMPLETED;
        break;
      }
    }

    // ========== 完成 ==========
    const finalIteration = state.iterations[state.iterations.length - 1];
    const duration = Date.now() - state.startTime;

    const result = {
      success: true,
      phase: UltraModePhase.COMPLETED,
      blocks: state.currentBlocks,
      iterations: state.iterations,
      finalScore: finalIteration.score,
      finalAnalysis: finalIteration.analysis,
      totalIterations: state.iterations.length,
      totalCost: state.totalCost,
      duration,
      improved: state.iterations.length > 1,
      scoreImprovement: state.iterations.length > 1
        ? finalIteration.score - state.iterations[0].score
        : 0
    };

    onProgress({
      ...state,
      ...result,
      message: `✅ 完成！最终评分 ${finalIteration.score}/10`
    });

    return result;

  } catch (error) {
    console.error('[Ultra Mode] Error:', error);

    state.phase = UltraModePhase.FAILED;
    const result = {
      success: false,
      phase: UltraModePhase.FAILED,
      error: error.message,
      iterations: state.iterations,
      totalCost: state.totalCost,
      duration: Date.now() - state.startTime
    };

    onProgress({ ...state, ...result, message: `❌ 失败: ${error.message}` });

    return result;
  }
}

/**
 * 格式化极致模式结果报告
 */
export function formatUltraModeReport(result) {
  if (!result.success) {
    return `❌ 极致模式失败\n错误: ${result.error}`;
  }

  const { iterations, finalScore, totalCost, duration, scoreImprovement } = result;

  const lines = [
    '✨ 极致模式完成报告',
    '='.repeat(40),
    `最终评分: ${finalScore.toFixed(1)}/10`,
    `总迭代次数: ${iterations.length} 轮`,
    scoreImprovement > 0
      ? `质量提升: +${scoreImprovement.toFixed(1)} 分`
      : '首轮即达标',
    `总成本: $${totalCost.toFixed(3)}`,
    `耗时: ${(duration / 1000).toFixed(1)} 秒`,
    '',
    '📊 各轮评分:',
    ...iterations.map((it, idx) =>
      `  第 ${idx + 1} 轮: ${it.score.toFixed(1)}/10 ($${it.cost.toFixed(3)})`
    )
  ];

  return lines.join('\n');
}

/**
 * 获取极致模式成本估算
 */
export function estimateUltraModeCost(options = {}) {
  const config = { ...ULTRA_MODE_CONFIG, ...options };
  const imagesPerIteration = config.SCREENSHOT_ANGLES.length;
  const maxCost = imagesPerIteration * config.MAX_ITERATIONS * config.COST_PER_IMAGE;

  return {
    minCost: imagesPerIteration * config.COST_PER_IMAGE,
    maxCost,
    avgCost: maxCost * 0.6, // 假设平均 1.8 轮
    imagesPerIteration,
    costPerImage: config.COST_PER_IMAGE
  };
}
