# 任务书：MC 原版 Atlas + UV 映射渲染系统完整实现

> 项目：mc-ai-builder-v2 | 日期：2026-08-30 | P2 阶段：完整复刻 MC 原版渲染管线
> **目标**：替换现有简化材质系统，实现 MC 原版的 atlas 纹理集 + per-face UV 映射 + 多贴图引用，彻底解决当前火把/灯笼/切石机等方块的材质缺失和渲染错误问题。

---

## 一、背景与问题

### 当前状态（P3 完成后）
- ✅ 几何系统：`vanilla-block-models.json` 已包含 288 个方块的精确 element 坐标/rotation/faces
- ✅ 数据驱动渲染器：`VanillaMultiElementBlocks` 组件可读取 JSON 生成几何
- ❌ **材质系统断裂**：调用现有 `getOrCreateMaterial()` 只支持 6 面立方体贴同一张图，无法处理 MC 原版的 per-face UV + 多贴图引用

### 用户反馈（实测截图）
- ❌ 火把/灯笼：形状正确但**白模/灰模**（无贴图）
- ❌ 铁栏杆/切石机：渲染错误（几何或材质问题）
- ✅ 龙蛋：正常（单纯几何拼装，无复杂贴图）

### 根本原因
当前材质系统是为简化场景设计的（每个方块一张图），**不兼容 MC 原版的渲染机制**：
1. **Atlas 系统缺失**：MC 原版把所有 block 贴图打包成一张 atlas（1024×1024 或更大），每个贴图占 16×16 像素区域，通过 UV 坐标引用
2. **Per-face UV 缺失**：`vanilla-block-models.json` 里每个 element 的每个 face 都有独立 UV 坐标（如 `"uv": [7, 0, 9, 16]`），指向贴图的具体区域，当前代码忽略了这些数据
3. **多贴图引用断裂**：一个方块可以引用多张贴图（如切石机的 `bottom/top/side/saw`），通过 `textures: {saw: "block/stonecutter_saw"}` 定义，当前代码没处理

---

## 二、你的任务（MC 原版渲染管线完整实现）

### 步骤 1：生成 Atlas 纹理集

写脚本 `scripts/build-texture-atlas.mjs`：
- **输入**：`public/minecraft-1.20.1/textures/block/*.png`（所有方块贴图，约 1000+ 张）
- **处理**：
  1. 扫描所有 PNG，记录尺寸（大部分是 16×16，部分动画贴图可能更大）
  2. 打包成一张 atlas（推荐 2048×2048 或 4096×4096，2 的幂次，兼容 WebGL）
  3. 使用 `sharp` 或 `canvas` 库拼接图片（npm install sharp）
  4. 每张贴图在 atlas 上占一个固定尺寸格子（16×16），记录其 UV 坐标
- **输出**：
  - `public/minecraft-1.20.1/atlas.png`（合并后的大图）
  - `public/minecraft-1.20.1/atlas-uv-map.json`（格式见下）

**atlas-uv-map.json 格式**：
```json
{
  "atlasSize": [2048, 2048],
  "tileSize": 16,
  "textures": {
    "block/torch": {
      "x": 0, "y": 0, "width": 16, "height": 16,
      "uv": [0, 0, 0.0078125, 0.0078125]  // 归一化 UV (0-1)
    },
    "block/stonecutter_saw": {
      "x": 16, "y": 0, "width": 16, "height": 16,
      "uv": [0.0078125, 0, 0.015625, 0.0078125]
    },
    ...
  }
}
```

**检查点**：运行 `node scripts/build-texture-atlas.mjs`，生成 `atlas.png`（2048×2048 以上）和 `atlas-uv-map.json`（包含 1000+ 条贴图映射）。

---

### 步骤 2：改造材质系统（Atlas-based Material）

创建新文件 `src/utils/atlasMaterial.js`：

```javascript
import * as THREE from 'three';

let atlasTexture = null;
let atlasUVMap = null;

/**
 * 加载 atlas 纹理和 UV 映射表（全局单例）
 */
export async function loadAtlas(version = '1.20.1') {
    if (atlasTexture && atlasUVMap) return { atlasTexture, atlasUVMap };
    
    const [texture, uvMap] = await Promise.all([
        new THREE.TextureLoader().loadAsync(`/minecraft-${version}/atlas.png`),
        fetch(`/minecraft-${version}/atlas-uv-map.json`).then(r => r.json())
    ]);
    
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    
    atlasTexture = texture;
    atlasUVMap = uvMap;
    
    return { atlasTexture, atlasUVMap };
}

/**
 * 创建 atlas 材质（共享同一张 atlas 纹理）
 */
export function createAtlasMaterial() {
    if (!atlasTexture) throw new Error('Atlas not loaded. Call loadAtlas() first.');
    
    return new THREE.MeshLambertMaterial({
        map: atlasTexture,
        transparent: true,
        alphaTest: 0.1,
        side: THREE.FrontSide
    });
}

/**
 * 解析贴图引用（如 "#torch" → "block/torch"）
 */
export function resolveTextureRef(ref, texturesBlock) {
    if (!ref) return null;
    if (ref.startsWith('#')) {
        const key = ref.slice(1);
        return texturesBlock[key] || null;
    }
    return ref;
}

/**
 * 获取贴图在 atlas 上的 UV 坐标
 */
export function getTextureUV(texturePath) {
    if (!atlasUVMap) throw new Error('Atlas UV map not loaded.');
    const entry = atlasUVMap.textures[texturePath];
    if (!entry) {
        console.warn(`Texture not found in atlas: ${texturePath}`);
        return [0, 0, 0.0078125, 0.0078125]; // fallback 到第一个格子
    }
    return entry.uv; // [u0, v0, u1, v1]
}
```

**检查点**：导入 `atlasMaterial.js`，调用 `loadAtlas()` 后 `atlasTexture` 和 `atlasUVMap` 都非 null。

---

### 步骤 3：重写 VanillaMultiElementBlocks（基于 Atlas + Per-face UV）

改造 `src/components/VoxelWorld.jsx` 里的 `VanillaMultiElementBlocks`：

**核心变化**：
1. **不再调 `getOrCreateMaterial`**，改用 `createAtlasMaterial()`（全局共享一个材质，所有方块用同一张 atlas）
2. **手动构建 BufferGeometry**：
   - 每个 element 生成 6 个 face（或部分 face，如果 JSON 里只定义了某些面）
   - 每个 face 是一个四边形（2 个三角形，6 个顶点）
   - 顶点位置从 element 的 `from`/`to` 计算，顶点 UV 从 face 的 `uv` 字段 + atlas UV map 计算
3. **多贴图引用处理**：
   - 从 `vanilla-block-models.json` 读取 `textures` 字段（如 `{torch: "block/torch", particle: "block/torch"}`）
   - face 的 `texture` 字段（如 `"#torch"`）通过 `resolveTextureRef()` 解析成 `"block/torch"`
   - 再通过 `getTextureUV("block/torch")` 拿到 atlas 上的 UV 坐标
4. **UV 坐标计算**：
   - JSON 里的 `uv` 是相对于单张贴图的像素坐标（如 `[7, 0, 9, 16]`，意为 16×16 贴图上的 (7,0) 到 (9,16) 区域）
   - 需要转换成 atlas 上的归一化 UV：
     ```javascript
     // atlasUV = [u0, v0, u1, v1]（该贴图在 atlas 上的范围，0-1）
     // faceUV = [x0, y0, x1, y1]（face 在单张贴图上的像素范围）
     const finalUV = [
         atlasUV[0] + (faceUV[0] / 16) * (atlasUV[2] - atlasUV[0]),
         atlasUV[1] + (faceUV[1] / 16) * (atlasUV[3] - atlasUV[1]),
         atlasUV[0] + (faceUV[2] / 16) * (atlasUV[2] - atlasUV[0]),
         atlasUV[1] + (faceUV[3] / 16) * (atlasUV[3] - atlasUV[1])
     ];
     ```

**伪代码示例**：
```javascript
function VanillaMultiElementBlocks({ blocks, version }) {
    const [atlasReady, setAtlasReady] = useState(false);
    
    useEffect(() => {
        loadAtlas(version).then(() => setAtlasReady(true));
    }, [version]);
    
    if (!atlasReady) return null;
    
    const material = createAtlasMaterial();
    
    // 按方块 type 分组
    const byType = groupBy(blocks, b => cleanBlockType(b.type));
    
    return (
        <>
            {Object.entries(byType).map(([type, typeBlocks]) => (
                <VanillaBlockType 
                    key={type}
                    blockType={type}
                    blocks={typeBlocks}
                    material={material}
                    version={version}
                />
            ))}
        </>
    );
}

function VanillaBlockType({ blockType, blocks, material, version }) {
    const meshRef = useRef();
    const [modelData, setModelData] = useState(null);
    
    useEffect(() => {
        fetch(`/minecraft-${version}/vanilla-block-models.json`)
            .then(r => r.json())
            .then(data => setModelData(data[blockType]));
    }, [blockType, version]);
    
    useEffect(() => {
        if (!modelData || !meshRef.current) return;
        
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const uvs = [];
        const indices = [];
        
        let vertexOffset = 0;
        
        blocks.forEach(block => {
            const [bx, by, bz] = block.position;
            
            modelData.elements.forEach(element => {
                const from = element.from; // [x0, y0, z0] 归一化 0-1
                const to = element.to;     // [x1, y1, z1]
                
                // 为每个 face 生成顶点
                ['north', 'south', 'east', 'west', 'up', 'down'].forEach(dir => {
                    const face = element.faces?.[dir];
                    if (!face) return;
                    
                    // 解析贴图引用
                    const texPath = resolveTextureRef(face.texture, modelData.textures);
                    const atlasUV = getTextureUV(texPath);
                    const faceUV = face.uv || [0, 0, 16, 16]; // 默认满贴图
                    
                    // 计算 4 个顶点位置（根据 dir 和 from/to）
                    const verts = getFaceVertices(dir, from, to, bx, by, bz);
                    
                    // 计算 4 个顶点 UV（映射到 atlas）
                    const vertUVs = mapFaceUVToAtlas(faceUV, atlasUV);
                    
                    // 添加顶点
                    positions.push(...verts.flat());
                    uvs.push(...vertUVs.flat());
                    
                    // 添加索引（2 个三角形）
                    indices.push(
                        vertexOffset, vertexOffset + 1, vertexOffset + 2,
                        vertexOffset, vertexOffset + 2, vertexOffset + 3
                    );
                    vertexOffset += 4;
                });
            });
        });
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        meshRef.current.geometry = geometry;
    }, [modelData, blocks]);
    
    return <mesh ref={meshRef} material={material} />;
}
```

**检查点**：火把/灯笼/切石机等方块渲染出完整贴图，不再是白模。

---

### 步骤 4：处理特殊情况

#### 4.1 Rotation 支持
element 的 `rotation` 字段（如 `{origin: [8,8,8], axis: "y", angle: 45}`）需要在生成顶点前应用旋转变换：
```javascript
if (element.rotation) {
    // 应用旋转矩阵到顶点坐标
    const matrix = new THREE.Matrix4();
    const origin = element.rotation.origin.map(v => v / 16); // 归一化
    matrix.makeRotationAxis(
        new THREE.Vector3(element.rotation.axis === 'x' ? 1 : 0, 
                          element.rotation.axis === 'y' ? 1 : 0, 
                          element.rotation.axis === 'z' ? 1 : 0),
        THREE.MathUtils.degToRad(element.rotation.angle)
    );
    // 平移到 origin → 旋转 → 平移回来
    // ...
}
```

#### 4.2 Multipart 连接类（栅栏/墙/玻璃板）
保留现有 `FenceWallInstancedBlocks` 逻辑，但改为从 `vanilla-block-models.json` 读取柱/杆的几何数据，材质也用 atlas。

#### 4.3 铁栏杆特殊处理
`iron_bars` 是 multipart，根据相邻方块动态选择 `iron_bars_post`（立柱）+ `iron_bars_side`（连杆）组合。需要：
1. 检测相邻方块是否也是铁栏杆
2. 动态加载对应的 model（`iron_bars_post.json` / `iron_bars_side.json`）
3. 合并渲染

---

### 步骤 5：验收与提交

#### 5.1 静态验收
- `npm test`：vitest 全绿
- `npm run build`：构建成功

#### 5.2 浏览器实测
访问 `http://localhost:5173`，输入测试提示词：
```
在10×10区域内建造一个展示场：中心放一个龙蛋，周围一圈用锁链和铁栏杆交替围成栅栏，四个角各放一个灯笼（挂在2格高的栅栏门上），内圈用火把照明（每隔2格放一个），地面铺切石机和砂轮交替排列，边缘装饰蜡烛和酿造台，角落放4个按钮和压力板
```

**验证点**：
- ✅ 火把/灯笼有**完整贴图**（火焰色/金属质感，不是白模）
- ✅ 切石机能看到**锯片纹理**
- ✅ 铁栏杆是**十字交叉细杆**且有金属贴图
- ✅ 所有方块贴图清晰、UV 对齐，无错位/拉伸

截图保存到 `output/p2-atlas-rendering-test.png`。

#### 5.3 提交
```bash
git add scripts/build-texture-atlas.mjs \
        public/minecraft-1.20.1/atlas.png \
        public/minecraft-1.20.1/atlas-uv-map.json \
        src/utils/atlasMaterial.js \
        src/components/VoxelWorld.jsx \
        output/p2-atlas-rendering-test.png

git commit -m "feat(P2): MC 原版 Atlas + Per-face UV 渲染系统完整实现

- Atlas 纹理集生成（2048×2048，1000+ 贴图打包）
- Per-face UV 映射（从 vanilla-block-models.json 精确读取）
- 多贴图引用支持（切石机 bottom/top/side/saw 等）
- 替换 getOrCreateMaterial，全面改用 atlas 材质
- 修复火把/灯笼/切石机/铁栏杆材质缺失问题

vitest 全绿，浏览器实测通过，所有方块完整贴图渲染。"
```

写验收报告 `docs/p2-atlas-rendering-report.md`（对比前后截图、性能数据、覆盖方块列表）。

---

## 三、约束与注意事项

1. **Atlas 尺寸优化**：如果 2048×2048 装不下所有贴图，升级到 4096×4096；动画贴图（如流动的岩浆）暂时用第一帧
2. **性能**：atlas 只加载一次，所有方块共享同一张纹理，draw call 大幅减少
3. **兼容性**：保留现有 fullBlock（石头/泥土）的 `TexturedInstancedBlocks` 渲染路径，不破坏已有功能
4. **错误处理**：贴图缺失时 fallback 到默认格子（atlas 第一个格子），console.warn 提示
5. **中文注释**，代码/文档/commit message 全中文

---

## 四、参考资料

- MC 原版资源包：`C:\Users\21972\OneDrive\Desktop\新建文件夹\YDJMC\assets\minecraft`
- 当前贴图目录：`C:\Users\21972\OneDrive\Desktop\MC\mc-ai-builder-v2\public\minecraft-1.20.1/textures/block/*.png`
- 研究文档：`C:\Users\21972\Doubao\chats\2026-08-30\new-chat\Minecraft方块渲染机制总结.md`
- Three.js BufferGeometry 文档：https://threejs.org/docs/#api/en/core/BufferGeometry
- Atlas 打包库：`sharp` (https://www.npmjs.com/package/sharp)

---

## 五、关键成功要素

- ✅ **Atlas 打包正确**：所有贴图无遗漏、无重叠、UV 坐标精确
- ✅ **UV 映射精确**：face 的 uv 字段正确映射到 atlas 上，无错位/拉伸
- ✅ **多贴图引用**：切石机等方块的不同面能引用不同贴图
- ✅ **Rotation 支持**：锁链/火把的 45° 旋转 element 渲染正确
- ✅ **浏览器实测通过**：火把/灯笼/切石机/铁栏杆全部有完整贴图

**这是 P2 阶段的核心任务，完成后渲染系统将与 MC 原版完全一致。**
