# 任务书：P2-① 原版图集渲染管线（版本化 + 分面贴图）

> 仓库：mc-ai-builder-v2 | 日期：2026-08-29 | 本轮定位：P2 渲染第一轮
> **只允许修改**：`src/components/VoxelWorld.jsx`、`src/utils/textureMapping.js`（新建）、`src/utils/textureMapping.test.js`（新建）、`src/App.jsx`（仅 VoxelWorld 传 version 一处）

## 一、现状盘点（已取证）

1. **纹理路径硬编码 1.21**：`src/components/VoxelWorld.jsx:9` `const TEXTURE_PATH = '/minecraft/textures/block/'`（指向 public/minecraft，1.21 资产）
2. **1.20.1 资产已就位**：`public/minecraft-1.20.1/textures/block/` **977 张**（含分面贴图：`oak_log.png`+`oak_log_top.png`、`grass_block_side.png`+`grass_block_top.png`；命名规范 `xxx_log.png`/`xxx_log_top.png`/`xxx_planks.png`）
3. **版本状态在 App.jsx**：`useState('1.20.1')`（selectedVersion，267 行）——**VoxelWorld 完全不感知版本**
4. **现有渲染**：TexturedInstancedBlocks 用 BoxGeometry 单材质（全六面同一个贴图），~500 行 alias map（BLOCK_TEXTURE_ALIASES）+ FALLBACK_COLORS 兜底色
5. **默认主版本已切 1.20.1**（用户拍板），渲染应默认读 1.20.1 资产

## 二、设计

### 1. 版本感知纹理路径
- 新建 `src/utils/textureMapping.js`，导出纯函数：
  - `getTextureBasePath(version)`：`1.20.1` → `/minecraft-1.20.1/textures/block/`；其他 → `/minecraft/textures/block/`（1.21 兜底）
  - `resolveBlockTextures(type, version)` → `{ side, top, bottom, fallbackColor }`：
    - 先查**分面映射表**（见 2）
    - 再查**别名映射表**（现有 BLOCK_TEXTURE_ALIASES 迁移进来，type→文件名）
    - 都没有 → fallbackColor（FALLBACK_COLORS 迁移进来）
    - 每个字段缺贴图文件时**逐级回退**：分面 → 别名 → fallback 色（返回 Promise<Texture> 的加载逻辑留在 VoxelWorld，textureMapping 只做名字解析，保持纯函数可测）
- VoxelWorld.jsx：`TEXTURE_PATH` 常量删除，改用 `getTextureBasePath(version)`；`loadTexture(type, version)` 组装 URL
- **版本来源**：App.jsx `<VoxelWorld version={selectedVersion} />`（VoxelWorld 收 prop，默认 `'1.20.1'`）

### 2. 分面贴图（核心视觉升级）
textureMapping.js 内建 **FACE_MAP**（按族类规则 + 白名单），决定 block type 的三面贴图：
- **原木类**：以 `_log` 结尾 → side=`xxx_log`（或 `xxx_log_side` 若存在），top/bottom=`xxx_log_top`
- **草方块**：`grass_block` → side=`grass_block_side`, top=`grass_block_top`, bottom=`dirt`
- **菌丝/苔石/耕地**：`mycelium`（top 特殊）、`farmland`（top=farmland）、`podzol`（side 含土）——同类处理，能加则加
- **普通方块**：三面同图（type 本身）
- 白名单至少覆盖：oak_log/spruce_log/birch_log/jungle_log/acacia_log/dark_oak_log/mangrove_log/grass_block/mycelium/podzol/farmland 等 ≥15 种
- 规则函数化：`getFaceTextureNames(type)` → `{side, top, bottom}`，可单测

**渲染改造（VoxelWorld.jsx TexturedInstancedBlocks）**：
- 每个 block type 渲染**两个 InstancedMesh**：主体（side 贴图，全六面）+ 顶/底面覆盖（top/bottom 贴图，只画顶面/底面）——用两个 mesh 叠合实现分面效果（性能可接受：现有方块量 200-750）
- 顶/底 mesh 用 BoxGeometry 单面（只渲染 Top/Bottom faces → 用 `material.side` 不行，正解：BoxGeometry 自带 6 组 material index——用 6 材质数组 `[side×4, top, bottom]` 一次 render，Three.js BoxGeometry 原生支持多材质组！**优先方案**：`new MeshBasicMaterial` 数组 `[side,side,side,side,top,bottom]` 直接给 Mesh 用 BoxGeometry——InstancedMesh 不支持多材质**（InstancedMesh 单几何单材质）。两个 InstancedMesh 方案稳妥，采用之。**
- 保持现有 fallback（loadTexture 失败 → 无色几何体走 FALLBACK_COLORS 已有逻辑）

### 3. 别名映射迁移与扩展
- 现有 BLOCK_TEXTURE_ALIASES（VoxelWorld.jsx 内 ~500 行）整体迁入 textureMapping.js `ALIAS_MAP`（type → 贴图文件名），**不改动现有条目**
- 扩展补充（对照 public/minecraft-1.20.1/textures/block/ 实际文件名，**必须真实存在**，先 `ls` 核对再写）：
  - 材质库常见类型：`deepslate_bricks`/`polished_deepslate`/`mud_bricks`/`warped_planks`/`crimson_planks`/`tuff`/`calcite`/`dripstone_block`/`amethyst_block` 等（核对 1.20.1 是否存在这些文件）
- `FALLBACK_COLORS` 也迁入（保留原色彩值）

### 4. 单测（textureMapping.test.js，vitest，中文 describe/it，模仿现有测试风格）
- path 解析：1.20.1 / 1.21 / 未知版本兜底
- 分面规则：`oak_log` → {side: oak_log, top: oak_log_top, bottom: oak_log_top}；`grass_block` 三面；`stone` 三面同图；`_log` 族全覆盖抽查 6 种
- alias：`oak_door`→ 等已有别名保留；新增别名抽查
- fallback：未知 type → fallbackColor 非空
- 纯函数无 DOM 依赖（不 import three）

## 三、验收清单
1. `npx vitest run` 全绿（原 179 + 新增全过，**不得删除/缩减任何现有用例**）
2. `npm run build` 通过
3. CDP 实测（主 agent）：默认 1.20.1 下生成小凉亭 → 截图**视觉确认有纹理贴图**（非纯色方块），日志无 404 纹理请求
4. App.jsx 只改 VoxelWorld 传参一处，其余不动

## 四、约束
- 别动：渲染几何形状（楼梯/台阶 3D 形状留给后续轮）、导出逻辑、store、server
- 中文注释、中文 commit message（提交动作由主 agent 做，claude 不提交）
- InstancedMesh 多材质用「两个 InstancedMesh 叠合」方案，不要 Atomic/Mesh 逐方块
- 全部读写动作限仓库内；改完跑测试 + build，贴结果摘要