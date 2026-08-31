# MC AI Builder - 轻量版 MC 原版改造计划

## 🎯 目标

将当前系统改造成一个完全基于 MC 原版 JSON 的轻量版 Minecraft，实现：
- 100% 使用 MC 1.20.1 原版数据
- 所有方块使用原版模型和纹理
- 所有游戏逻辑基于原版规则
- 零手写几何体，零硬编码

---

## 📊 当前状态 vs 目标状态

### 当前状态
- ✅ 栅栏/墙体/灯笼/火把使用原版模型
- ⚠️ 大部分方块使用简单立方体 + 纹理
- ⚠️ 楼梯使用简化几何体
- ❌ 很多特殊方块未实现

### 目标状态
- ✅ **所有方块**使用原版模型
- ✅ 所有 blockstate 规则正确应用
- ✅ 所有纹理使用原版 atlas
- ✅ 支持方块状态变化（门开关、红石等）

---

## 🏗️ 架构设计

### 核心系统

```
MC 原版数据层
├── models/          # JSON 模型文件
├── blockstates/     # 方块状态定义
├── textures/        # 纹理图片
└── atlas/           # 纹理集合

↓

解析层 (已完成 80%)
├── mcModelLoader.js          # ✅ 模型解析
├── mcBlockstateLoader.js     # ✅ 状态解析
├── mcTextureLoader.js        # 🔨 需要完善
└── mcAnimationLoader.js      # ❌ 新增（动画支持）

↓

渲染层
├── MCModelInstancedBlocks    # ✅ 实例化渲染
├── MCBlockRenderer           # 🔨 统一渲染器
└── MCWorldRenderer           # 🔨 世界管理

↓

游戏逻辑层
├── BlockStateManager         # ❌ 方块状态管理
├── BlockInteraction          # ❌ 交互系统
└── PhysicsEngine             # ❌ 物理系统（可选）
```

---

## 🚀 改造路线图

### Phase 1: 完善模型系统（1-2周）

#### 1.1 修复当前问题
- [ ] 修复灯笼渲染（材质问题）
- [ ] 修复楼梯渲染
- [ ] 修复普通方块分类问题

#### 1.2 扩展模型加载器
```javascript
// mcModelLoader.js 需要增强

// 1. 父模型继承
async function loadModelWithParent(modelPath, version) {
    const model = await loadModelJson(modelPath);
    
    if (model.parent) {
        const parent = await loadModelWithParent(model.parent, version);
        return mergeModels(parent, model);
    }
    
    return model;
}

// 2. 纹理变量解析
function resolveTextures(model) {
    // 处理 #texture, #particle 等引用
    // 递归解析父模型的纹理
}

// 3. 旋转和缩放支持
function applyTransforms(geometry, rotation, scale) {
    // 应用 blockstate 中的变换
}
```

#### 1.3 完善 blockstate 解析
```javascript
// mcBlockstateLoader.js 需要增强

// 1. 支持所有 multipart 条件
function evaluateCondition(condition, properties) {
    // 支持 OR, AND, 范围检查等
    // 当前只支持基础条件
}

// 2. 支持权重随机
function selectVariant(variants, properties) {
    // 支持 weight 属性
    // 随机选择变体
}

// 3. 支持 uvlock
function applyUVLock(geometry, rotation) {
    // 旋转时保持 UV 不变
}
```

### Phase 2: 统一渲染系统（1周）

#### 2.1 创建统一渲染器
```javascript
// src/components/MCBlockRenderer.jsx

/**
 * 统一方块渲染器
 * 替代当前的 TexturedInstancedBlocks, VanillaMultiElementBlocks 等
 */
class MCBlockRenderer {
    constructor(blocks, version) {
        this.blocks = blocks;
        this.version = version;
    }
    
    async render() {
        // 1. 按方块类型分组
        const groups = this.groupBlocks();
        
        // 2. 为每组加载 blockstate 和模型
        for (const [blockType, blocks] of groups) {
            const blockstate = await loadBlockstate(blockType);
            const models = await resolveModels(blockstate, blocks);
            
            // 3. 创建实例化 mesh
            this.createInstancedMesh(models, blocks);
        }
    }
    
    groupBlocks() {
        // 所有方块都使用相同的流程，不再区分特殊类型
    }
}
```

#### 2.2 重构 VoxelWorld
```javascript
// src/components/VoxelWorld.jsx 简化

function VoxelWorld() {
    const blocks = useStore(state => state.blocks);
    
    return (
        <Canvas>
            <MCWorldRenderer blocks={blocks} version="1.20.1" />
        </Canvas>
    );
}

// MCWorldRenderer 内部处理所有渲染逻辑
function MCWorldRenderer({ blocks, version }) {
    return (
        <>
            {/* 所有方块使用统一渲染器 */}
            <MCBlockRenderer blocks={blocks} version={version} />
            
            {/* 光照系统 */}
            <LightingSystem blocks={blocks} />
            
            {/* 粒子效果 */}
            <ParticleSystem />
        </>
    );
}
```

### Phase 3: 纹理系统完善（1周）

#### 3.1 完整 Atlas 支持
```javascript
// src/utils/mcTextureLoader.js

class MCTextureAtlas {
    constructor(version) {
        this.version = version;
        this.atlas = null;
        this.uvMap = null;
    }
    
    async load() {
        // 加载 atlas.png 和 uv-map.json
        this.atlas = await loadTexture(`/minecraft-${version}/atlas.png`);
        this.uvMap = await loadJSON(`/minecraft-${version}/atlas-uv-map.json`);
    }
    
    getUV(textureName) {
        // 返回纹理的 UV 坐标
        return this.uvMap[textureName];
    }
    
    createMaterial(textures) {
        // 创建使用 atlas 的材质
        return new THREE.MeshStandardMaterial({
            map: this.atlas,
            // UV 在几何体中已经设置
        });
    }
}
```

#### 3.2 动画纹理支持
```javascript
// src/utils/mcAnimationLoader.js

class AnimatedTexture {
    constructor(texture, frameCount, frameTime) {
        this.texture = texture;
        this.frameCount = frameCount;
        this.frameTime = frameTime;
        this.currentFrame = 0;
    }
    
    update(deltaTime) {
        // 更新 UV offset 实现动画
        // 水、岩浆、传送门等
    }
}
```

### Phase 4: 方块状态系统（1-2周）

#### 4.1 状态管理
```javascript
// src/systems/BlockStateManager.js

class BlockStateManager {
    constructor() {
        this.states = new Map(); // blockId -> properties
    }
    
    setProperty(blockId, property, value) {
        // 设置方块属性（如门的 open: true）
        const block = this.getBlock(blockId);
        block.properties[property] = value;
        
        // 触发重新渲染
        this.updateBlock(blockId);
    }
    
    updateBlock(blockId) {
        // 重新解析 blockstate
        // 更新几何体和材质
    }
    
    // 示例：开关门
    toggleDoor(blockId) {
        const block = this.getBlock(blockId);
        const isOpen = block.properties.open === 'true';
        this.setProperty(blockId, 'open', isOpen ? 'false' : 'true');
    }
}
```

#### 4.2 交互系统
```javascript
// src/systems/BlockInteraction.js

class BlockInteraction {
    constructor(stateManager) {
        this.stateManager = stateManager;
    }
    
    onBlockClick(blockId, button) {
        const block = this.getBlock(blockId);
        
        // 根据方块类型触发不同行为
        switch (block.type) {
            case 'oak_door':
            case 'iron_door':
                this.stateManager.toggleDoor(blockId);
                break;
                
            case 'lever':
                this.stateManager.toggle(blockId, 'powered');
                break;
                
            case 'oak_button':
                this.stateManager.activateButton(blockId);
                break;
        }
    }
}
```

### Phase 5: 高级特性（可选）

#### 5.1 红石系统
```javascript
// src/systems/RedstoneEngine.js

class RedstoneEngine {
    update() {
        // 计算红石信号传播
        // 更新红石线、中继器等状态
    }
}
```

#### 5.2 流体系统
```javascript
// src/systems/FluidSimulation.js

class FluidSimulation {
    update() {
        // 水和岩浆的流动
        // 基于原版规则
    }
}
```

#### 5.3 实体系统
```javascript
// src/entities/MCEntity.js

class MCEntity {
    // 掉落物、生物等
    // 使用原版模型
}
```

---

## 📁 目录结构改造

```
src/
├── systems/                  # 新增：游戏系统
│   ├── BlockStateManager.js
│   ├── BlockInteraction.js
│   ├── RedstoneEngine.js
│   └── FluidSimulation.js
│
├── renderers/               # 重构：渲染器
│   ├── MCBlockRenderer.jsx
│   ├── MCWorldRenderer.jsx
│   └── MCEntityRenderer.jsx
│
├── loaders/                 # 重组：加载器
│   ├── mcModelLoader.js     # 增强
│   ├── mcBlockstateLoader.js # 增强
│   ├── mcTextureLoader.js   # 新增
│   └── mcAnimationLoader.js # 新增
│
└── components/
    └── VoxelWorld.jsx       # 简化
```

---

## 🎮 用户体验改进

### 交互模式
```javascript
// 添加 MC 风格的交互

// 1. 方块放置
builder.set(x, y, z, 'oak_door', { facing: 'north', half: 'lower' });

// 2. 方块交互
world.interact(blockId); // 开门、激活按钮等

// 3. 方块破坏
world.break(blockId);

// 4. 状态查询
const state = world.getBlockState(blockId);
console.log(state.properties); // { open: 'true', facing: 'north' }
```

### 可视化改进
- 方块高亮（鼠标悬停）
- 破坏动画（裂纹纹理）
- 放置预览（半透明显示）
- 粒子效果（破坏、交互）

---

## 🧪 测试策略

### 方块覆盖测试
```javascript
// 测试所有 MC 1.20.1 方块

const allBlocks = [
    'stone', 'granite', 'diorite', 'andesite',
    'grass_block', 'dirt', 'coarse_dirt',
    // ... 1000+ 方块
];

allBlocks.forEach(block => {
    testBlockRendering(block);
});
```

### 状态测试
```javascript
// 测试所有可能的方块状态组合

testBlockStates('oak_door', [
    { facing: 'north', half: 'lower', open: 'false' },
    { facing: 'north', half: 'lower', open: 'true' },
    { facing: 'south', half: 'upper', open: 'false' },
    // ...
]);
```

---

## 📊 性能优化

### 1. 几何体缓存
```javascript
const geometryCache = new Map();

async function loadModelCached(modelPath, version) {
    const key = `${version}:${modelPath}`;
    if (geometryCache.has(key)) {
        return geometryCache.get(key).clone();
    }
    
    const geometry = await loadModel(modelPath, version);
    geometryCache.set(key, geometry);
    return geometry.clone();
}
```

### 2. 实例化渲染优化
```javascript
// 按模型组合分组，不是按方块类型
// 例如：所有使用 "oak_planks" 纹理的方块合并

const modelGroups = groupByModelSignature(blocks);
// 而不是 groupByBlockType(blocks)
```

### 3. LOD 系统
```javascript
class LODManager {
    update(cameraPosition) {
        // 远处方块使用简化模型
        // 近处方块使用完整模型
    }
}
```

---

## 🎯 里程碑

### Milestone 1: 核心完善（2周）
- [ ] 修复所有已知渲染问题
- [ ] 完善模型加载器（父模型、纹理变量）
- [ ] 统一渲染系统

### Milestone 2: 全方块支持（2周）
- [ ] 测试所有 1000+ 方块
- [ ] 修复特殊方块（门、活板门、楼梯等）
- [ ] 完善纹理系统

### Milestone 3: 交互系统（2周）
- [ ] 方块状态管理
- [ ] 交互系统（开门、激活等）
- [ ] 视觉反馈

### Milestone 4: 高级特性（可选）
- [ ] 红石系统
- [ ] 流体模拟
- [ ] 实体系统

---

## 💡 技术挑战和解决方案

### 挑战 1: 性能
**问题**: 1000+ 方块类型，每个可能有多个状态
**解决**: 
- 实例化渲染
- 几何体缓存
- LOD 系统
- 视锥剔除

### 挑战 2: 复杂 blockstate
**问题**: multipart 规则很复杂（如红石线）
**解决**:
- 完整实现条件评估器
- 测试覆盖所有情况
- 参考原版行为

### 挑战 3: 纹理动画
**问题**: 水、岩浆等需要动画
**解决**:
- UV offset 动画
- 帧缓冲技术
- Shader 优化

---

## 📚 参考资源

- [MC Wiki - Blockstates](https://minecraft.fandom.com/wiki/Model#Block_models)
- [MC Wiki - Models](https://minecraft.fandom.com/wiki/Model#Item_models)
- [MC 1.20.1 Assets](https://github.com/InventivetalentDev/minecraft-assets)

---

## 🎉 最终愿景

完成后的系统将是：
- 🎮 **轻量级 MC** - 浏览器中的 Minecraft
- 📦 **100% 原版** - 所有数据来自官方
- 🚀 **高性能** - WebGL 优化
- 🔧 **AI 驱动** - 自然语言建造
- 🎨 **完全可视化** - 所见即所得

这将是一个真正的"MC AI Builder" - 用 AI 在浏览器中建造 Minecraft 世界！

---

**预计总开发时间**: 6-8周
**当前完成度**: 30%
**下一步**: 修复灯笼和楼梯渲染问题
