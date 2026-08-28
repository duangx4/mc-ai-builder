/**
 * 设置 Schema - 单一默认值来源
 * 所有设置项的默认值集中定义在此，避免散落在各处
 */

/**
 * 默认设置项
 * @type {Object}
 */
export const DEFAULT_SETTINGS = {
  // API 配置
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo',
  
  // 图像生成配置（如果使用独立 API）
  imageModel: 'dall-e-3',
  imageUseSameApi: true, // 是否使用与主 API 相同的配置
  imageBaseUrl: '', // 图像 API 独立 URL（如果不同）
  imageApiKey: '', // 图像 API 独立 Key（如果不同）
  
  // 生成参数
  maxTokens: 4000, // AI 生成最大 token 数
  generationMode: 'fast', // 生成模式：'fast' | 'workflow' | 'agentSkills'
  concurrencyCount: 1, // 并发生成数量
  
  // UI 偏好
  mouseSensitivity: 1.0, // 鼠标灵敏度
  fov: 75, // 视野角度（Field of View）
  
  // 开发者选项
  debugMode: false, // 调试模式（显示详细日志）
};

/**
 * 设置项元数据（用于生成设置面板 UI）
 */
export const SETTINGS_METADATA = {
  apiKey: {
    label: { zh: 'API Key', en: 'API Key' },
    type: 'password',
    required: true,
    category: 'api',
  },
  baseUrl: {
    label: { zh: 'API Base URL', en: 'API Base URL' },
    type: 'text',
    required: true,
    category: 'api',
  },
  model: {
    label: { zh: '模型', en: 'Model' },
    type: 'text',
    required: true,
    category: 'api',
  },
  imageModel: {
    label: { zh: '图像模型', en: 'Image Model' },
    type: 'text',
    required: false,
    category: 'image',
  },
  imageUseSameApi: {
    label: { zh: '图像使用相同 API', en: 'Use Same API for Images' },
    type: 'boolean',
    required: false,
    category: 'image',
  },
  imageBaseUrl: {
    label: { zh: '图像 API Base URL', en: 'Image API Base URL' },
    type: 'text',
    required: false,
    category: 'image',
  },
  imageApiKey: {
    label: { zh: '图像 API Key', en: 'Image API Key' },
    type: 'password',
    required: false,
    category: 'image',
  },
  maxTokens: {
    label: { zh: '最大 Tokens', en: 'Max Tokens' },
    type: 'number',
    min: 1000,
    max: 32000,
    category: 'generation',
  },
  generationMode: {
    label: { zh: '生成模式', en: 'Generation Mode' },
    type: 'select',
    options: ['fast', 'workflow', 'agentSkills'],
    category: 'generation',
  },
  concurrencyCount: {
    label: { zh: '并发数量', en: 'Concurrency Count' },
    type: 'number',
    min: 1,
    max: 10,
    category: 'generation',
  },
  mouseSensitivity: {
    label: { zh: '鼠标灵敏度', en: 'Mouse Sensitivity' },
    type: 'number',
    min: 0.1,
    max: 5.0,
    step: 0.1,
    category: 'ui',
  },
  fov: {
    label: { zh: '视野角度', en: 'Field of View' },
    type: 'number',
    min: 30,
    max: 120,
    category: 'ui',
  },
  debugMode: {
    label: { zh: '调试模式', en: 'Debug Mode' },
    type: 'boolean',
    category: 'developer',
  },
};

/**
 * 从 localStorage 加载设置，自动迁移旧配置
 * @param {string} newKey - 新的 localStorage 键名（默认 'mc-ai-builder-settings'）
 * @param {string} oldKey - 旧的 localStorage 键名（默认 'mc-ai-settings'）
 * @returns {Object} 合并后的设置对象
 */
export function loadSettings(newKey = 'mc-ai-builder-settings', oldKey = 'mc-ai-settings') {
  // 尝试读取新键
  const newData = localStorage.getItem(newKey);
  
  if (newData) {
    try {
      const parsed = JSON.parse(newData);
      // 新键存在，使用新数据并合并默认值
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch (e) {
      console.warn('[Settings] Failed to parse new settings, using defaults:', e);
    }
  }
  
  // 新键不存在，尝试从旧键迁移
  const oldData = localStorage.getItem(oldKey);
  
  if (oldData) {
    try {
      const oldParsed = JSON.parse(oldData);
      console.info('[Settings] 检测到旧配置，开始迁移从', oldKey, '到', newKey);
      
      // 映射已知字段到新配置
      const migrated = {
        ...DEFAULT_SETTINGS,
        // 直接映射字段
        apiKey: oldParsed.apiKey ?? DEFAULT_SETTINGS.apiKey,
        baseUrl: oldParsed.baseUrl ?? DEFAULT_SETTINGS.baseUrl,
        model: oldParsed.model ?? DEFAULT_SETTINGS.model,
        maxTokens: oldParsed.maxTokens ?? DEFAULT_SETTINGS.maxTokens,
        
        // 图像相关字段
        imageModel: oldParsed.imageModel ?? DEFAULT_SETTINGS.imageModel,
        imageUseSameApi: oldParsed.imageUseSameApi ?? DEFAULT_SETTINGS.imageUseSameApi,
        imageBaseUrl: oldParsed.imageBaseUrl ?? DEFAULT_SETTINGS.imageBaseUrl,
        imageApiKey: oldParsed.imageApiKey ?? DEFAULT_SETTINGS.imageApiKey,
        
        // UI 偏好
        generationMode: oldParsed.generationMode ?? DEFAULT_SETTINGS.generationMode,
        mouseSensitivity: oldParsed.mouseSensitivity ?? DEFAULT_SETTINGS.mouseSensitivity,
        fov: oldParsed.fov ?? DEFAULT_SETTINGS.fov,
        concurrencyCount: oldParsed.concurrencyCount ?? DEFAULT_SETTINGS.concurrencyCount,
        debugMode: oldParsed.debugMode ?? DEFAULT_SETTINGS.debugMode,
      };
      
      // 保存迁移后的配置到新键
      localStorage.setItem(newKey, JSON.stringify(migrated));
      console.info('[Settings] 配置迁移完成，已保存到', newKey);
      
      // 可选：删除旧键（谨慎！这里选择保留以防万一）
      // localStorage.removeItem(oldKey);
      
      return migrated;
    } catch (e) {
      console.warn('[Settings] Failed to migrate old settings:', e);
    }
  }
  
  // 新旧键都不存在，返回默认值
  return { ...DEFAULT_SETTINGS };
}

/**
 * 保存设置到 localStorage
 * @param {Object} settings - 设置对象
 * @param {string} key - localStorage 键名
 */
export function saveSettings(settings, key = 'mc-ai-builder-settings') {
  try {
    localStorage.setItem(key, JSON.stringify(settings));
  } catch (e) {
    console.error('[Settings] Failed to save settings:', e);
  }
}

/**
 * 验证设置项是否完整
 * @param {Object} settings - 设置对象
 * @returns {Object} { valid: boolean, missing: string[] }
 */
export function validateSettings(settings) {
  const missing = [];
  
  // 检查必需字段
  if (!settings.apiKey || settings.apiKey.trim() === '') {
    missing.push('apiKey');
  }
  if (!settings.baseUrl || settings.baseUrl.trim() === '') {
    missing.push('baseUrl');
  }
  if (!settings.model || settings.model.trim() === '') {
    missing.push('model');
  }
  
  return {
    valid: missing.length === 0,
    missing,
  };
}
