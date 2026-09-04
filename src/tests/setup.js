/**
 * Vitest 测试环境设置
 */

import { vi } from 'vitest';

// 模拟全局对象
global.fetch = vi.fn();

// 如果需要其他全局模拟，在这里添加
