# MC AI Builder v2 — P1-④ 材质直通任务书（2026-08-29）

> 任务发起：OpenClaw | 执行：Claude Code（cwd 本仓库）
> 范围：P1 收官——**材质直通**：1300+ 本地材质库（生成 + 分类）+ 一致性铁律 + 精选注入 + searchMaterial 按需检索。目标版本 1.20.1（用户主玩）。

## 0. 铁律

1. 只在本仓库内工作；只增强不破坏（风格知识保留现状，材质层新增）。
2. 复用数据源：`src/utils/blocks_1_21.json`（方块 id 全集，object 键约 1088 个）、`src/utils/validBlocks.js`、`public/minecraft-1.20.1/lang/en_us.json`（`block.*` 键给英文名）。不重造。
3. 每类提交（中文信息）；`npm test` 全绿（129 现有 + 新增）；lint 新文件零 error；冒烟 3001/5173。
4. 中文注释。生成脚本放 `scripts/`（参考现有脚本风格）。

## 1. 现状

- `blocks_1_21.json`：object，键 = 全部方块 id（含变体 stairs/slab/wall/16 色羊毛/混凝土/玻璃/陶瓦/蜡烛 等），值 = array[2]（版本数据）。
- `ai.js` `fetchAIResponseStream`：detectStyle 命中 → 把风格 knowledge 注入 system prompt（保留，不动）。
- `agentLoopV2.js` AGENT_TOOLS_V2：已有 6 技能 read 工具（read_skill/read_subdoc 体系）+ analyzeScene/analyzeStructure；新工具在此登记（工具执行器 executeToolV2 加分支或复用现有机制）。
- `sandbox.js` 已有 `randomAt`（位置确定性伪随机，用于自然散布）——**保留**；"删逐块随机"体现在提示词铁律层面（禁止材质随机混搭），不改 sandbox 执行语义。

## 2. 设计

### 2.1 材质库生成 `scripts/build-material-library.mjs` → `src/utils/materialLibrary.js`

- 输入：blocks_1_21.json 的 id 全集 + `public/minecraft-1.20.1/lang/en_us.json`（读取 `block.minecraft.<id>` 键英文名，缺名回退 id）。
- **分类**（从 id 后缀/词干推断，覆盖主流族）：
  - woods（oak/spruce/birch/jungle/acacia/dark_oak/mangrove/cherry/crimson/warped/bamboo 的 plans/log/wood/stripped/slab/stairs/fence/gate/door/trapdoor/sign…）
  - stones（stone/andesite/diorite/granite/deepslate/tuff/blackstone/basalt 各系 + brick/slab/stairs/wall/polished/chiseled…）
  - concrete（16 色 + powder）、wool（16 色）、terracotta（16 色 + glazed）、glass（+stained 16 色/pane）、metals（iron/gold/copper 系 + raw block + netherite + quartz/ancient_debris）、redstone 系、natural（dirt/sand/gravel/leaves/grass…）、misc（其余）
- 输出 `materialLibrary.js`：`export const MATERIAL_LIBRARY = [...]`（每条 `{ id, name, category, tags }`）+ `export const MATERIAL_CATEGORIES = [...]`；**条目数 ≥1300**（id 全集约 1088 + 若不足则按"族 × 构件"补展开变体 id 清单——用全量 id 已经含变体，统计后若 <1300 说明差异，把 1.20.1 与 1.21 差异方块也纳入并标记 version）
- 运行时校验：`MATERIAL_LIBRARY.length >= 1300` 且 id 唯一（测试里断言）
- 脚本可重复跑（幂等），产物提交进仓库

### 2.2 一致性铁律 `src/utils/materialRules.js`（或并入 prompts.js，以整洁为准）

导出 `MATERIAL_RULES_TEXT`，注入 SYSTEM_PROMPT 尾部（ai.js 组装处或 prompts.js 拼接）：
1. **一个主材质族**：整栋建筑选 1 个主材族（如橡木族），至多 2 个辅材（基座石材/玻璃窗），跨区块统一（P1-②③ 衔接的材质侧约束）
2. **结构件对应类别**：柱/支撑→log 或石柱类；墙→planks/stone_bricks；檐口→stairs；地面/台阶→slab/stairs；门→door；窗→glass_pane
3. **确定性**：禁止逐块随机混搭材质；`randomAt` 仅允许用于同材质族的自然散布（植被/风化/苔藓点缀）；同一构件全建筑统一材质
4. **原版 id**：一律用原版方块 id（1.20.1 兼容），禁止臆造方块名
5. **不一致即返工**：验证阶段（P1-① validation）发现跨区块材质族冲突 → 进 refinement 修复

### 2.3 searchMaterial 工具（read 类）

- AGENT_TOOLS_V2 登记 `searchMaterial`：入参 `query`（材质名/类别/用途词），返回 ≤20 条匹配（id/name/category，按匹配度排序：id 前缀 > name 包含 > category）
- 执行器：纯函数 `searchMaterial(query, library = MATERIAL_LIBRARY)`（新文件 `src/utils/materialSearch.js` 导出，供工具与测试复用）
- 加入 planning/construction 阶段允许工具（检查 smartEngine 的 getAllowedTools 是否有白名单机制，有则加）

### 2.4 精选注入（省 token）

- prompts.js / ai.js：系统提示加入「常用材质速查」——每类别 Top 6 常用条目（约 120 条精选，硬编码精选表或从库按 category 取前 N），并说明「完整材质库用 searchMaterial 查询」
- 不注入全量 1300+（token 爆炸）

## 3. 测试（vitest，新增 ≥15 断言）

- materialLibrary：`length >= 1300`；id 唯一；categories 覆盖 ≥10 类；抽查主流 id 存在（oak_planks/stone_bricks/white_concrete/glass/iron_block…）
- materialSearch：精确 id 命中 / 名称部分匹配 / 类别查询（"wool" 返回 16 色）/ 空 query 返回空 / 无结果空数组；结果 ≤20
- 铁律/工具集成：searchMaterial 在工具 schema 中注册（若有 schema 测试）、smartEngine planning 允许工具含 searchMaterial（若提供 getAllowedTools）

## 4. 实施顺序与提交

1. `feat: 材质库生成脚本 + materialLibrary.js（≥1300 条分级分类）+ 测试`
2. `feat: 材质直通——MATERIAL_RULES 一致性铁律注入 + searchMaterial 工具 + 精选速查 + 测试`

## 5. 交付

- 提交清单；材质库实际条数；新增断言数；lint；冒烟（3001/5173）
- 分类统计（各 category 数量）；1.20.1 兼容说明（id 是否 1.20.1 全集）
- 留给用户手动验证项（smart 模式生成建筑看材质一致性、searchMaterial 在思考面板可见）