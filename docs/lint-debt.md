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
