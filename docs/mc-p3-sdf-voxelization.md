# 任务书：P3-① SDF 曲面体素化原语 + 曲面模板库

> 仓库：mc-ai-builder-v2 | 日期：2026-08-29 | 本轮定位：P3 差异化第一项（路线图验收：生成含曲面建筑）
> **允许修改**：`src/utils/sandbox.js`（builder API 扩展）、`src/utils/smartEngine.js`（工具 schema/提示词引用曲面）、`src/utils/sandbox.test.js` 或新建 `src/utils/sandboxSdf.test.js`、`src/utils/styleKnowledge.js`（如需要）——尽量小改

## 一、背景与验收标准（来自路线图）

- P3 验收：**「生成含曲面建筑；search_structure 返回合理参考；案例库 ≥100 条」**
- 本轮目标：**能生成曲面建筑**——球形穹顶 / 圆塔 / 筒状拱顶等

## 二、现状盘点

1. sandbox.js 的 builder API 目前是**方块位操作**（builder.set / builder.fill / builder.placeBlock 等，全为轴对齐方块）
2. 模型（sonnet-5/opus-5）收到"穹顶/球形"要求时只能用方块堆近似（丑、逐块低效），或干脆忽略
3. 渲染/材质系统已完备（P2），曲面体素化产物直接走现有 blocks 渲染

## 三、设计

### 1. SDF 曲面原语（sandbox.js builder 扩展）
在 builder 对象上新增 4 个原语（SDF = 有向距离场，按格点采样填充）：

- `builder.sphere(cx, cy, cz, radius, block, { hollow?, wall? }?)`
  - 实心球：`(gx-cx)²+(gy-cy)²+(gz-cz)² <= radius²`（格点中心采样）
  - hollow=true 时仅采样圆环 `|dist - radius| <= 0.5`（壳）
  - wall 厚度可调
- `builder.dome(cx, cy, cz, radius, height, block, { hollow? })`
  - 圆顶（下半部半球）：y 方向限制在 `[cy, cy+height]`，球心在 `(cx, cy-radius, cz)`（穹顶从底面升起）；可选 hollow 壳
- `builder.cylinder(cx, cy0, cz, radius, height, block, { hollow? })`
  - 竖圆柱：`(gx-cx)²+(gz-cz)² <= radius²` 且 `y ∈ [cy0, cy0+height-1]`
- `builder.torus(cx, cy, cz, majorR, minorR, block, { orientation? })`
  - 环面：水平环（orientation 默认 'horizontal'：环在 XZ 平面）；SDF 近似：`(√(dx²+dz²)-majorR)² + dy² <= minorR²`
- 参数校验：非法参数（负半径/NaN）→ 抛明确错误（不静默）
- 坐标截断：超出合理范围（±512）→ 报错
- **所有原语内部用 builder.set 落位**（与现有体素系统一致），返回放置数量

### 2. 曲面模板库（styleKnowledge.js 或新文件 src/utils/sdfTemplates.js）
- 导出 `SDF_TEMPLATES`：常见曲面建筑模板（供 LLM 参考）：
  - 中式亭阁圆顶（dome + 柱环）
  - 西式穹顶教堂主厅（dome + 鼓座 cylinder）
  - 圆塔（cylinder hollow + 锥顶 dome 小半径）
  - 天文台/穹顶观测站
- 每个模板：`{ id, name, 名称, blocks: [步骤描述], hint: 'builder.dome(...)...' }`（结构提示，教模型怎么调原语）
- `SMART_SYSTEM_PROMPT`（smartEngine 的 construction/system prompt）加一段「**曲面原语可用**」说明：列出 4 个原语签名 + 一句话引导（"穹顶用 builder.dome，圆塔用 builder.cylinder(hollow)"）

### 3. 工具 schema（可选，若简单）
- 若 getToolsSchemaV2 加 searchMaterial 类似地好加，可给 construction 加 `sdf_hint` 工具（返回 SDF_TEMPLATES 查询）——**本轮可不做**（提示词注入即可），保持小步

### 4. 单测（新建 sandboxSdf.test.js，vitest，中文 describe）
- sphere 实心：radius 2 → 体素数 ≈ 33（(2r+1)³ 约 125 的球体积）；中心在、角不在
- dome：半径 3 高 3 → 底圆面积层 + 上部收口；不越界（y ≥ cy）
- cylinder hollow：半径 3 高 5 壳 → 内部空心（中心格空）
- torus：majorR 4 minorR 1 → 环体存在且中心孔空
- 参数校验：负半径抛错
- 放置总数 > 0 且与理论值误差 < 25%

## 四、验收清单
1. `npx vitest run` 全绿（237 基线不破坏 + 新增）
2. `npm run build` 通过
3. **CDP 实测（主 agent）**：smart 模式 prompt「中式八角亭，穹顶圆顶（builder.dome 曲面顶），4 根木柱」→ 生成物含 dome 原语生成的曲面（**查看最终代码含 builder.dome 调用或 blocks 顶部非直角轮廓**）；截图 vision 确认顶部**弧形轮廓**（非平顶）
4. 不破坏：现有 builder.set/fill 等一切行为（回归由 237 测试守护）

## 五、约束
- 不改：store/server/渲染层（输出仍为标准 blocks）
- 中文注释；claude 不提交（主 agent 提交）
- 保持需验证的目标最小：本轮只做「原语 + 模板 + 提示词 + 测试」，不碰 RAG/采集管线
- 改完跑 vitest + build，贴摘要