# 任务书：渲染修复轮——小件真造型 + 栅栏几何修正 + 栅栏门 + 点光源 + 相机适配

> 仓库：mc-ai-builder-v2 | 日期：2026-08-29 晚 | 背景：用户实测三连报（截图确认）：① 灯笼/火把渲染色块无造型无光 ② 木头/石头栅栏横杆错位悬空 ③ 栅栏门（fence_gate）不可见。附赠：相机从不自动聚焦建筑（headless/桌面都中招，视觉验收全靠手动拖）。
> **允许修改**：`src/components/VoxelWorld.jsx`（主战场）、`src/utils/blockConnections.js`（inferConnections 不变，可能加 type 清洗）、`src/utils/sandboxOutput 清洗点`（blocks type 去 properties 后缀，若渲染侧需要）、新建测试 `src/utils/blockShape.test.js`（纯函数：形状/门/清洗）
> **关键事实（主 agent 已查证）**：
> - `getBlockShape()` 行 176-188：torch→'torch'、_wall(非 wall_ 前缀)→'wall'、_fence(非 fence_gate)→'fence'、**其他→'full'（含 fence_gate！）**
> - `BLOCK_SHAPES` 行 98+：torch {size:[0.125,0.625,0.125], offset:[0,-0.1875,0]}、lantern {size:[0.375,0.5625,0.375], offset:[0,-0.21875,0]}、fence {size:[0.25,1,0.25]}、wall {size:[0.5,1,0.5]}
> - `TexturedInstancedBlocks`（行 446+）：useEffect 里 `tempObject.scale.set(...shape.size)` + position 加 `shape.offset`——**几何仍是 boxGeometry(1,1,1) 等比缩放**，torch=细长方体、lantern=小长方体——用户视觉 = "小黄色方块"，无火把火焰头/无灯笼挂体
> - `FenceWallInstancedBlocks`（行 534+）：柱 [0.1875,1,0.1875] + NS/EW 横杆 barSize [1,0.1875,0.1875]（**全长 1 穿过柱子中心**）+ 单条 y+0.375——所以横杆"插在柱子里/中间一根悬空感"
> - fence_gate：getBlockShape 落 'full'，且 type 可能带 `[facing=...]` 后缀（trapdoor 输出即 `dark_oak_trapdoor[half=bottom,facing=south]`）——渲染 key/材质查找被后缀污染 → 需查证 store 是否清洗、渲染是否受污染（主 agent 怀疑 gate 不可见 = 后缀导致 ALIAS/FALLBACK 查不到 + 形状 full）
> - 光源：lantern/torch 在 GLOW_BLOCKS → MeshBasic 自发光材质（不受光照变暗），但**无点光源**——用户期待照亮周围

## 一、小件组合造型（torch/lantern）
目标：火把 = 底部细杆 + 顶部火焰头（发光）；灯笼 = 顶部挂钩 + 灯体（半透明暖黄 + 光晕）。渲染分组后（blocksByTexture 已按 type 分组）内部再分部件 mesh：
- **torch / wall_torch / soul_torch**：杆 geometry（0.125×0.5×0.125，中心 y+0.25+offset）+ 头 geometry（0.1875³，中心 y+0.6+offset，暖黄 #ffaa33 MeshBasic 发光）
- **lantern / soul_lantern**：钩（0.0625×0.25×0.0625，y 顶）+ 体（0.375×0.4375×0.375，中心 y-0.4+offset，半透明暖黄 #e8a93c，transparent + opacity ~0.85）
- 装饰件（chandelier/chain 等）不强制，聚焦 torch/lantern
- 实现方式：在 TexturedInstancedBlocks 内对 shapeType 'torch'|'lantern' 特化（**内部 2 个 instancedMesh，各部件一组**，参照 FenceWallInstancedBlocks 部件模式）；实例矩阵 = 部件相对中心偏移 + 块位置 + shape.offset

## 二、栅栏/墙横杆几何修正
- 横杆改为**柱边到柱边**：barSize 长度 = 1 - 柱宽（fence：柱 0.1875 → 杆 0.8125；wall：柱 0.5 → 杆 0.5）——不再穿过柱子中心
- **双横杆**仿原版：fence 两条 y 偏移 +0.375 / +0.6875（各 barHeight 0.1875）；wall 一条 y 中位 +0.25（杆高 0.375 顶部平齐）——visual 密度像 MC
- 柱子高度保持满格
- 材料：柱/杆同用现有 getOrCreateMaterial（无需新贴图）

## 三、栅栏门 fence_gate（+ 所有 properties 后缀 type 清洗）
1. **type 清洗（全局渲染前）**：block 进入渲染前统一 `type = type.replace(/\[.*\]$/, '')`（在 visibleBlocks 过滤前或 store 层，选一处 + 纯函数 `cleanBlockType(type)` 入 blockShape.js 单测）——确保 fence_gate/wall_torch/trapdoor 等所有带 `[props]` 的 type 正常查 ALIAS/FALLBACK/shape
2. `getBlockShape` 增加：`fence_gate`（含 '_fence_gate'）→ 'gate'；`BLOCK_SHAPES.gate` = { size:[1,0.875,0.1875], offset:[0,-0.0625,0] }（门板）——两侧门柱不强制（后续轮）；材质 fallback（FALLBACK_COLORS 加 oak/spruce/birch/acacia 等 fence_gate 族色，若无则按 fence 同族色）
3. 渲染路径：gate 走 TexturedInstancedBlocks 保留形状缩放即可（shape 机制已支持非整砖 size/offset）——**确认** TexturedInstancedBlocks 的 scale 路径对 0.1875 厚门板 OK

## 四、点光源（灯笼/火把照亮周围）
- 新建组件/逻辑：从 blocks 收集 lantern/torch 位置（含 wall_torch）→ **≤10 个** `THREE.PointLight({ color: 0xffaa55, distance: 8, intensity: 0.8, decay: 2 })`（lantern 0xffbb66 略亮）
- 放 VoxelWorld 主 <group> 内（useMemo 生成，blocks 变化重建）
- 与现有 ambient/directional 共存；性能：≤10 个 forward 渲染可接受（如卡则减到 6）
- 可选：`THREE.Sprite` 光晕（additive，尺寸 1.5）加在 lantern 顶部——若实现简单就做，不强制

## 五、相机自动适配建筑（体验修复）
- blocks 变化（生成完成/清空）后，用 bounds（min/max xyz）计算相机位置：`camera.position = center + normalized(dir) * maxDim * 1.6`，lookAt(center)，`controls.target = center`（find camera target: useStore 或 ref 里拿到的 camera/controls 实例；参照现有 auto-focus 逻辑若存在则修好它——**主 agent 记忆：App.jsx 曾有 auto-focus on structure change，但实测失败/未聚焦**）
- 注意 trigger：仅在"新建筑完成/清空"时调，不每次 blocks 变化都拉（避免构建过程抖动）

## 六、测试（vitest 中文）
- `blockShape.test.js`（约 +12）：cleanBlockType（去 [props] 后缀：`dark_oak_trapdoor[half=bottom,facing=south]` → `dark_oak_trapdoor`）、getBlockShape(fence_gate)='gate'、BLOCK_SHAPES.gate 尺寸、fence 双横杆尺寸常量（若抽成纯函数/常量导出）、torch/lantern 部件尺寸常量
- 现有 274 不破坏

## 七、验收
1. vitest 全绿（274+12=286+）
2. npm run build 通过
3. **CDP 实测**（主 agent 做）：prompt 生成"前院栅栏+栅栏门+梁下挂灯笼+墙插火把" → 数据断言（types 含 fence_gate/torch/lantern）→ 截图 vision：火把有杆+火焰头、灯笼挂件形、栅栏横杆对齐连续、门板可见、**相机自动对准建筑**
4. 用户 3001 复测同场景

## 八、约束
- 不破坏现有 API/输出结构；渲染性能不劣化（保持 instanced）
- 改动集中 VoxelWorld.jsx + blockShape 纯函数；不提交（主 agent review 后分 commit）
- CLAUDE.md 中文注释