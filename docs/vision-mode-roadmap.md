# 视觉模式路线图 (Vision Mode Roadmap)

> **优先级：** 未来功能 (Future Feature)  
> **前置条件：** 现有软件完善完成（P3 彻底完工 + 全部测试通过）  
> **创建日期：** 2026-09-01

---

## 功能概述

**视觉模式 (Vision Mode)** 是一个基于图像驱动的 MC 建筑生成流水线，通过 AI 生图 → 图转 3D → 方块近似的三阶段处理，实现从自然语言描述到 Minecraft 建筑的视觉化生成。

### 核心流程

```
用户描述
    ↓
生图模型 (Text → Image)
    ↓
2D 图像 (建筑渲染图)
    ↓
图转 3D 模型 (Image → 3D Mesh)
    ↓
低面数 3D 模型
    ↓
方块体素化 (Mesh → Voxels)
    ↓
MC 建筑方块数据
    ↓
导出 (WorldEdit/Litematica/数据包等)
```

---

## 与现有系统的关系

### 现有生成模式
1. **快速模式** - 单轮硬编码提示
2. **自定义模式** - 带画布代码的修改模式
3. **自主模式** - Agent 循环，读取技能库

### 新增生成模式
4. **视觉模式** (本文档) - 图像驱动的生成流水线

### 定位
- **互补关系**：现有模式侧重程序化生成（代码驱动），视觉模式侧重视觉还原（图像驱动）
- **适用场景**：
  - 现有模式：规则建筑、重复结构、大型工程（城墙、塔楼、宫殿等）
  - 视觉模式：有机形态、艺术建筑、雕塑、地形景观、概念设计

---

## 技术架构

### 第一阶段：生图模型 (Text → Image)

#### 技术选型
| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **Stable Diffusion** (本地) | 开源、免费、可控 | 需要 GPU、部署复杂 | ⭐⭐⭐⭐⭐ |
| **DALL-E 3** (OpenAI API) | 质量高、易集成 | 需付费 API | ⭐⭐⭐⭐ |
| **Midjourney** (API) | 艺术质量最高 | 成本高、API 限制多 | ⭐⭐⭐ |

#### 实现要点
- 提示词工程：针对建筑生成优化（"isometric view", "minecraft style", "low-poly"）
- 图像后处理：去背景、视角校正
- 多样性控制：seed 管理、风格参数

### 第二阶段：图转 3D (Image → 3D Mesh)

#### 技术选型
| 方案 | 优势 | 劣势 | 推荐度 |
|------|------|------|--------|
| **TripoSR** (Stability AI) | 开源、快速、质量好 | 需要 GPU | ⭐⭐⭐⭐⭐ |
| **Shap-E** (OpenAI) | 易用、稳定 | 闭源、质量一般 | ⭐⭐⭐ |
| **CSM** (Stability AI) | 最新技术、质量高 | 成熟度低、资源占用大 | ⭐⭐⭐⭐ |
| **Instant3D** | 速度快 | 质量不稳定 | ⭐⭐ |

#### 实现要点
- 模型格式：输出为 .obj / .glb / .ply
- 面数控制：生成低面数模型（减少后续体素化计算）
- 方向校正：确保模型朝向与 MC 坐标系一致

### 第三阶段：方块体素化 (3D Mesh → MC Voxels)

#### 核心算法

##### 1. 体素化 (Voxelization)
```javascript
/**
 * 将 3D mesh 转换为体素网格
 * @param {Mesh} mesh - Three.js mesh 对象
 * @param {number} resolution - 体素分辨率（每单位长度的方块数）
 * @returns {Array<{x, y, z, color}>} 体素数组
 */
function voxelizeMesh(mesh, resolution) {
  // 1. 计算 mesh 的 bounding box
  // 2. 创建体素网格
  // 3. 射线检测：每个体素中心发射射线，判断是否在 mesh 内部
  // 4. 采样表面颜色
  // 5. 返回体素数据
}
```

##### 2. 方块类型映射 (Block Type Mapping)
```javascript
/**
 * 根据颜色和位置映射到 MC 方块类型
 * @param {Color} color - RGB 颜色
 * @param {Vector3} position - 体素位置
 * @param {Object} context - 上下文信息（相邻方块、高度等）
 * @returns {string} MC 方块 ID
 */
function mapToBlockType(color, position, context) {
  // 1. 颜色空间转换（RGB → Lab）
  // 2. 查找最接近的 MC 方块（色差计算）
  // 3. 考虑方块属性（透明度、发光、材质）
  // 4. 应用启发式规则（如：高处用石头、低处用泥土）
  // 5. 返回方块类型
}
```

##### 3. 结构优化 (Structure Optimization)
```javascript
/**
 * 优化方块结构
 * @param {Array} voxels - 体素数组
 * @returns {Array} 优化后的体素数组
 */
function optimizeStructure(voxels) {
  // 1. 移除内部不可见方块（flood fill 算法）
  // 2. 简化平面（合并相邻同类方块为 fill 命令）
  // 3. 结构加固（添加支撑）
  // 4. 空洞填充（修复模型转换的空隙）
  // 5. 返回优化后的数据
}
```

#### 技术挑战
1. **精度问题**：3D 模型的曲线转方块时的锯齿和失真
2. **颜色匹配**：MC 方块种类有限，颜色映射的准确性
3. **性能问题**：大型模型的体素化计算耗时
4. **结构稳定性**：生成的建筑在 MC 中是否符合物理规则（重力、支撑）

#### 解决方案
- **多分辨率支持**：让用户选择体素分辨率（低分辨率快速预览，高分辨率精细生成）
- **方块调色板**：预先建立 MC 方块的颜色索引（KD-Tree 加速查找）
- **渐进式生成**：边计算边渲染，提供实时反馈
- **智能后处理**：启发式规则修复常见问题（悬空方块、内部空洞等）

---

## 实现阶段

### Phase 1：技术验证 (2-3 周)
- [ ] 搭建 Stable Diffusion 本地环境 (或集成 API)
- [ ] 测试 TripoSR 图转 3D 功能
- [ ] 实现基础体素化算法（最小可行原型）
- [ ] 验证端到端流程（单个简单建筑）

**输出：** 技术可行性报告 + 原型 Demo

### Phase 2：核心算法实现 (3-4 周)
- [ ] 完整体素化引擎（支持任意 mesh）
- [ ] 方块类型映射系统（颜色→方块的完整库）
- [ ] 结构优化算法（内部优化、平面简化）
- [ ] 性能优化（多线程、增量计算）

**输出：** 独立的体素化工具库 (`src/utils/voxelizer.js`)

### Phase 3：UI 集成 (2 周)
- [ ] 新增"视觉模式"入口（前端 UI）
- [ ] 生图参数配置面板（提示词、风格、分辨率）
- [ ] 3D 模型预览窗口（体素化前的预览）
- [ ] 体素化参数调节（分辨率、方块调色板）
- [ ] 实时进度反馈

**输出：** 完整的视觉模式用户界面

### Phase 4：优化与完善 (2-3 周)
- [ ] 批量生成（一次生成多个变体）
- [ ] 风格预设（古典、现代、奇幻等）
- [ ] 智能后处理（自动修复常见问题）
- [ ] 性能优化（GPU 加速）
- [ ] 文档和示例

**输出：** 生产就绪的视觉模式功能

---

## 系统集成

### 前端集成 (`src/App.jsx`)
```javascript
// 新增 generationMode: 'vision'
const generationModes = [
  { value: 'fast', label: '快速模式' },
  { value: 'custom', label: '自定义模式' },
  { value: 'autonomous', label: '自主模式' },
  { value: 'vision', label: '视觉模式' },  // 新增
];
```

### 后端集成 (`server.js`)
```javascript
// 新增 API 端点
app.post('/api/vision/generate-image', async (req, res) => {
  // 调用生图模型
});

app.post('/api/vision/image-to-3d', async (req, res) => {
  // 调用图转 3D 模型
});

app.post('/api/vision/voxelize', async (req, res) => {
  // 体素化处理
});
```

### 工具集成 (`src/utils/`)
```
src/utils/
├── voxelizer.js          # 体素化引擎（新增）
├── blockPalette.js       # 方块调色板（新增）
├── meshProcessor.js      # 3D 模型处理（新增）
└── visionMode.js         # 视觉模式主控制器（新增）
```

---

## 依赖和成本

### 技术依赖
- **GPU 资源**：Stable Diffusion + TripoSR 需要至少 8GB VRAM（建议 RTX 3060 或以上）
- **Python 环境**：生图和图转 3D 模型需要 Python 后端（可通过子进程调用）
- **Three.js 扩展**：体素化需要 mesh 操作，可能需要额外的几何库

### 开发成本估算
- **开发时间**：约 10-12 周（全职开发）
- **API 成本**（如果使用云服务）：
  - OpenAI DALL-E 3：$0.04/张（1024x1024）
  - Shap-E：暂无公开定价
- **硬件成本**：GPU 服务器或本地 GPU（一次性投入）

---

## 技术风险

### 高风险项
1. **图转 3D 质量不稳定**：当前技术还不够成熟，生成的 3D 模型可能质量差
2. **体素化精度损失**：曲线建筑转方块时的失真严重
3. **性能瓶颈**：大型建筑的体素化耗时可能达到分钟级

### 风险缓解
- **降级方案**：如果图转 3D 效果不好，可以只做"生图参考 + 辅助设计"（不自动转换）
- **分辨率控制**：提供低/中/高三档，平衡质量和速度
- **混合模式**：视觉模式生成大致结构，再用现有模式精修细节

---

## 成功标准

### MVP (最小可行产品)
- [ ] 用户输入描述 → 生成图像 → 转 3D 模型 → 输出方块数据
- [ ] 整个流程 < 2 分钟（中等分辨率）
- [ ] 生成结果与原图像相似度 > 60%

### 完整版本
- [ ] 支持多种风格和尺寸
- [ ] 体素化质量达到"可用"级别（用户无需大幅修改）
- [ ] 性能优化：大型建筑 < 5 分钟
- [ ] 用户满意度 > 70%（通过 Beta 测试）

---

## 参考资料

### 开源项目
- [TripoSR](https://github.com/VAST-AI-Research/TripoSR) - 图转 3D 模型
- [ThreeJS-Voxelizer](https://github.com/andsve/voxelizer.js) - 体素化参考
- [Magica Voxel](https://ephtracy.github.io/) - 体素编辑器（灵感来源）

### 学术论文
- "Learning to Reconstruct 3D Non-Cuboid Room Layout from a Single RGB Image" (体素化算法)
- "NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis" (3D 重建)

### 相关技术
- [Stable Diffusion](https://github.com/Stability-AI/stablediffusion)
- [DALL-E 3 API](https://platform.openai.com/docs/guides/images)
- [Three.js Geometry Utils](https://threejs.org/docs/#api/en/geometries/)

---

## 总结

**视觉模式**是一个雄心勃勃的功能，有潜力让 MC AI Builder 成为真正的"概念到建筑"的全流程工具。但技术挑战较大，建议在现有软件完善稳定后，作为**下一个主要版本（v3.0）** 的核心功能进行开发。

### 建议时间线
- **2026-09 ~ 2026-10**：完成 P3 目标（现有软件完善）
- **2026-11**：技术验证 (Phase 1)
- **2026-12 ~ 2027-01**：核心开发 (Phase 2-3)
- **2027-02**：Beta 测试和优化 (Phase 4)
- **2027-03**：正式发布 v3.0

---

**文档维护：** 随着技术发展和实践经验，本文档将持续更新。
