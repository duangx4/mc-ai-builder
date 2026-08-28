# Lint 技术债务清单（2026-08-28）

## 总览

- **总错误数**: 159 errors + 1 warning
- **策略**: 存量债务记录，新代码零 error
- **原因**: 错误数超过 30，且多为历史遗留问题，不为清存量大规模改码

---

## 分类统计

### 1. Node.js 环境问题（scripts/ 目录）
**原因**: scripts 是 Node.js 脚本，需要 `require`/`__dirname`/`process` 全局变量，但 eslint 当前配置为浏览器环境

**文件列表**:
- `scripts/fetch-official-blocks.js`: 5 errors (require, __dirname)
- `scripts/final-config-output.js`: 1 error (parsing error - 编码问题)
- `scripts/gen-mappings.js`: 8 errors (require, __dirname, unused vars)
- `scripts/generate-final-mappings.js`: 6 errors (require, __dirname, unused vars)
- `scripts/test-metadata-conversion.js`: 1 error (process)
- `scripts/update-version-config.js`: 3 errors (require, __dirname)
- `scripts/validate-blocks.js`: 6 errors (require, __dirname)

**小计**: ~30 errors

**解决方案**: 需要在 eslint.config.js 中为 scripts/ 和 server.js 添加 Node.js 环境配置

---

### 2. server.js - Node.js 服务端
**错误数**: 13 errors

**主要问题**:
- `process` is not defined (7 处)
- unused vars: `e`, `err`, `isNew` (5 处)
- Empty catch block (1 处)

**解决方案**: 同样需要 Node.js 环境配置

---

### 3. src/App.jsx - 主应用文件（151KB）
**错误数**: 19 errors + 1 warning

**主要问题**:
- unused vars (15 处): `exportToMcFunction`, `selectedVersion`, `streamingText`, `addBlocksFromStream`, 等
- React hooks 问题:
  - `camera.fov = fov` 修改 hook 返回值 (不可变性)
  - `useEffect` missing dependency: `blocks`
- Empty block statement (1 处)
- `settings` is not defined (1 处)

**策略**: 大文件不做激进修改，部分可加 `eslint-disable-next-line` 注释

---

### 4. 迁移源文件（docs/migration-sources/）
**文件**:
- `docs/migration-sources/js/image-preview.js`: 4 errors (unused vars)
- `docs/migration-sources/js/prompt-optimizer.js`: 1 error (unused var)

**小计**: 5 errors

**说明**: 这些是从旧版迁移的参考文件，不在生产代码路径中

---

### 5. src/utils/ - 工具库
**主要问题**: unused vars, no-case-declarations

**文件列表**:
- `src/utils/ai.js`: 1 error (unused var `onProgress`)
- `src/utils/architectureEngine.js`: 18 errors
  - no-case-declarations (多个 case 块)
  - unused vars: `hashRandom`, `getVoxel`, `isSemantic`
- `src/utils/exporter.js`: 6 errors
  - unused vars, no-useless-escape, no-control-regex
- `src/utils/parser.js`: 2 errors (unused vars: `id`, `processed`)
- `src/utils/sandbox.js`: 6 errors
  - unused vars: `slabType`, `key`, `width`
- `src/utils/twoStepAI.js`: 1 error (`finalScript` not defined)
- `src/utils/versionConfig.js`: 1 error (unused var `targetConfig`)

**小计**: ~35 errors

---

## 修复计划

### 立即修复（低风险）
1. **eslint.config.js 补充**: 为 `scripts/**/*.js` 和 `server.js` 添加 Node.js 环境
   - 这将消除约 43 个 Node.js 相关错误

### 逐步修复（中等风险）
2. **utils/ 中的 unused vars**: 评估是否可删除或改名为 `_varName`（表示有意未使用）
3. **architectureEngine.js 的 case 声明**: 用 `{}` 包裹 case 块创建作用域

### 延后处理（高风险）
4. **App.jsx**: 仅修复明显的未使用变量，React hooks 问题需要仔细测试
5. **迁移源文件**: 可忽略或添加 `.eslintignore`

---

## 新代码标准

**从本次迁移后，所有新增/修改的代码必须**:
- `npm run lint` 零 error
- 正确使用 React hooks 依赖数组
- 避免修改 hook 返回的不可变对象
- 正确命名有意未使用的变量（加 `_` 前缀或符合 `/^[A-Z_]/` 规则）

---

## 打包链配置缺口评估（2026-08-28）

### 现状分析

**package.json 配置**:
- ✅ 已定义 electron-builder 构建脚本
- ✅ 已安装 electron 和 electron-builder 依赖
- ⚠️ `main` 字段指向 `electron/main.js`，但该文件不存在
- ⚠️ 引用不存在的 `electron-builder.json` 配置文件

**构建脚本**:
- `electron:build`: 先 vite build，再 electron-builder
- `pack`: 同上，但只打包目录（--dir）
- `dist`: 完整打包为安装程序

**server-pkg.cjs 分析**:
- ✅ 已实现 pkg 打包路径处理逻辑（`process.pkg` 判断）
- ✅ 已处理静态文件服务（dist 目录）
- ✅ 已处理数据目录（structures、skills）

### 配置缺口清单

#### 1. 缺失 Electron 主进程文件
**文件**: `electron/main.js`（或其他位置）

**影响**: electron:dev / electron:build 无法运行

**需要补充**:
- Electron 窗口初始化
- 加载 Vite dev server（开发模式）或 dist/index.html（生产模式）
- 集成 Express 服务器启动（server.js 或 server-pkg.cjs）
- IPC 通信（如果需要）

#### 2. 缺失 electron-builder 配置
**文件**: `electron-builder.json`

**影响**: electron-builder 使用默认配置，可能不符合需求

**需要补充**:
- `appId`: 应用唯一标识（如 `com.minecraft.ai-builder`）
- `productName`: 产品显示名称
- `directories.output`: 输出目录（默认 `dist-electron`）
- `files`: 需要打包的文件列表
  - dist/**
  - server.js 或 server-pkg.cjs
  - src/structures/**
  - src/skills/**
  - node_modules（electron-builder 会自动处理生产依赖）
- `extraResources`: 额外资源（data、docs 等）
- `asar`: 是否打包为 asar 归档（推荐 `true`）
- `icon`: 应用图标路径
  - Windows: .ico 文件
  - macOS: .icns 文件
  - Linux: .png 文件
- `win`: Windows 平台配置
  - `target`: 目标格式（nsis、portable、zip 等）
- `mac`: macOS 平台配置
- `linux`: Linux 平台配置

#### 3. 图标资源缺失
**路径**: `build/icon.{ico,icns,png}`

**影响**: 打包后应用使用默认 Electron 图标

**需要准备**:
- Windows: 256x256 .ico 文件
- macOS: 512x512 .icns 文件
- Linux: 512x512 .png 文件

#### 4. Express 服务器集成
**当前状态**: server.js 作为独立 Node.js 服务运行

**打包集成方案**:
1. **选项 A（推荐）**: Electron 主进程启动内嵌 Express
   - 在 electron/main.js 中 `require('./server.js')`
   - 优点：单一进程，简化部署
   
2. **选项 B**: 使用 pkg 打包 server.js 为独立可执行文件
   - electron-builder 将其作为 extraResources
   - 主进程通过 `child_process.spawn` 启动
   - 优点：隔离性好，便于调试

#### 5. 依赖清理
**问题**: package.json dependencies 包含开发工具依赖（如 @vitejs/plugin-react）

**影响**: electron-builder 会将所有 dependencies 打包，增大体积

**建议**:
- 审查 dependencies，确认哪些是运行时必需的
- 将构建工具移至 devDependencies
- 运行时需要的（express、zustand、three.js 等）保留在 dependencies

#### 6. Vite 构建产物路径
**当前**: `dist/` 目录

**electron-builder 需要**:
- 确认 `dist/index.html` 正确引用资源（相对路径）
- Electron 加载 `file://${__dirname}/dist/index.html`

### 优先级建议

**P0 - 必须补充才能打包**:
1. 创建 `electron/main.js`
2. 创建 `electron-builder.json` 基础配置（至少包含 appId 和 files）

**P1 - 打包成功但体验不完整**:
3. 准备应用图标
4. 优化依赖列表（减小体积）

**P2 - 可选优化**:
5. 添加自动更新配置（electron-updater）
6. 代码签名配置（Windows/macOS 需要证书）

### 下一步行动

**建议在独立任务中执行**（不在本轮 P0 工程化中）:
1. 创建 electron/main.js 并测试 `npm run electron:dev`
2. 创建 electron-builder.json 并测试 `npm run pack`
3. 准备图标资源
4. 执行完整打包 `npm run dist` 并在目标平台测试安装程序

**预估工作量**: 2-4 小时（假设熟悉 Electron 开发）
