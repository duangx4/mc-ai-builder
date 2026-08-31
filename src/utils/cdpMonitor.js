/**
 * CDP Monitor - Chrome DevTools Protocol 监控工具
 *
 * 功能：
 * 1. 自动连接到 Chrome CDP
 * 2. 监听 Console、Network、Performance 事件
 * 3. 实时推送到 DebugPanel
 */

import CDP from 'chrome-remote-interface';

class CDPMonitor {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.listeners = {
            console: [],
            network: [],
            performance: [],
            error: []
        };
    }

    /**
     * 连接到 Chrome DevTools Protocol
     * @param {string} host - CDP 主机地址
     * @param {number} port - CDP 端口
     */
    async connect(host = 'localhost', port = 9222) {
        try {
            this.client = await CDP({ host, port });
            this.isConnected = true;

            const { Console, Network, Performance, Runtime } = this.client;

            // 启用各个域
            await Promise.all([
                Console.enable(),
                Network.enable(),
                Performance.enable(),
                Runtime.enable()
            ]);

            // 监听 Console 消息
            Console.messageAdded((params) => {
                this._emit('console', {
                    type: 'console',
                    level: params.message.level,
                    text: params.message.text,
                    url: params.message.url,
                    line: params.message.line,
                    timestamp: params.message.timestamp
                });
            });

            // 监听网络请求
            Network.requestWillBeSent((params) => {
                this._emit('network', {
                    type: 'request',
                    requestId: params.requestId,
                    url: params.request.url,
                    method: params.request.method,
                    timestamp: params.timestamp
                });
            });

            Network.responseReceived((params) => {
                this._emit('network', {
                    type: 'response',
                    requestId: params.requestId,
                    url: params.response.url,
                    status: params.response.status,
                    mimeType: params.response.mimeType,
                    timestamp: params.timestamp
                });
            });

            Network.loadingFailed((params) => {
                this._emit('network', {
                    type: 'failed',
                    requestId: params.requestId,
                    errorText: params.errorText,
                    timestamp: params.timestamp
                });
            });

            // 监听运行时异常
            Runtime.exceptionThrown((params) => {
                this._emit('error', {
                    type: 'exception',
                    text: params.exceptionDetails.text,
                    url: params.exceptionDetails.url,
                    line: params.exceptionDetails.lineNumber,
                    column: params.exceptionDetails.columnNumber,
                    timestamp: params.timestamp
                });
            });

            console.log(`[CDP Monitor] Connected to ${host}:${port}`);
            return true;
        } catch (error) {
            this.isConnected = false;
            console.error('[CDP Monitor] Connection failed:', error.message);
            this._emit('error', {
                type: 'connection_error',
                message: error.message,
                timestamp: Date.now()
            });
            return false;
        }
    }

    /**
     * 断开连接
     */
    async disconnect() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.isConnected = false;
            console.log('[CDP Monitor] Disconnected');
        }
    }

    /**
     * 订阅事件
     * @param {string} event - 事件类型：console, network, performance, error
     * @param {Function} callback - 回调函数
     * @returns {Function} 取消订阅函数
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            throw new Error(`Unknown event type: ${event}`);
        }

        this.listeners[event].push(callback);

        // 返回取消订阅函数
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }

    /**
     * 触发事件
     * @private
     */
    _emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`[CDP Monitor] Listener error:`, error);
                }
            });
        }
    }

    /**
     * 执行 JavaScript 代码
     * @param {string} expression - JS 表达式
     * @returns {Promise<any>} 执行结果
     */
    async evaluate(expression) {
        if (!this.client) {
            throw new Error('Not connected to CDP');
        }

        const { Runtime } = this.client;
        const result = await Runtime.evaluate({ expression });

        if (result.exceptionDetails) {
            throw new Error(result.exceptionDetails.text);
        }

        return result.result.value;
    }

    /**
     * 获取性能指标
     * @returns {Promise<Object>} 性能指标
     */
    async getPerformanceMetrics() {
        if (!this.client) {
            throw new Error('Not connected to CDP');
        }

        const { Performance } = this.client;
        const metrics = await Performance.getMetrics();

        return metrics.metrics.reduce((acc, metric) => {
            acc[metric.name] = metric.value;
            return acc;
        }, {});
    }

    /**
     * 截图
     * @returns {Promise<string>} Base64 编码的 PNG 图片
     */
    async screenshot() {
        if (!this.client) {
            throw new Error('Not connected to CDP');
        }

        const { Page } = this.client;
        await Page.enable();
        const screenshot = await Page.captureScreenshot();
        return screenshot.data;
    }
}

// 单例
let instance = null;

export function getCDPMonitor() {
    if (!instance) {
        instance = new CDPMonitor();
    }
    return instance;
}

export default CDPMonitor;
