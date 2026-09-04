# P3 Phase 2 统一渲染系统设计

> **日期**: 2026-09-04  
> **状态**: 🚧 设计中  
> **目标**: 统一所有方块渲染逻辑，减少代码重复，提高可维护性

---

## 📊 现状分析

### 当前架构问题

**VoxelWorld.jsx (2341 行)**：
1. **多个独立渲染器**（代码重复）：
   - `InstancedBlocks` - 纯色方块
   - `TexturedInstancedBlocks` - 纹理立方体
   - `FenceWallInstancedBlocks` - 栅栏/墙体
   - `TorchLanternInstancedBlocks` - 火把/灯笼
   - `CrossInstancedBlocks` - 十字植物
   - `InstancedStairsBlocks` - 楼梯
   - `InstancedSlabBlocks` - 台阶
   - `MCModelInstancedBlocks` - MC 原版模型

2. **硬编码方块类型判断**：
   ```javascript
   if (blockType.includes('fence') && !blockType.includes('gate')) { ... }
   if (blockType.includes('torch')) { ... }
   if (blockType.includes('stairs')) { ... }
   ```

3. **纹理加载分散**：
   - Atlas 系统（`atlasMaterial.js`）
   - 独立纹理加载（`loadTexture()`）
   - 回退颜色（`FALLBACK_COLORS`）

4. **几何体生成分散**：
   - 各种 `utils/*Geometry.js` 文件
   - 每个渲染器内部逻辑

### 代码重复度分析

| 功能 | 当前实现 | 重复次数 |
|------|---------|---------|
| 位置映射构建 | 每个渲染器内部 | 5+ 次 |
| 纹理加载 | 分散在各处 | 8+ 次 |
| 实例化 mesh 创建 | 每个渲染器 | 8+ 次 |
| 点击事件处理 | 每个渲染器 | 8+ 次 |
| 连接计算 | fence/wall 各自实现 | 2 次 |

---

## 🎯 设计目标

### 核心原则
1. **单一职责**: 每个组件只做一件事
2. **数据驱动**: 配置而非硬编码
3. **可扩展**: 新方块类型无需修改核心代码
4. **性能优先**: 继续使用 instanced rendering

### 架构目标
- ✅ 所有方块使用统一渲染流程
- ✅ blockstate/model 自动解析
- ✅ 纹理系统统一管理
- ✅ 几何体生成模块化
- ✅ VoxelWorld.jsx 简化到 < 500 行

---

## 🏗️ 新架构设计

### 目录结构

```
src/
├── renderers/                    # 新增：渲染器目录
│   ├── MCBlockRenderer.jsx       # 核心：统一方块渲染器
│   ├── MCWorldRenderer.jsx       # 世界渲染管理器
│   └── MCLightingSystem.jsx      # 光照系统（独立）
│
├── systems/                      # 新增：渲染系统
│   ├── BlockGrouper.js           # 方块分组逻辑
│   ├── GeometryFactory.js        # 几何体工厂
│   ├── MaterialManager.js        # 材质管理器
│   └── InstanceManager.js        # 实例化管理器
│
├── utils/                        # 保留：工具函数
│   ├── mcModelLoader.js          # ✅ 已完善
│   ├── mcBlockstateLoader.js     # ✅ 已完善
│   ├── textureMapping.js         # 保留
│   └── *Geometry.js              # 保留（工厂调用）
│
└── components/
    └── VoxelWorld.jsx            # 简化：< 500 行
```

---

## 📐 核心组件设计

### 1. MCBlockRenderer.jsx

**职责**: 统一的方块渲染入口

```javascript
/**
 * 统一方块渲染器
 * 
 * 输入: blocks 数组
 * 输出: 实例化的 Three.js meshes
 */
function MCBlockRenderer({ blocks, version, onBlockClick }) {
    // 1. 分组：按渲染签名分组（而非类型）
    const groups = useMemo(() => 
        BlockGrouper.groupByRenderSignature(blocks, version),
        [blocks, version]
    );

    // 2. 为每组创建实例化 mesh
    return (
        <>
            {groups.map(group => (
                <InstancedBlockGroup 
                    key={group.signature}
                    group={group}
                    onBlockClick={onBlockClick}
                />
            ))}
        </>
    );
}
```

**渲染签名（Render Signature）**:
```javascript
// 示例：所有使用相同模型+纹理的方块合并为一组
signature = `${modelPath}:${textureKeys}:${materialProps}`

// 例如：
// - 所有 oak_planks 立方体 → "cube:oak_planks:opaque"
// - 所有 glass 立方体 → "cube:glass:transparent"
// - 所有朝北的 oak_fence → "fence_post+fence_side_n:oak_planks:opaque"
```

### 2. BlockGrouper.js

**职责**: 智能分组逻辑

```javascript
class BlockGrouper {
    /**
     * 按渲染签名分组（性能优化关键）
     */
    static groupByRenderSignature(blocks, version) {
        const groups = new Map();

        for (const block of blocks) {
            const signature = this.computeSignature(block, version);
            
            if (!groups.has(signature)) {
                groups.set(signature, {
                    signature,
                    blocks: [],
                    geometry: null,    // 延迟加载
                    material: null     // 延迟加载
                });
            }
            
            groups.get(signature).blocks.push(block);
        }

        return Array.from(groups.values());
    }

    /**
     * 计算渲染签名
     */
    static computeSignature(block, version) {
        // 1. 解析 blockstate → 获取模型路径
        // 2. 推断连接状态（fence/wall/etc）
        // 3. 获取材质属性（透明/发光/等）
        // 4. 生成唯一签名字符串
    }
}
```

### 3. GeometryFactory.js

**职责**: 统一几何体生成

```javascript
class GeometryFactory {
    /**
     * 根据方块类型生成几何体
     */
    static async createGeometry(block, version) {
        // 1. 加载 blockstate
        const blockstate = await loadBlockstateJson(block.type, version);
        
        // 2. 解析适用的模型
        const models = parseBlockstate(blockstate, block.properties);
        
        // 3. 加载模型几何体
        const geometries = await Promise.all(
            models.map(m => loadModelCached(m.model, version))
        );
        
        // 4. 合并几何体
        return this.mergeGeometries(geometries);
    }

    /**
     * 特殊方块的几何体生成（兼容旧系统）
     */
    static createSpecialGeometry(blockType, properties) {
        // 保留对 fenceWallGeometry.js 等的调用
        // 作为过渡方案
    }
}
```

### 4. MaterialManager.js

**职责**: 统一材质管理

```javascript
class MaterialManager {
    constructor(version) {
        this.version = version;
        this.materialCache = new Map();
        this.atlas = null;
    }

    /**
     * 获取或创建材质
     */
    async getMaterial(textureRef, materialProps) {
        const key = `${textureRef}:${JSON.stringify(materialProps)}`;
        
        if (this.materialCache.has(key)) {
            return this.materialCache.get(key);
        }

        // 1. 尝试从 atlas 获取
        if (this.atlas) {
            const material = this.createAtlasMaterial(textureRef, materialProps);
            if (material) {
                this.materialCache.set(key, material);
                return material;
            }
        }

        // 2. 加载独立纹理
        const texture = await loadTexture(textureRef, this.version);
        const material = this.createMaterial(texture, materialProps);
        
        this.materialCache.set(key, material);
        return material;
    }

    createMaterial(texture, props) {
        return new THREE.MeshStandardMaterial({
            map: texture,
            transparent: props.transparent || false,
            opacity: props.opacity || 1.0,
            emissive: props.emissive || 0x000000,
            emissiveIntensity: props.emissiveIntensity || 0,
            side: props.doubleSided ? THREE.DoubleSide : THREE.FrontSide
        });
    }
}
```

### 5. InstanceManager.js

**职责**: 实例化 mesh 管理

```javascript
class InstanceManager {
    /**
     * 创建实例化 mesh
     */
    static createInstancedMesh(geometry, material, blocks) {
        const count = blocks.length;
        const mesh = new THREE.InstancedMesh(geometry, material, count);

        // 设置每个实例的变换矩阵
        const matrix = new THREE.Matrix4();
        blocks.forEach((block, i) => {
            const [x, y, z] = block.position;
            matrix.makeTranslation(x, y, z);
            mesh.setMatrixAt(i, matrix);
        });

        mesh.instanceMatrix.needsUpdate = true;

        // 添加自定义数据（用于点击检测）
        mesh.userData.blocks = blocks;
        mesh.userData.isInstancedMesh = true;

        return mesh;
    }

    /**
     * 更新实例变换
     */
    static updateInstance(mesh, index, position) {
        const matrix = new THREE.Matrix4();
        matrix.makeTranslation(...position);
        mesh.setMatrixAt(index, matrix);
        mesh.instanceMatrix.needsUpdate = true;
    }
}
```

---

## 🔄 渲染流程

### 完整流程图

```
blocks 数组输入
    ↓
[BlockGrouper]
按渲染签名分组
    ↓
对每个组：
    ↓
[GeometryFactory]
生成/缓存几何体
    ↓
[MaterialManager]
获取/缓存材质
    ↓
[InstanceManager]
创建实例化 mesh
    ↓
Three.js 场景
```

### 示例：渲染一组 oak_planks

```javascript
// 输入
blocks = [
    { type: 'oak_planks', position: [0, 0, 0] },
    { type: 'oak_planks', position: [1, 0, 0] },
    { type: 'oak_planks', position: [2, 0, 0] }
]

// 1. 分组
signature = "cube_all:oak_planks:opaque"
group = { signature, blocks: [...], geometry: null, material: null }

// 2. 生成几何体
geometry = await GeometryFactory.createGeometry(blocks[0], '1.20.1')
// → 加载 blockstates/oak_planks.json
// → 解析得到 model: "block/cube_all"
// → 加载 models/block/cube_all.json（父模型继承）
// → 生成 BoxGeometry

// 3. 获取材质
material = await MaterialManager.getMaterial('block/oak_planks', { opaque: true })
// → 从 atlas 或独立加载

// 4. 创建实例化 mesh
mesh = InstanceManager.createInstancedMesh(geometry, material, blocks)
// → 3 个实例，位置分别在 (0,0,0), (1,0,0), (2,0,0)

// 5. 渲染
return <primitive object={mesh} />
```

---

## 📦 简化后的 VoxelWorld.jsx

```javascript
// 新的 VoxelWorld.jsx（< 500 行）

function VoxelWorld() {
    const blocks = useStore(state => state.blocks);
    const version = useStore(state => state.version || '1.20.1');

    return (
        <Canvas>
            <MCWorldRenderer 
                blocks={blocks} 
                version={version}
            />
        </Canvas>
    );
}

function MCWorldRenderer({ blocks, version }) {
    const handleBlockClick = useCallback((block) => {
        // 点击事件处理
    }, []);

    return (
        <group>
            {/* 所有方块使用统一渲染器 */}
            <MCBlockRenderer 
                blocks={blocks}
                version={version}
                onBlockClick={handleBlockClick}
            />

            {/* 光照系统 */}
            <MCLightingSystem blocks={blocks} />

            {/* 环境光/平行光 */}
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={0.8} />

            {/* 相机控制 */}
            <OrbitControls />
        </group>
    );
}
```

---

## 🚀 实施计划

### Step 1: 创建核心系统（1-2 天）
- [ ] `BlockGrouper.js` - 分组逻辑
- [ ] `GeometryFactory.js` - 几何体工厂
- [ ] `MaterialManager.js` - 材质管理
- [ ] `InstanceManager.js` - 实例化管理

### Step 2: 创建渲染器（1-2 天）
- [ ] `MCBlockRenderer.jsx` - 统一渲染器
- [ ] `MCWorldRenderer.jsx` - 世界管理器
- [ ] `MCLightingSystem.jsx` - 光照系统

### Step 3: 重构 VoxelWorld（1 天）
- [ ] 删除旧的渲染器代码
- [ ] 切换到新架构
- [ ] 保持向后兼容

### Step 4: 测试与验证（1 天）
- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能对比

---

## ⚠️ 风险与缓解

### 风险 1: 性能回退
**缓解**: 
- 保持 instanced rendering
- 渲染签名分组优化
- 几何体和材质缓存

### 风险 2: 兼容性问题
**缓解**:
- 保留旧的 utils/*Geometry.js
- 渐进式迁移
- 特殊方块回退机制

### 风险 3: 开发时间超预期
**缓解**:
- 先实现核心功能
- 特殊方块延后处理
- 单元测试保证质量

---

## 📊 预期收益

### 代码量
- **之前**: VoxelWorld.jsx 2341 行
- **之后**: 
  - VoxelWorld.jsx < 500 行
  - 新系统文件 ~1000 行
  - **总计减少 ~800 行**

### 可维护性
- ✅ 单一职责，易于理解
- ✅ 新方块类型：修改配置而非代码
- ✅ 测试覆盖：每个模块独立测试

### 性能
- ✅ 按渲染签名分组（更优分组）
- ✅ 几何体和材质缓存
- ✅ 预期性能持平或略优

---

**设计完成日期**: 2026-09-04  
**开始实施**: 待确认
