# 任务书：P3-② 屋顶生成器 builder.roof + 状态方块方向体系 + 渲染升级

> 仓库：mc-ai-builder-v2 | 日期：2026-08-29 | 定位：解决古建屋顶方向正确性（核心） + 灯笼等小件渲染 + 栅栏连接状态
> **允许修改**：`src/utils/sandbox.js`（builder.roof/stairs/slab 原语）、`src/utils/smartEngine.js`（提示词注入 roof 说明）、`src/components/VoxelWorld.jsx`（渲染升级）、新建 `src/utils/blockConnections.js`（纯函数）、新建 `src/utils/sandboxRoof.test.js` 与 `src/utils/blockConnections.test.js`
> **背景**：用户三连报——① 台阶/半砖/栅栏等状态方块生成时不考虑方向与连接 ② 灯笼等高精度小物件渲染不出来 ③ 古建屋顶 = 大量台阶+半砖复杂组合、每个方向不能错，问怎么保证。结论：屋顶方向由**算法生成器**保证（模型只选样式/尺寸），渲染层补小件形状与栅栏连接。

## 一、核心设计哲学

**规则几何交给算法，模型只做选择题**。古建屋顶是高度规则几何（每层内收固定格数、台阶方向统一朝坡向）——LLM 逐块手写必然错方向；改由 `builder.roof()` 系统级生成器产出整片合格屋顶，`builder.stairs/slab` 便捷原语降低手写出错面，渲染层把方向/连接/小件形状真实画出来。

## 二、A 部分：沙盒原语（sandbox.js）

### A1. `builder.roof(x0, z0, x1, z1, options)` — 系统级屋顶生成器

参数：
- `x0,z0,x1,z1`：屋顶**外框**（含挑檐后）——矩形区域，需 x0≤x1, z0≤z1（自动排序）
- `options`：
  - `style`: `'gable'`（双坡硬山/悬山，默认）| `'hip'`（四坡庑殿）| `'pyramid'`（攒尖方锥）
  - `material`: 瓦片材质（默认 `'gray_concrete'`）
  - `frame`: 檩条/屋脊材质（默认 `'dark_oak_planks'`）
  - `baseY`: 屋顶底面 y（默认**自动检测**：扫描区域内最高非 AIR 块的 y+1，无则抛错提示）
  - `eaves`: 挑出格数（默认 0，即外框=墙体顶面外扩；>0 表示外框已含挑出，瓦面从外框开始）
  - `slope`: 坡度（默认 45°，即每升高 1 层水平内收 1 格）

算法（关键：**方向由算法保证**）：
1. 自动 baseY：遍历区域 (x0..x1, z0..z1) 找最大 y 的非 AIR 块，baseY = 其 y+1
2. **gable 双坡**：
   - 屋脊方向 = 较长边方向（若 x 跨度 ≥ z 跨度 → 屋脊沿 X，坡向为 Z；否则沿 Z，坡向为 X）
   - 层数 N = floor(坡向跨度 / 2 / slopeStep)，slopeStep = 1（45°）
   - 第 i 层（i=0 最底）矩形 = 外框在**坡向两端**各内收 i 格
   - 每层放置：**外圈一圈台阶** `builder.stairs`（facing 统一朝向坡外侧：Z 坡向 → 南北侧 facing=north/south 各按侧；X 坡向 → east/west）——**同层同侧 facing 完全一致**；中间区域填 `material` 实心
   - 顶层（最后 1 层）收成屋脊：一排 `frame` 方块（屋脊梁，长度 = 屋脊方向跨度）
   - 檐口：最底层外圈下方补一圈 `frame` 檩条（y=baseY-1）做檐口支撑（若有 eaves 则含挑出格）
3. **hip 四坡**：
   - 每层矩形**四边各内收 i 格**（四坡同时收）
   - 每层外圈四边台阶：neighboring 边 facing 朝各自外侧（北边 facing=north，南边 facing=south，东边 facing=east，西边 facing=west）——**每个边朝向统一**
   - 顶层收成一行屋脊（沿长边）或一点（方形区域收成 1 格尖 + 尖上放 `frame`）
4. **pyramid 攒尖**：
   - 与 hip 相同收法，但顶层收成**1 块**（尖顶），尖上放一个 `frame` 块（宝顶）
5. 所有方块走 `this.set(x,y,z,type,{properties})`——台阶必须带 `facing=...,half=bottom` properties（渲染已支持）
6. 返回放置总数；非法参数（负跨度/未知 style）抛明确错误
7. **性能**：区域 > 40×40 时直接用三重循环逐层生成（每层 O(周长)），预计 ≤2000 块 <100ms

### A2. 便捷原语
- `builder.stairs(x, y, z, type, facing, half='bottom')` → 内部 set + properties `facing=...,half=...`（facing 仅接受 n/s/e/w/north/south/east/west 8 种，非法抛错）
- `builder.slab(x, y, z, type, half='bottom')` → set + `half=bottom|top`
- 两个都返回 set 结果

### A3. 状态校验（轻量，观察性）
- `src/utils/blockConnections.js` 导出 `validateBlockStates(blocks)`：
  - 统计：stairs 无 facing 的数量 / fence·wall 无连接推断的数量 / slab 无 half 数量
  - 纯函数：输入 blocks 数组 → `{ total, noFacingStairs, noConnFence, noHalfSlab, ok }`
- sandbox `executeVoxelScript` 返回前调用一次，结果附在返回值 `validation` 字段（不抛错，不阻塞）

## 三、B 部分：渲染升级（VoxelWorld.jsx）

### B1. 小件形状通道（灯笼/火把/蜡烛/花盆）
现状：TexturedInstancedBlocks 全部画 1×1×1 整砖 `boxGeometry`，BLOCK_SHAPES（行 98 起，含 lantern 0.375/0.5625、torch 0.125、candle、flower_pot 等) 主路径未用。
改法（在 TexturedInstancedBlocks 内）：
1. `const shapeType = getBlockShape(blockType); const shape = BLOCK_SHAPES[shapeType]`
2. `shape.size` 非 [1,1,1] 时：`boxGeometry args={shape.size}`，`<mesh position/instanceMatrix>` 每个实例矩阵**额外平移 offset**（现有矩阵赋值处：把 `shape.offset` 加到 position）+ 材质：**USE_FALLBACK_ONLY 小件一律 fallbackColor 纯色**（lantern #e8a93c 已在 FALLBACK_COLORS）；发光小件（lantern/torch 在 GLOW_BLOCKS）保持 MeshBasic 明亮
3. 分组不受影响（blocksByTexture 已按 type 分组，同组 shape 必然一致）
4. 注意：instancedMesh 的 geometry 用 boxGeometry(size)——offset 必须用实例矩阵平移（不能用 geometry translate，instanced 共享）

### B2. 栅栏/墙连接推断 + 渲染
1. 新纯函数（blockConnections.js）`inferConnections(blocks)`：
   - 对 `_fence`（非 fence_gate）/ `_wall`（非 wall_ *）类型方块：查 4 邻居（同族：fence 连 fence，wall 连 wall）→ 返回 Map<posKey, {n,s,e,w:boolean}>（或直接给 block 打 `__conn` 字段）
   - 纯函数可测；输入 blocks 数组 → 输出增强后的 blocks（不突变，返回新数组或 Map）
2. VoxelWorld 渲染：fence/wall 组（blocksByTexture 已有）在 TexturedInstancedBlocks 内，若 shapeType==='fence'|'wall'：
   - 用 3 个 instancedMesh 组合：**柱**（所有实例：fence 0.1875³，wall 0.5×1×0.5）、**NS 横杆**（仅连接 n/s 的实例：fence 0.1875×0.75×0.625 位于 ±z，wall 0.5×0.5×0.5 半高）——**简化：两个方向各一根横杆足以表达连接**（E/W 一组、N/S 一组），不做 L/T/十字独立几何（横杆叠加自然形成）
   - 位置：柱在块中心；横杆沿对应轴偏移（fence：Y 中心 0.5625，X/Z ±0.25）
   - 材质与现有一致（fallbackColor / 贴图逻辑不变）
3. stairs 渲染不变（getStairTransform 已正确）

### B3. 提示词注入（smartEngine.js）
construction 强指令末尾追加（roof 说明）：
```
## 屋顶生成器（推荐）
需要屋顶时优先调用 builder.roof()，方向完全由算法保证，禁止再逐块手写台阶：
builder.roof(x0, z0, x1, z1, { style: 'gable'|'hip'|'pyramid', material: 'gray_concrete', frame: 'dark_oak_planks', baseY: 墙顶高度, eaves: 1 })
示例：中式硬山顶，面阔 9 进深 7，屋顶外框 (0,0,8,6)，baseY 5，brown 瓦：
builder.roof(0, 0, 8, 6, { style: 'gable', material: 'gray_concrete', frame: 'dark_oak_planks', baseY: 5 })
手工放台阶用 builder.stairs(x, y, z, type, 'south')，半砖用 builder.slab(x, y, z, type, 'bottom')
```

## 四、测试（vitest，中文 describe）
- `sandboxRoof.test.js`（约 +25）：
  - gable 5×5 区域：层数正确（跨 5 → 3 层）、每层台阶 facing 同侧一致、屋脊行存在（frame 材质）
  - gable 长边屋脊方向：8×5 → 沿 X
  - hip：四边 facing 各朝外、顶层收成一行/点
  - pyramid：收成 1 块尖 + 宝顶
  - baseY 自动检测（先 set 一块地台）
  - stairs/slab 便捷原语：properties 正确 + facing 非法抛错
  - 参数校验：负跨度/未知 style 抛错
- `blockConnections.test.js`（约 +10）：
  - inferConnections：孤立 fence 全 false；直排 3 个 → 中间 n+s；L 形 → 角块 n+e；wall 同族不相连 fence
  - validateBlockStates：无 facing stairs 计数、全孤立 fence 计数
- 基线 254 不破坏

## 五、验收清单
1. `npx vitest run` 全绿（254 + 新增 ≈ 289）
2. `npm run build` 通过
3. **CDP 实测（主 agent）**：
   - prompt「中式硬山顶正房：8x6 墙高 5，用 builder.roof 做硬山顶，圆木梁，灰瓦」→ 最终代码含 `builder.roof(` 调用 + **数据断言**：屋顶台阶 facing 同侧一致率 100%、无 facing 缺失
   - 渲染截图：屋顶呈现**双向坡面**（非平顶/乱向）。另放 5 个灯笼到梁下 → 截图确认小灯笼可见（非 1×1×1 整砖）
   - 栅栏：生成一段直排栅栏 → 截图确认横杆连续（非孤立柱）
4. 老功能不破坏（fast 模式回归冒烟）

## 六、约束
- 不改 store/server/parser 导出；输出 blocks 结构不变（+properties 已有字段）
- **CLAUDE.md 中文注释**；不提交（主 agent 提交，分两个 commit：A 沙盒原语+测试 / B 渲染升级）
- 保持现有 API 100% 兼容（新增函数不破坏 set/fill/door 等）
- 测试文件命名接现有规范；改完跑 vitest + build 贴摘要