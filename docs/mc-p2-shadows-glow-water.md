# 任务书：P2-② 阴影 / 发光 / 水 / 雾（视觉深度升级）

> 仓库：mc-ai-builder-v2 | 日期：2026-08-29 | 本轮定位：P2 渲染第二轮
> **只允许修改**：`src/components/VoxelWorld.jsx`、`src/App.jsx`（Canvas 光照/阴影配置与传参）、`src/utils/textureMapping.js`（如需加 GLOW/WATER 分类表）、`src/utils/textureMapping.test.js`（配套测试）

## 一、现状盘点（已取证）

1. Canvas 已开 `shadows` prop + 一天模式雾 `<fog args={[#, 30, 100]}>` + `ambientLight(1.5)` + `directionalLight(2)`（App.jsx ~3254-3262）
2. **方块全部 MeshBasicMaterial**（VoxelWorld.jsx:374 getOrCreateMaterial / 479 CrossInstancedBlocks）——**不受光照、不投影不接影**，阴影系统形同虚设
3. 地面 = drei `<Grid>`（无限网格），**无实体地面，无法接收阴影**
4. 无水体特殊处理；无发光方块处理（lantern 只有 cross shape + fallback 色）
5. 已有透明方块列表 TRANSPARENT_BLOCKS 与 useUltraPerformance 性能开关（可挂钩阴影降级）
6. 默认主版本 1.20.1 纹理渲染已完成（P2-①，材质经 textureMapping 解析）

## 二、设计

### 1. 光照与阴影（核心）
- **App.jsx Canvas**：
  - `directionalLight` 加 `castShadow`，shadow-mapSize **2048×2048**（性能模式 1024）、shadow camera 范围 ±60、bias 微调（-0.0005 防 self-shadow acne）
  - 补一盏低强度填充光（`hemisphereLight` 或第二盏 directionLight，柔和暗部）
  - 环境光强度随 isDayMode 微调（白天 1.2 / 夜 0.6，配合 Lambert 亮度）
  - 阴影开关挂钩 `apiSettings.shadows !== false`；`useUltraPerformance` 或方块数 > 2000 时自动关 castShadow
- **VoxelWorld.jsx 材质工厂**（getOrCreateMaterial 改造）：
  - 普通方块：MeshBasicMaterial → **MeshLambertMaterial**（颜色/贴图逻辑不变：map + color 白）
  - Lambert 需要光照配合（上面 ambient/dir 已调），贴图方块明暗有层次
  - **注意**：MeshLambertMaterial 与现有 toneMapped:false/透明逻辑（TRANSPARENT_BLOCKS）兼容（transparent/opacity/depthWrite 保留）
- **地面接收阴影**：Grid 上方加一个 `receiveShadow` 的平面（约 120×120，颜色 ≈ isDayMode ? 草地深绿灰 : 夜间深色，收到阴影才有"影子落地上"效果）；**可关闭项**：apiSettings.groundShadow === false 时不加（避免挡 Grid 视觉）
- **方块 castShadow**：TexturedInstancedBlocks / CrossInstancedBlocks 的 instancedMesh 加 `castShadow`；stairs 逐 mesh 加 `castShadow receiveShadow`

### 2. 发光方块（GLOW_BLOCKS）
- textureMapping.js 增加导出 `GLOW_BLOCKS` 数组（**1.20.1 真实存在的发光方块**）：glowstone / lantern / soul_lantern / sea_lantern / magma_block / shroomlight / redstone_lamp / glow_berries / torch / soul_torch（torch 类照旧 cross/fallback）
- getOrCreateMaterial：GLOW_BLOCKS 命中 → **保持 MeshBasicMaterial（固有明亮，模拟自发光）**；普通方块走 Lambert
- CrossInstancedBlocks、stairs 等各渲染路径同样区分（glow 用 Basic 亮色）

### 3. 水方块（WATER_BLOCKS）
- textureMapping.js 导出 `WATER_BLOCKS`：water / flowing_water / kelp / seagrass（后两者 cross 植物）
- 渲染：water/flowing_water → 半透明蓝色（MeshBasicMaterial color `#3f76e4`，transparent，opacity 0.75）**单独 InstancedMesh（WaterBlocks 组件）**，用 useFrame 做**缓慢高度波动动画**（每实例 y 加 sin(t+相位)×0.03，矩阵更新）——动画仅当方块数 < 800，多则静态
- kelp/seagrass 走现有 cross 路径不变

### 4. 雾（微调）
- 现有 fog 保留；白天 near/far 调为 `[40, 140]`（别把小型建筑糊掉）；夜间保持近雾氛围 `[15, 60]`
- 背景色保持现状

### 5. 材质工厂扩展（VoxelWorld.jsx）
- `getOrCreateMaterial(blockType, version)` 内部分派：`GLOW_BLOCKS.includes(blockType) → Basic 亮色路径`；`WATER_BLOCKS.includes(blockType) → 水材质路径`；否则 Lambert 路径
- 缓存 key 加类别前缀（`lambert:xxx` / `glow:xxx` / `water`）防串用
- USE_FALLBACK_ONLY / TRANSPARENT_BLOCKS 逻辑保留

### 6. 单测（textureMapping.test.js 追加，不删现有）
- GLOW_BLOCKS 抽查（glowstone/lantern/sea_lantern 在）
- WATER_BLOCKS 抽查（water/flowing_water 在）
- 两表无重复、无空条目

## 三、验收清单
1. `npx vitest run` 全绿（210 → 214+，新增用例通过，**不得删除现有**）
2. `npm run build` 通过
3. CDP 实测（主 agent）：
   - 生成含普通方块+发光物+水的 test 建筑（prompt 引导：`石砖塔 + 顶部放一个萤石 + 底部一圈水`）→ 截图 vision 确认：**方块有明暗面（受光）**、**地面有阴影**、**萤石区域亮**、**水半透明蓝色**
   - 控制台无材质/阴影报错
4. 夜间模式（isDayMode false）仍正常（雾/星/灯光亮）

## 四、约束
- 不改：导出逻辑、store、server、模型几何形状（楼梯/台阶已做的不动）
- MeshLambertMaterial 性能 OK（instanced）；**不要用 MeshStandardMaterial**（PBR 重，750+ 方块会卡）
- 阴影默认开、可关（不要做成常驻强阴影：shadow-mapSize 2048 起步，性能开关降 1024+关）
- 中文注释；claude 不提交（主 agent 提交）
- 改完跑 vitest + build，贴摘要