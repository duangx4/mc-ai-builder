# 任务书：MC 原版方块全覆盖渲染系统——数据驱动 + 自动化分类

> 项目：mc-ai-builder-v2 | 日期：2026-08-30 | 承接：P3 渲染修复轮（`492ace53` + `395d9676`）
> **目标**：一次性覆盖 Minecraft 原版所有特殊几何方块（锁链/铁栏杆/蜡烛/龙蛋/酿造台/切石机/砂轮/按钮/压力板等），改造为数据驱动渲染引擎，结束"每种方块写一个组件"的重复劳动。

---

## 一、背景

当前项目 P3 已做火把/灯笼/栅栏/栅栏门渲染，但采用"手写组件"模式（`TorchLanternInstancedBlocks` / `FenceWallInstancedBlocks`）——每种方块写死尺寸、offset、rotation，不可持续。现有 MC 1.20.1 完整 jar 解包资源（`C:\Users\21972\OneDrive\Desktop\新建文件夹\YDJMC\assets\minecraft`），含 `blockstates` + `models/block` + `textures`，2016 个方块模型 JSON，精确坐标可复用。

用户要求：**一次性全覆盖**所有特殊方块，不再逐个手动列举。

---

## 二、你的任务（分五步走）

### 步骤 1：全方块自动化分类扫描

写脚本 `scripts/classify-mc-blocks.mjs`（放项目 `scripts/` 目录，新建目录）：
- 输入：`C:\Users\21972\OneDrive\Desktop\新建文件夹\YDJMC\assets\minecraft` 的 `models/block/*.json` + `blockstates/*.json`
- 分类规则（按几何复杂度）：
  1. **fullBlock**：单 element 满格 `[0,0,0]→[16,16,16]`，无需特殊渲染（石头/泥土等）
  2. **simpleShape**：单 element 非满格（按钮/压力板/地毯/雪层等）
  3. **multiElement**：≥2 个 element 拼装（火把/灯笼/锁链/铁栏杆/蜡烛/龙蛋/酿造台/切石机/砂轮/花盆/末地烛等）
  4. **rotation**：element 带 `rotation`（锁链 45°/火把交叉薄片/蜡烛芯等）
  5. **blockEntity**：空模型或仅 `textures` 占位（床/头颅/旗帜/钟/箱子/告示牌，靠 BlockEntityRenderer，JSON 不含几何）
  6. **multipart**：blockstate 用 `multipart`（栅栏/墙/玻璃板，连接类）
- 输出：`public/minecraft-1.20.1/blocks-classification.json`（各类别的方块名数组）

**检查点**：运行 `node scripts/classify-mc-blocks.mjs`，输出文件包含 6 个分类，控制台打印统计数字（如 `multiElement: 185, rotation: 71, blockEntity: 1713`）。

---

### 步骤 2：坐标自动转换（16 格系 → Three.js 归一化）

写脚本 `scripts/convert-vanilla-models.mjs`：
- 输入：`blocks-classification.json` 里的 `multiElement` + `simpleShape` + `rotation` 三类，读对应的 `models/block/<name>.json`
- 转换规则：
  - `from`/`to` 坐标除以 16（如 `[7,0,7]→[9,10,9]` 变成 `{from:[0.4375,0,0.4375], to:[0.5625,0.625,0.5625]}`）
  - `rotation` 保留原样（`{origin, axis, angle}`）
  - 贴图 `faces` 的 `texture` 字段保留引用（如 `#torch`），UV 坐标除以 16
- 输出：`public/minecraft-1.20.1/vanilla-block-models.json`，格式：
  ```json
  {
    "torch": {
      "elements": [
        {"from":[0.4375,0,0.4375], "to":[0.5625,0.625,0.5625], "faces":{...}},
        {"from":[0.4375,0,0], "to":[0.5625,1,1], "rotation":{...}, "faces":{...}}
      ],
      "textures": {"torch": "block/torch"}
    },
    "chain": {...},
    ...
  }
  ```

**检查点**：转换后 `vanilla-block-models.json` 包含至少 200+ 条方块定义（multiElement 185 + simpleShape 部分 + rotation），坐标都是 0-1 范围浮点数。

---

### 步骤 3：数据驱动渲染器（通用 multi-element 组件）

改造 `src/components/VoxelWorld.jsx`：
- 新增组件 `VanillaMultiElementBlocks`（参考现有 `TorchLanternInstancedBlocks` 结构）：
  - 输入 props：`blocks`（当前场景方块数组，含 position/type）
  - 读取 `vanilla-block-models.json` 对应 `type` 的 `elements` 定义
  - 循环每个 element，生成 `BoxGeometry` 实例化 mesh（size = to-from，position = from+size/2，rotation 用 Three.js `Euler`）
  - 所有同 type 方块的同一 element 共享一个 `InstancedMesh`（性能优化）
- **替换现有手写组件**：
  - `TorchLanternInstancedBlocks` 改为从 `vanilla-block-models.json` 读数据（不删组件，改为数据驱动）
  - `FenceWallInstancedBlocks` multipart 逻辑保持（连接推断），但柱/杆尺寸从数据读
- 纹理映射：`src/utils/textureMapping.js` 的 `BLOCK_TEXTURES` 已有映射（如 `torch: 'block/torch'`），`VanillaMultiElementBlocks` 从 JSON `textures` 字段取贴图路径，跨查 `BLOCK_TEXTURES` 拿实际 URL

**检查点**：场景里放一个 `chain`（锁链）、一个 `lantern`（灯笼）、一个 `brewing_stand`（酿造台），3D 渲染出多 element 拼装形状，不是单一方块。

---

### 步骤 4：精修上一轮遗留问题（火把/灯笼/栅栏门）

对照原版 JSON 坐标，修正现有实现：
1. **火把高度**：`template_torch.json` 主杆 `[7,0,7]→[9,10,9]`（高 10/16=0.625），当前代码写的 0.5 太矮 → 改 0.625
2. **灯笼 45° 提环**：`template_lantern.json` 有 4 个 element（玻璃体+顶盖+两片 45° 旋转薄片），当前只有挂钩+灯体 2 件 → 补全 4 件（坐标见原版 JSON）
3. **栅栏门镂空结构**：`template_fence_gate_open.json` 是 8 element 拼装（左右门柱+内侧小柱+上下横条），当前 `BLOCK_SHAPES.gate` 是单一薄板 `[1,0.875,0.1875]` → 改为 8-element 数据（从 JSON 读）

**检查点**：火把变高、灯笼有十字提环、栅栏门不是一整块板而是镂空门框。

---

### 步骤 5：验收与提交

1. **静态验收**：
   - `npm test`（vitest）全绿
   - `npm run build` 通过
2. **浏览器实测**（**必做，不能跳过**）：
   - 如果环境没 `puppeteer`，先 `npm install -D puppeteer`
   - 启动 dev server（`npm run dev`）
   - 用 puppeteer 或手动浏览器生成测试场景：提示词 `"在 5×5 区域放一圈锁链、铁栏杆、灯笼、火把、蜡烛、酿造台、切石机、砂轮、按钮、压力板、龙蛋"`
   - 截图验证：锁链是十字交叉、灯笼有提环、火把够高、龙蛋是梯形轮廓、酿造台有 3 个瓶托
3. **提交**（验收通过后）：
   - `git add scripts/ public/minecraft-1.20.1/blocks-classification.json public/minecraft-1.20.1/vanilla-block-models.json src/components/VoxelWorld.jsx src/utils/textureMapping.js src/utils/blockShape.test.js`
   - commit message: `feat: MC 原版方块全覆盖数据驱动渲染系统（multi-element + 坐标自动转换 + 火把/灯笼/栅栏门精修）`
   - 写验收报告 `docs/mc-vanilla-blocks-full-coverage-report.md`（统计覆盖了多少种方块、测试结果、截图路径）

---

## 三、约束与注意事项

1. **不破坏现有功能**：fullBlock（石头/泥土）走原来的 `TexturedInstancedBlocks`，不用改
2. **blockEntity 类（床/头颅/旗帜/钟）暂不做**——JSON 是空的，需要单独手写几何，留下一轮处理
3. **multipart 连接类（栅栏/墙/玻璃板）保留现有逻辑**——`FenceWallInstancedBlocks` 的连接推断不变，只改读数据的尺寸部分
4. **性能不劣化**：所有 element 必须用 `InstancedMesh`，不能一个方块一个 `Mesh`
5. **中文注释**，代码/文档/commit message 全中文

---

## 四、产出清单

| 文件 | 内容 |
|------|------|
| `scripts/classify-mc-blocks.mjs` | 全方块分类扫描脚本 |
| `scripts/convert-vanilla-models.mjs` | 坐标转换脚本（16格→归一化） |
| `public/minecraft-1.20.1/blocks-classification.json` | 分类结果（6 类） |
| `public/minecraft-1.20.1/vanilla-block-models.json` | 转换后几何数据（200+ 方块） |
| `src/components/VoxelWorld.jsx` | 新增 `VanillaMultiElementBlocks` 组件 + 精修火把/灯笼/栅栏门 |
| `src/utils/blockShape.test.js` | 补充测试（multi-element 数据加载） |
| `docs/mc-vanilla-blocks-full-coverage-report.md` | 验收报告 |

---

## 五、参考资料

- 原版资源包路径：`C:\Users\21972\OneDrive\Desktop\新建文件夹\YDJMC\assets\minecraft`
- 关键模型样例：
  - 火把：`models/block/template_torch.json`
  - 灯笼：`models/block/template_lantern.json`
  - 栅栏门：`models/block/template_fence_gate_open.json`
  - 锁链：`models/block/chain.json`
  - 酿造台：`models/block/brewing_stand.json`
  - 切石机：`models/block/stonecutter.json`
- 研究文档：`C:\Users\21972\Doubao\chats\2026-08-30\new-chat\Minecraft方块渲染机制总结.md`（原版 element/rotation/multipart 原理）

---

**关键成功要素**：
- 不能跳过浏览器实测（装 puppeteer 也要测）
- 数据驱动（坐标从 JSON 来，不在代码里硬编码）
- 一次覆盖 200+ 种方块（multiElement + simpleShape + rotation），结束逐个手写时代
