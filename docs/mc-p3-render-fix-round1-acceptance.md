# 任务书：渲染修复轮——CDP 实测验收 + 提交

> 仓库：mc-ai-builder-v2 | 承接：docs/mc-p3-render-fix-round1.md + RENDER_FIX_SUMMARY.md（代码已写完，vitest 288 通过，build 通过，尚未验收+未提交）

## 背景

上一轮已完成代码（`RENDER_FIX_SUMMARY.md` 记录）：
- Torch/Lantern 组合造型（杆+火焰头 / 挂钩+灯体）
- 栅栏/墙横杆几何修正（柱边到柱边、fence 双横杆）
- Fence_gate 渲染（cleanBlockType 清洗 `[props]` 后缀 + gate shape）
- 点光源（≤10 个，lantern/torch 附近）
- 相机自动适配建筑（生成完成/清空时聚焦）

`git status` 当前未提交改动：
```
M src/components/VoxelWorld.jsx
M src/utils/textureMapping.js
?? RENDER_FIX_SUMMARY.md
?? docs/mc-p3-render-fix-round1.md
?? src/utils/blockShape.test.js
```

## 你的任务

### 1. 静态验收
- `npm test`（vitest run）全绿，确认 ≥288 个测试通过
- `npm run build` 通过

### 2. CDP 实测验收
- 前后端已在跑：前端 http://localhost:5173（vite dev），后端 :3001
- 用 Chrome DevTools Protocol 或直接打开浏览器（如果环境有 puppeteer/playwright 依赖就用；没有就检查 package.json 有没有相关工具，没有则跳过自动化截图，改为手动描述你在代码层面确认的逻辑正确性，并在报告里明确标注"未做浏览器实测，原因：环境无 puppeteer/playwright"）
- 若能跑通：在页面输入 prompt 生成"前院栅栏+栅栏门+梁下挂灯笼+墙插火把"场景，截图，检查：
  - 火把有杆+火焰头（非单一色块）
  - 灯笼有挂钩+半透明灯体
  - 栅栏横杆连续对齐（非穿柱）
  - 栅栏门可见（非纯色 full 块）
  - 相机自动聚焦到建筑中心
  - 点光源产生暖黄光晕

### 3. 提交（验收通过后才做）
- 如果 vitest + build 通过，且（CDP 实测通过 或 明确判定为静态代码审查通过、逻辑无误）：
  - `git add src/components/VoxelWorld.jsx src/utils/textureMapping.js src/utils/blockShape.test.js RENDER_FIX_SUMMARY.md docs/mc-p3-render-fix-round1.md docs/mc-p3-render-fix-round1-acceptance.md`
  - commit message: `feat: 小件真造型 + 栅栏修正 + 栅栏门 + 点光源 + 相机适配`
  - 不要 push，只 commit 到本地
- 如果测试/build 不过，或发现明显逻辑 bug：不要提交，在报告里写清楚问题，等待下一轮修复

## 输出

在 `docs/` 下写一份简短验收报告 `mc-p3-render-fix-round1-acceptance-report.md`：
- 测试/build 结果
- CDP 实测结果（或说明跳过原因）
- 是否提交，commit hash（如有）
- 发现的问题（如有）

## 约束

- 不要修改验收范围外的文件
- 中文注释/文档
- 不要 push 远程
