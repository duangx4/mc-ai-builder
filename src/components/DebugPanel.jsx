import React, { useState, useRef, useEffect } from 'react';
import { X, Terminal, Activity, Database, Network, Cpu, Eye, Trash2, ChevronDown, ChevronRight, Copy, Download, Play, Square, Wifi, WifiOff } from 'lucide-react';
import useStore from '../store/useStore';
import { getCDPMonitor } from '../utils/cdpMonitor';

/**
 * DebugPanel - 增强版调试面板
 *
 * 功能：
 * 1. Console 日志（集成现有 DevConsoleModal）
 * 2. CDP 实时监控（浏览器事件）
 * 3. Zustand Store 状态查看
 * 4. 性能监控（FPS、内存、渲染统计）
 * 5. 网络请求追踪
 * 6. AI 会话详情
 */
export default function DebugPanel({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('console'); // console | cdp | store | performance | network | ai
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const [size, setSize] = useState({ width: 800, height: 600 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const windowRef = useRef(null);
    const scrollRef = useRef(null);

    // 各模块的数据
    const [consoleLogs, setConsoleLogs] = useState([]);
    const [cdpLogs, setCdpLogs] = useState([]);
    const [networkLogs, setNetworkLogs] = useState([]);
    const [performanceMetrics, setPerformanceMetrics] = useState({
        fps: 0,
        memory: { used: 0, total: 0 },
        renderCalls: 0,
        triangles: 0
    });

    // CDP 连接状态
    const [cdpConnected, setCdpConnected] = useState(false);
    const [cdpHost, setCdpHost] = useState('localhost');
    const [cdpPort, setCdpPort] = useState(9222);

    // Zustand store 状态
    const storeState = useStore();

    // CDP 连接管理
    const handleCDPConnect = async () => {
        const monitor = getCDPMonitor();
        const success = await monitor.connect(cdpHost, cdpPort);
        setCdpConnected(success);

        if (success) {
            // 订阅 CDP 事件
            monitor.on('console', (log) => {
                setCdpLogs(prev => [...prev, log]);
            });

            monitor.on('network', (log) => {
                setCdpLogs(prev => [...prev, log]);
            });

            monitor.on('error', (log) => {
                setCdpLogs(prev => [...prev, log]);
            });
        }
    };

    const handleCDPDisconnect = async () => {
        const monitor = getCDPMonitor();
        await monitor.disconnect();
        setCdpConnected(false);
    };

    // 拦截 console 方法
    useEffect(() => {
        if (!isOpen) return;

        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;

        console.log = (...args) => {
            originalLog(...args);
            setConsoleLogs(prev => [...prev, {
                type: 'log',
                content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '),
                timestamp: Date.now()
            }]);
        };

        console.warn = (...args) => {
            originalWarn(...args);
            setConsoleLogs(prev => [...prev, {
                type: 'warn',
                content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '),
                timestamp: Date.now()
            }]);
        };

        console.error = (...args) => {
            originalError(...args);
            setConsoleLogs(prev => [...prev, {
                type: 'error',
                content: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' '),
                timestamp: Date.now()
            }]);
        };

        return () => {
            console.log = originalLog;
            console.warn = originalWarn;
            console.error = originalError;
        };
    }, [isOpen]);

    // 拦截 fetch 请求
    useEffect(() => {
        if (!isOpen) return;

        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            const url = typeof args[0] === 'string' ? args[0] : args[0].url;

            try {
                const response = await originalFetch(...args);
                const duration = Date.now() - startTime;

                setNetworkLogs(prev => [...prev, {
                    method: args[1]?.method || 'GET',
                    url,
                    status: response.status,
                    duration,
                    timestamp: Date.now(),
                    type: 'success'
                }]);

                return response;
            } catch (error) {
                const duration = Date.now() - startTime;

                setNetworkLogs(prev => [...prev, {
                    method: args[1]?.method || 'GET',
                    url,
                    status: 0,
                    duration,
                    timestamp: Date.now(),
                    type: 'error',
                    error: error.message
                }]);

                throw error;
            }
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, [isOpen]);

    // 性能监控
    useEffect(() => {
        if (!isOpen || activeTab !== 'performance') return;

        const interval = setInterval(() => {
            // FPS 计算（简化版）
            const fps = 60; // 实际需要通过 requestAnimationFrame 计算

            // 内存使用（如果浏览器支持）
            const memory = performance.memory ? {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            } : { used: 0, total: 0 };

            // Three.js 渲染统计（需要从 renderer 获取）
            setPerformanceMetrics({
                fps,
                memory,
                renderCalls: 0,
                triangles: 0
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isOpen, activeTab]);

    // 拖动处理
    const handleMouseDown = (e) => {
        if (e.target.closest('.drag-handle')) {
            setIsDragging(true);
            const rect = windowRef.current.getBoundingClientRect();
            setDragOffset({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            });
        }
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e) => {
            setPosition({
                x: Math.max(0, e.clientX - dragOffset.x),
                y: Math.max(0, e.clientY - dragOffset.y)
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, dragOffset]);

    if (!isOpen) return null;

    const tabs = [
        { id: 'console', icon: Terminal, label: 'Console', count: consoleLogs.length },
        { id: 'cdp', icon: Activity, label: 'CDP 日志', count: cdpLogs.length },
        { id: 'store', icon: Database, label: 'Store 状态', count: 0 },
        { id: 'performance', icon: Cpu, label: '性能', count: 0 },
        { id: 'network', icon: Network, label: '网络', count: networkLogs.length },
        { id: 'ai', icon: Eye, label: 'AI 会话', count: 0 }
    ];

    const handleExport = () => {
        const data = {
            consoleLogs,
            cdpLogs,
            networkLogs,
            performanceMetrics,
            storeState: {
                blocks: storeState.blocks?.length || 0,
                messages: storeState.messages?.length || 0,
                viewMode: storeState.viewMode,
                language: storeState.language
            },
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debug-export-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div
            ref={windowRef}
            onMouseDown={handleMouseDown}
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                cursor: isDragging ? 'grabbing' : 'default'
            }}
            className="fixed z-[9999] flex flex-col rounded-xl overflow-hidden border border-purple-500/30 bg-[#0a0a0a]/95 backdrop-blur shadow-2xl shadow-black/50"
        >
            {/* Header */}
            <div className="drag-handle px-3 py-2 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-purple-900/40 to-black/60 shrink-0 cursor-grab active:cursor-grabbing select-none">
                <div className="flex items-center gap-2">
                    <div className="bg-purple-500/20 p-1 rounded">
                        <Activity size={14} className="text-purple-400" />
                    </div>
                    <h2 className="text-xs font-bold text-neutral-200 tracking-wide">调试面板</h2>
                    <span className="text-[10px] text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded-full font-mono">
                        DEV TOOLS
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleExport}
                        className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="导出调试数据"
                    >
                        <Download size={12} />
                    </button>
                    <button
                        onClick={() => {
                            setConsoleLogs([]);
                            setCdpLogs([]);
                            setNetworkLogs([]);
                        }}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                        title="清空日志"
                    >
                        <Trash2 size={12} />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-neutral-500 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/10 bg-black/20 overflow-x-auto shrink-0">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors border-b-2 whitespace-nowrap ${
                                isActive
                                    ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                                    : 'border-transparent text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                            }`}
                        >
                            <Icon size={14} />
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span className="bg-purple-500/20 text-purple-400 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'console' && <ConsolePanel logs={consoleLogs} />}
                {activeTab === 'cdp' && (
                    <CDPPanel
                        logs={cdpLogs}
                        connected={cdpConnected}
                        host={cdpHost}
                        port={cdpPort}
                        onHostChange={setCdpHost}
                        onPortChange={setCdpPort}
                        onConnect={handleCDPConnect}
                        onDisconnect={handleCDPDisconnect}
                    />
                )}
                {activeTab === 'store' && <StorePanel state={storeState} />}
                {activeTab === 'performance' && <PerformancePanel metrics={performanceMetrics} />}
                {activeTab === 'network' && <NetworkPanel logs={networkLogs} />}
                {activeTab === 'ai' && <AIPanel />}
            </div>
        </div>
    );
}

// Console 面板
function ConsolePanel({ logs }) {
    if (logs.length === 0) {
        return <EmptyState icon={Terminal} message="等待 Console 日志..." />;
    }

    return (
        <div className="space-y-2 font-mono text-xs">
            {logs.map((log, i) => (
                <div
                    key={i}
                    className={`p-2 rounded border-l-2 ${
                        log.type === 'error'
                            ? 'bg-red-500/10 border-red-500 text-red-400'
                            : log.type === 'warn'
                            ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400'
                            : 'bg-blue-500/10 border-blue-500 text-blue-400'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-1 text-[10px] opacity-70">
                        <span className="font-bold uppercase">{log.type}</span>
                        <span className="text-neutral-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <pre className="whitespace-pre-wrap break-words">{log.content}</pre>
                </div>
            ))}
        </div>
    );
}

// CDP 面板
function CDPPanel({ logs, connected, host, port, onHostChange, onPortChange, onConnect, onDisconnect }) {
    return (
        <div className="space-y-4">
            {/* 连接控制 */}
            <div className="bg-neutral-800/50 border border-white/10 rounded p-4">
                <div className="flex items-center gap-3 mb-3">
                    {connected ? (
                        <div className="flex items-center gap-2 text-green-400">
                            <Wifi size={16} />
                            <span className="text-xs font-semibold">已连接</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-neutral-500">
                            <WifiOff size={16} />
                            <span className="text-xs font-semibold">未连接</span>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="text"
                        value={host}
                        onChange={(e) => onHostChange(e.target.value)}
                        disabled={connected}
                        placeholder="Host"
                        className="flex-1 px-3 py-2 bg-black/50 border border-white/10 rounded text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                    />
                    <input
                        type="number"
                        value={port}
                        onChange={(e) => onPortChange(parseInt(e.target.value))}
                        disabled={connected}
                        placeholder="Port"
                        className="w-24 px-3 py-2 bg-black/50 border border-white/10 rounded text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
                    />
                </div>

                <div className="flex gap-2">
                    {connected ? (
                        <button
                            onClick={onDisconnect}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-xs font-medium transition-colors"
                        >
                            <Square size={12} />
                            断开连接
                        </button>
                    ) : (
                        <button
                            onClick={onConnect}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium transition-colors"
                        >
                            <Play size={12} />
                            连接
                        </button>
                    )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-neutral-500">
                        💡 启动 Chrome 时使用 <code className="bg-black/50 px-1 py-0.5 rounded">--remote-debugging-port=9222</code> 参数
                    </p>
                </div>
            </div>

            {/* 使用指南 */}
            {!connected && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3 text-sm text-blue-400">
                    <p className="font-semibold mb-2">📘 使用说明</p>
                    <div className="text-xs text-neutral-400 space-y-1">
                        <p>1. 启动带调试端口的 Chrome：</p>
                        <code className="block bg-black/50 px-2 py-1 rounded my-1 text-[10px]">
                            chrome.exe --remote-debugging-port=9222
                        </code>
                        <p>2. 点击"连接"按钮</p>
                        <p>3. 在此面板查看实时日志</p>
                    </div>
                </div>
            )}

            {/* CDP 日志 */}
            {logs.length === 0 ? (
                <EmptyState icon={Activity} message={connected ? "等待 CDP 日志..." : "请先连接到 Chrome"} />
            ) : (
                <div className="space-y-2 font-mono text-xs">
                    {logs.map((log, i) => {
                        const getLogColor = () => {
                            if (log.type === 'exception' || log.type === 'connection_error' || log.type === 'failed') return 'red';
                            if (log.type === 'console' && log.level === 'warning') return 'yellow';
                            if (log.type === 'console' && log.level === 'error') return 'red';
                            if (log.type === 'request' || log.type === 'response') return 'blue';
                            return 'purple';
                        };

                        const color = getLogColor();

                        return (
                            <div key={i} className={`p-2 rounded bg-${color}-500/10 border-l-2 border-${color}-500`}>
                                <div className="flex items-center gap-2 mb-1 text-[10px] opacity-70">
                                    <span className={`font-bold uppercase text-${color}-400`}>{log.type}</span>
                                    {log.level && <span className="text-neutral-500">{log.level}</span>}
                                    {log.timestamp && (
                                        <span className="text-neutral-600 ml-auto">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                                <pre className={`whitespace-pre-wrap break-words text-${color}-400 text-[10px]`}>
                                    {JSON.stringify(log, null, 2)}
                                </pre>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Store 状态面板
function StorePanel({ state }) {
    const [expandedKeys, setExpandedKeys] = useState(new Set());

    const toggleKey = (key) => {
        setExpandedKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    // 过滤掉函数，只显示数据
    const stateData = Object.entries(state).filter(([key, value]) => typeof value !== 'function');

    return (
        <div className="space-y-2 font-mono text-xs">
            {stateData.map(([key, value]) => {
                const isExpanded = expandedKeys.has(key);
                const isComplex = typeof value === 'object' && value !== null;
                const preview = isComplex
                    ? Array.isArray(value)
                        ? `Array(${value.length})`
                        : `Object(${Object.keys(value).length})`
                    : String(value);

                return (
                    <div key={key} className="bg-neutral-800/50 rounded overflow-hidden border border-white/5">
                        <div
                            onClick={() => isComplex && toggleKey(key)}
                            className={`flex items-center gap-2 p-2 ${isComplex ? 'cursor-pointer hover:bg-white/5' : ''}`}
                        >
                            {isComplex && (
                                isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
                            )}
                            <span className="text-cyan-400 font-semibold">{key}</span>
                            <span className="text-neutral-500 text-[10px]">{typeof value}</span>
                            <span className="text-neutral-400 ml-auto">{preview}</span>
                        </div>
                        {isExpanded && isComplex && (
                            <div className="p-2 bg-black/30 border-t border-white/5">
                                <pre className="whitespace-pre-wrap break-words text-neutral-300 text-[10px]">
                                    {JSON.stringify(value, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// 性能监控面板
function PerformancePanel({ metrics }) {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {/* FPS */}
                <MetricCard
                    label="FPS"
                    value={metrics.fps}
                    unit=""
                    color="green"
                    icon={Activity}
                />
                {/* 内存 */}
                <MetricCard
                    label="内存使用"
                    value={metrics.memory.used}
                    max={metrics.memory.total}
                    unit="MB"
                    color="blue"
                    icon={Database}
                />
                {/* 渲染调用 */}
                <MetricCard
                    label="渲染调用"
                    value={metrics.renderCalls}
                    unit="calls"
                    color="purple"
                    icon={Cpu}
                />
                {/* 三角形数 */}
                <MetricCard
                    label="三角形数"
                    value={metrics.triangles}
                    unit="triangles"
                    color="orange"
                    icon={Activity}
                />
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3 text-sm text-yellow-400">
                <p className="font-semibold mb-2">💡 提示</p>
                <p className="text-xs text-neutral-400">
                    性能监控需要集成 Three.js renderer 的统计信息。可以通过 <code className="bg-black/50 px-1 py-0.5 rounded">renderer.info</code> 获取详细数据。
                </p>
            </div>
        </div>
    );
}

// 网络请求面板
function NetworkPanel({ logs }) {
    if (logs.length === 0) {
        return <EmptyState icon={Network} message="等待网络请求..." />;
    }

    return (
        <div className="space-y-2 font-mono text-xs">
            {logs.map((log, i) => (
                <div
                    key={i}
                    className={`p-2 rounded border-l-2 ${
                        log.type === 'error'
                            ? 'bg-red-500/10 border-red-500'
                            : log.status >= 400
                            ? 'bg-yellow-500/10 border-yellow-500'
                            : 'bg-green-500/10 border-green-500'
                    }`}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`font-bold ${
                            log.type === 'error' ? 'text-red-400' : log.status >= 400 ? 'text-yellow-400' : 'text-green-400'
                        }`}>
                            {log.method}
                        </span>
                        <span className="text-neutral-400 flex-1 truncate">{log.url}</span>
                        <span className="text-neutral-500 text-[10px]">{log.duration}ms</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            log.status >= 400 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                            {log.status || 'ERR'}
                        </span>
                    </div>
                    {log.error && (
                        <div className="text-red-400 text-[10px] mt-1">{log.error}</div>
                    )}
                </div>
            ))}
        </div>
    );
}

// AI 会话面板
function AIPanel() {
    const messages = useStore(state => state.messages || []);

    return (
        <div className="space-y-2">
            {messages.length === 0 ? (
                <EmptyState icon={Eye} message="等待 AI 会话..." />
            ) : (
                messages.map((msg, i) => (
                    <div key={i} className={`p-3 rounded border ${
                        msg.role === 'user'
                            ? 'bg-cyan-500/10 border-cyan-500/30'
                            : 'bg-green-500/10 border-green-500/30'
                    }`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-bold uppercase">{msg.role === 'user' ? '👤 用户' : '🤖 AI'}</span>
                            {msg.variants && (
                                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">
                                    {msg.variants.length} 变体
                                </span>
                            )}
                        </div>
                        <div className="text-xs text-neutral-300 whitespace-pre-wrap">
                            {typeof msg.content === 'string' ? msg.content.slice(0, 200) : ''}
                            {msg.content?.length > 200 && '...'}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

// 指标卡片
function MetricCard({ label, value, max, unit, color, icon: Icon }) {
    const percentage = max ? Math.round((value / max) * 100) : null;
    const colorClasses = {
        green: 'bg-green-500/10 border-green-500/30 text-green-400',
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400'
    };

    return (
        <div className={`p-4 rounded border ${colorClasses[color]}`}>
            <div className="flex items-center gap-2 mb-2">
                <Icon size={16} />
                <span className="text-xs font-semibold uppercase">{label}</span>
            </div>
            <div className="text-2xl font-bold font-mono">
                {value}
                {max && <span className="text-sm text-neutral-500"> / {max}</span>}
                <span className="text-sm ml-1 font-normal">{unit}</span>
            </div>
            {percentage !== null && (
                <div className="mt-2 h-1 bg-black/30 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-current transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            )}
        </div>
    );
}

// 空状态
function EmptyState({ icon: Icon, message }) {
    return (
        <div className="h-64 flex flex-col items-center justify-center text-neutral-600">
            <Icon size={48} className="mb-3 opacity-20" />
            <p className="text-sm">{message}</p>
        </div>
    );
}
