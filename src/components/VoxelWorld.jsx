import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Edges } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { TextureLoader, NearestFilter } from 'three';
import * as THREE from 'three';
import useStore from '../store/useStore';
import { TransformControls } from '@react-three/drei';
import { getTextureBasePath, BLOCK_TEXTURE_ALIASES as ALIASES, FALLBACK_COLORS, GLOW_BLOCKS, WATER_BLOCKS, CN_MATERIAL_MAP, cleanBlockType } from '../utils/textureMapping';
import { inferConnections } from '../utils/blockConnections';

// 中文材质名支持：生成代码（尤其 opus5）常用中文直接写材质（如 "石砖"），
// 在渲染表里补中文键，使后续所有 ALIASES[x]/FALLBACK_COLORS[x] 查询自动命中文名方块
for (const [cn, en] of Object.entries(CN_MATERIAL_MAP)) {
  if (!ALIASES[cn] && ALIASES[en]) ALIASES[cn] = ALIASES[en];
  if (!FALLBACK_COLORS[cn] && FALLBACK_COLORS[en]) FALLBACK_COLORS[cn] = FALLBACK_COLORS[en];
}


// Blocks that should NOT load textures (use fallback colors only)
// These are blocks with textures that don't map well to cubes
const USE_FALLBACK_ONLY = [
    // Small decorative blocks
    'lantern', 'soul_lantern',
    'torch', 'wall_torch', 'soul_torch', 'redstone_torch',
    'flower_pot', 'potted_oak_sapling', 'potted_spruce_sapling', 'potted_birch_sapling',
    'potted_fern', 'potted_dandelion', 'potted_poppy', 'potted_cactus', 'potted_azalea_bush',
    'candle', 'white_candle', 'black_candle', 'red_candle', 'blue_candle',
    // Buttons (no textures exist)
    'oak_button', 'spruce_button', 'birch_button', 'jungle_button',
    'acacia_button', 'dark_oak_button', 'stone_button', 'polished_blackstone_button',
    // Plants/Bushes
    'sweet_berry_bush', 'dead_bush', 'fern', 'large_fern', 'grass', 'tall_grass',
    'seagrass', 'tall_seagrass', 'kelp', 'kelp_plant',
    // Other problematic blocks
    'chest', 'ender_chest', 'trapped_chest',
    'brewing_stand', 'enchanting_table', 'anvil', 'bell',
    'lever', 'tripwire_hook',
];

// Transparent blocks that should render with alpha
const TRANSPARENT_BLOCKS = [
    'glass', 'glass_pane',
    'tinted_glass',
    'white_stained_glass', 'white_stained_glass_pane',
    'orange_stained_glass', 'orange_stained_glass_pane',
    'magenta_stained_glass', 'magenta_stained_glass_pane',
    'light_blue_stained_glass', 'light_blue_stained_glass_pane',
    'yellow_stained_glass', 'yellow_stained_glass_pane',
    'lime_stained_glass', 'lime_stained_glass_pane',
    'pink_stained_glass', 'pink_stained_glass_pane',
    'gray_stained_glass', 'gray_stained_glass_pane',
    'light_gray_stained_glass', 'light_gray_stained_glass_pane',
    'cyan_stained_glass', 'cyan_stained_glass_pane',
    'purple_stained_glass', 'purple_stained_glass_pane',
    'blue_stained_glass', 'blue_stained_glass_pane',
    'brown_stained_glass', 'brown_stained_glass_pane',
    'green_stained_glass', 'green_stained_glass_pane',
    'red_stained_glass', 'red_stained_glass_pane',
    'black_stained_glass', 'black_stained_glass_pane',
    'ice', 'packed_ice', 'blue_ice',
];

// Global texture loader
const loader = new TextureLoader();

// Texture cache - now includes version in key
const textureCache = {};

function loadTexture(type, version = '1.20.1') {
    const cacheKey = `${version}:${type}`;
    if (textureCache[cacheKey]) {
        return Promise.resolve(textureCache[cacheKey]);
    }

    return new Promise((resolve) => {
        const basePath = getTextureBasePath(version);
        const url = `${basePath}${type}.png`;
        loader.load(
            url,
            (tex) => {
                tex.magFilter = NearestFilter;
                tex.minFilter = NearestFilter;
                tex.needsUpdate = true;
                textureCache[cacheKey] = tex;
                resolve(tex);
            },
            undefined,
            () => {
                textureCache[cacheKey] = null;
                resolve(null);
            }
        );
    });
}


// Block shape configurations
// Defines the geometry dimensions [width, height, depth] and position offset [x, y, z]
const BLOCK_SHAPES = {
    // Slabs - half height blocks
    'slab': { size: [1, 0.5, 1], offset: [0, -0.25, 0] },
    // Carpets - very thin
    'carpet': { size: [1, 0.0625, 1], offset: [0, -0.46875, 0] },
    // Pressure plates
    'pressure_plate': { size: [0.875, 0.0625, 0.875], offset: [0, -0.46875, 0] },
    // Buttons - tiny
    'button': { size: [0.375, 0.125, 0.25], offset: [0, 0, 0.375] },
    // Flower pots - small decorative
    'flower_pot': { size: [0.375, 0.375, 0.375], offset: [0, -0.3125, 0] },
    // Lanterns - composite shape (hook + body)
    'lantern': { size: [0.375, 0.5625, 0.375], offset: [0, -0.21875, 0], isComposite: true },
    // Candles
    'candle': { size: [0.25, 0.375, 0.25], offset: [0, -0.3125, 0] },
    // Torches - composite shape (stick + flame)
    'torch': { size: [0.125, 0.625, 0.125], offset: [0, -0.1875, 0], isComposite: true },
    // Walls - slightly narrower
    'wall': { size: [0.5, 1, 0.5], offset: [0, 0, 0] },
    // Fences
    'fence': { size: [0.25, 1, 0.25], offset: [0, 0, 0] },
    // Fence gates - thin door panel
    'gate': { size: [1, 0.875, 0.1875], offset: [0, -0.0625, 0] },
    // Cross shape for plants (two intersecting planes)
    'cross': { size: [1, 1, 1], offset: [0, 0, 0], isCross: true },
    // Full block (default)
    'full': { size: [1, 1, 1], offset: [0, 0, 0] }
};

// Blocks that should render as cross (two intersecting planes)
const CROSS_BLOCKS = [
    // Crops
    'wheat', 'carrots', 'potatoes', 'beetroots', 'nether_wart',
    // Flowers
    'dandelion', 'poppy', 'blue_orchid', 'allium', 'azure_bluet',
    'red_tulip', 'orange_tulip', 'white_tulip', 'pink_tulip',
    'oxeye_daisy', 'cornflower', 'lily_of_the_valley', 'wither_rose',
    'sunflower', 'lilac', 'rose_bush', 'peony', 'torchflower', 'pitcher_plant',
    // Grass & Ferns
    'short_grass', 'tall_grass', 'fern', 'large_fern',
    'dead_bush', 'seagrass', 'tall_seagrass',
    // Saplings
    'oak_sapling', 'spruce_sapling', 'birch_sapling', 'jungle_sapling',
    'acacia_sapling', 'dark_oak_sapling', 'cherry_sapling', 'mangrove_propagule',
    'azalea', 'flowering_azalea',
    // Mushrooms
    'red_mushroom', 'brown_mushroom', 'crimson_fungus', 'warped_fungus',
    // Other plants
    'sweet_berry_bush', 'cave_vines', 'cave_vines_plant',
    'kelp', 'kelp_plant', 'bamboo', 'sugar_cane',
    'nether_sprouts', 'warped_roots', 'crimson_roots',
];

// Map block types to their shape category
const getBlockShape = (blockType) => {
    // 清洗类型名（去除 [properties] 后缀）
    const type = cleanBlockType(blockType).toLowerCase();

    // Check for cross blocks first
    if (CROSS_BLOCKS.some(cb => type === cb || type.startsWith(cb + '?'))) return 'cross';

    // Slabs
    if (type.includes('_slab')) return 'slab';

    // Carpets
    if (type.includes('_carpet') || type === 'moss_carpet') return 'carpet';

    // Pressure plates
    if (type.includes('_pressure_plate')) return 'pressure_plate';

    // Buttons
    if (type.includes('_button')) return 'button';

    // Flower pots
    if (type.includes('flower_pot') || type.includes('potted_')) return 'flower_pot';

    // Lanterns
    if (type === 'lantern' || type === 'soul_lantern') return 'lantern';

    // Candles
    if (type.includes('candle')) return 'candle';

    // Torches
    if (type.includes('torch') && !type.includes('torchflower')) return 'torch';

    // Fence gates
    if (type.includes('_fence_gate')) return 'gate';

    // Walls
    if (type.includes('_wall') && !type.includes('wall_')) return 'wall';

    // Fences
    if (type.includes('_fence') && !type.includes('fence_gate')) return 'fence';

    return 'full';
};

// ============ TEXTURED BLOCK (For quality mode) ============

/**
 * Cross-shaped block for plants (two intersecting planes)
 */
const CrossBlock = React.memo(function CrossBlock({ data, isSelected, onClick }) {
    const [texture, setTexture] = useState(null);
    const type = ALIASES[data.type] || data.type;
    const fallbackColor = FALLBACK_COLORS[data.type] || FALLBACK_COLORS['default'];

    const position = [
        data.position[0] + 0.5,
        data.position[1] + 0.5,
        data.position[2] + 0.5
    ];

    useEffect(() => {
        loadTexture(type, version).then((tex) => {
            setTexture(tex);
        });
    }, [type]);

    // Create two intersecting planes at 45 degrees
    return (
        <group
            position={position}
            onClick={(e) => {
                e.stopPropagation();
                onClick(data.id);
            }}
        >
            {/* First plane - diagonal from corner to corner */}
            <mesh rotation={[0, Math.PI / 4, 0]}>
                <planeGeometry args={[1.414, 1]} /> {/* sqrt(2) for diagonal */}
                <meshBasicMaterial
                    map={texture}
                    color={texture ? '#ffffff' : fallbackColor}
                    toneMapped={false}
                    transparent={true}
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
            {/* Second plane - perpendicular to first */}
            <mesh rotation={[0, -Math.PI / 4, 0]}>
                <planeGeometry args={[1.414, 1]} />
                <meshBasicMaterial
                    map={texture}
                    color={texture ? '#ffffff' : fallbackColor}
                    toneMapped={false}
                    transparent={true}
                    alphaTest={0.1}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
            {isSelected && (
                <mesh>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial color="#fbbf24" wireframe={true} />
                </mesh>
            )}
        </group>
    );
});

/**
 * Single block with texture - used when block count is low
 */
const Block = React.memo(function Block({ data, isSelected, onClick }) {
    const [texture, setTexture] = useState(null);
    const materialRef = useRef();
    const type = ALIASES[data.type] || data.type;
    const fallbackColor = FALLBACK_COLORS[data.type] || FALLBACK_COLORS['default'];
    const useFallbackOnly = USE_FALLBACK_ONLY.includes(data.type);
    const isTransparent = TRANSPARENT_BLOCKS.includes(data.type);

    const shapeType = getBlockShape(data.type);
    const shape = BLOCK_SHAPES[shapeType];
    
    // Use CrossBlock for cross-shaped blocks
    if (shape.isCross) {
        return <CrossBlock data={data} isSelected={isSelected} onClick={onClick} />;
    }

    const position = [
        data.position[0] + 0.5 + shape.offset[0],
        data.position[1] + 0.5 + shape.offset[1],
        data.position[2] + 0.5 + shape.offset[2]
    ];

    useEffect(() => {
        if (useFallbackOnly) {
            setTexture(null);
            return;
        }
        loadTexture(type, version).then((tex) => {
            setTexture(tex);
            if (materialRef.current && tex) {
                materialRef.current.map = tex;
                materialRef.current.needsUpdate = true;
            }
        });
    }, [type, useFallbackOnly]);

    return (
        <mesh
            position={position}
            onClick={(e) => {
                e.stopPropagation();
                onClick(data.id);
            }}
        >
            <boxGeometry args={shape.size} />
            <meshBasicMaterial
                ref={materialRef}
                map={texture}
                color={texture ? '#ffffff' : fallbackColor}
                toneMapped={false}
                transparent={isTransparent}
                opacity={isTransparent ? 0.6 : 1.0}
                side={isTransparent ? THREE.DoubleSide : THREE.FrontSide}
                depthWrite={!isTransparent}
            />
            {isSelected && <Edges color="#fbbf24" linewidth={3} threshold={15} />}
        </mesh>
    );
});

// ============ INSTANCED RENDERING (For performance mode) ============

/**
 * InstancedBlocks - Renders all blocks of one color using InstancedMesh
 * MUCH faster than individual <mesh> components
 */
function InstancedBlocks({ blocks, color }) {
    const meshRef = useRef();
    const tempObject = useMemo(() => new THREE.Object3D(), []);

    useEffect(() => {
        if (!meshRef.current || blocks.length === 0) return;

        blocks.forEach((block, i) => {
            const shape = BLOCK_SHAPES[getBlockShape(block.type)];

            tempObject.position.set(
                block.position[0] + 0.5 + shape.offset[0],
                block.position[1] + 0.5 + shape.offset[1],
                block.position[2] + 0.5 + shape.offset[2]
            );
            tempObject.scale.set(shape.size[0], shape.size[1], shape.size[2]);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [blocks, tempObject]);

    if (blocks.length === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[null, null, blocks.length]} frustumCulled={true}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={color} toneMapped={false} />
        </instancedMesh>
    );
}

// ============ TEXTURED INSTANCED RENDERING ============
// Material cache for performance
// IMPORTANT: Clear this cache if textures aren't loading properly
const materialCache = new Map();

// Clear material cache (call this if textures are broken)
export function clearMaterialCache() {
    materialCache.forEach(mat => mat.dispose());
    materialCache.clear();
}

/**
 * 材质工厂 - 根据方块类型创建合适的材质
 * - 发光方块（GLOW_BLOCKS）: MeshBasicMaterial（固有明亮，不受光照影响）
 * - 水方块（WATER_BLOCKS）: 半透明蓝色 MeshBasicMaterial
 * - 普通方块: MeshLambertMaterial（受光照，产生明暗面）
 */
function getOrCreateMaterial(blockType, version = '1.20.1') {
    const textureKey = ALIASES[blockType] || blockType;
    const isGlow = GLOW_BLOCKS.includes(blockType);
    const isWater = WATER_BLOCKS.includes(blockType) && (blockType === 'water' || blockType === 'flowing_water');

    // 缓存 key 加类别前缀防串用
    let cacheKey = textureKey;
    if (isGlow) cacheKey = `glow:${textureKey}`;
    else if (isWater) cacheKey = `water:${textureKey}`;
    else cacheKey = `lambert:${textureKey}`;

    if (materialCache.has(cacheKey)) {
        return materialCache.get(cacheKey);
    }

    const fallbackColor = FALLBACK_COLORS[blockType] || FALLBACK_COLORS['default'];
    const useFallbackOnly = USE_FALLBACK_ONLY.includes(blockType);
    const isTransparent = TRANSPARENT_BLOCKS.includes(blockType);

    let material;

    // 水方块：半透明蓝色 Basic 材质
    if (isWater) {
        material = new THREE.MeshBasicMaterial({
            color: '#3f76e4',
            toneMapped: false,
            transparent: true,
            opacity: 0.75,
            side: THREE.FrontSide,
            depthTest: true,
            depthWrite: false,
        });
    }
    // 发光方块：Basic 材质（固有明亮）
    else if (isGlow) {
        material = new THREE.MeshBasicMaterial({
            color: fallbackColor,
            toneMapped: false,
            transparent: false,
            side: THREE.FrontSide,
            depthTest: true,
            depthWrite: true,
        });
    }
    // 普通方块：Lambert 材质（受光照）
    else {
        material = new THREE.MeshLambertMaterial({
            color: fallbackColor,
            transparent: isTransparent,
            opacity: isTransparent ? 0.6 : 1.0,
            side: THREE.FrontSide,
            depthTest: true,
            depthWrite: !isTransparent,
        });
    }

    // 异步加载纹理（除非是 fallback-only 或水方块）
    if (!useFallbackOnly && !isWater) {
        loadTexture(textureKey, version).then((tex) => {
            if (tex) {
                material.map = tex;
                material.color.set('#ffffff');
                material.needsUpdate = true;
            }
        });
    }

    materialCache.set(cacheKey, material);
    return material;
}

function TexturedInstancedBlocks({ blocks, blockType, onBlockClick, positionMap, version = '1.20.1' }) {
    const meshRef = useRef();
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const material = useMemo(() => getOrCreateMaterial(blockType, version), [blockType, version]);

    // Check if this is a cross-shaped block
    const shapeType = getBlockShape(blockType);
    const isCross = BLOCK_SHAPES[shapeType]?.isCross;
    const isComposite = BLOCK_SHAPES[shapeType]?.isComposite;

    // Check if this is a fence or wall (need special rendering)
    const isFence = blockType.includes('_fence') && !blockType.includes('fence_gate');
    const isWall = blockType.includes('_wall') && !blockType.startsWith('wall_');

    useEffect(() => {
        if (!meshRef.current || blocks.length === 0) return;

        const shape = BLOCK_SHAPES[getBlockShape(blockType)];

        blocks.forEach((block, i) => {
            tempObject.position.set(
                block.position[0] + 0.5 + shape.offset[0],
                block.position[1] + 0.5 + shape.offset[1],
                block.position[2] + 0.5 + shape.offset[2]
            );
            tempObject.scale.set(shape.size[0], shape.size[1], shape.size[2]);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [blocks, tempObject, blockType]);

    // Handle click on instanced mesh
    const handleClick = (event) => {
        event.stopPropagation();
        const instanceId = event.instanceId;
        if (instanceId !== undefined && blocks[instanceId]) {
            onBlockClick(blocks[instanceId].id, event);
        }
    };

    if (blocks.length === 0) return null;

    // For composite blocks (torch/lantern), use composite renderer
    if (isComposite) {
        return (
            <TorchLanternInstancedBlocks
                blocks={blocks}
                blockType={blockType}
                onBlockClick={onBlockClick}
                version={version}
            />
        );
    }

    // For cross-shaped blocks, render as individual CrossBlocks for now
    // (instanced cross rendering is complex and would require custom shaders)
    if (isCross) {
        return (
            <CrossInstancedBlocks
                blocks={blocks}
                blockType={blockType}
                onBlockClick={onBlockClick}
                version={version}
            />
        );
    }

    // For fence/wall blocks, render with connection logic
    if (isFence || isWall) {
        return (
            <FenceWallInstancedBlocks
                blocks={blocks}
                blockType={blockType}
                onBlockClick={onBlockClick}
                version={version}
            />
        );
    }

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, blocks.length]}
            material={material}
            onClick={handleClick}
            frustumCulled={true}
            castShadow
            receiveShadow
        >
            <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
    );
}

/**
 * FenceWallInstancedBlocks - 渲染栅栏/墙方块（带连接推断）
 * 使用多个 instancedMesh 组合：柱（所有）+ 横杆（连接 n/s/e/w，分上下两层）
 */
function FenceWallInstancedBlocks({ blocks, blockType, onBlockClick, version = '1.20.1' }) {
    const pillarMeshRef = useRef();
    const nsBarLowMeshRef = useRef();
    const ewBarLowMeshRef = useRef();
    const nsBarHighMeshRef = useRef();
    const ewBarHighMeshRef = useRef();
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const material = useMemo(() => getOrCreateMaterial(blockType, version), [blockType, version]);

    // 推断连接状态
    const connections = useMemo(() => inferConnections(blocks), [blocks]);

    const isFence = blockType.includes('_fence');
    const isWall = blockType.includes('_wall');

    // 尺寸配置（柱边到柱边）
    const pillarWidth = isFence ? 0.1875 : 0.5;
    const pillarSize = [pillarWidth, 1, pillarWidth];
    const barLength = isFence ? 0.8125 : 0.5; // 1 - pillarWidth（柱边到柱边）
    const barHeight = isFence ? 0.1875 : 0.375;
    const barSize = [barLength, barHeight, barHeight]; // 横杆沿 X
    // fence 双横杆：下层 y+0.375、上层 y+0.6875；wall 单层 y+0.25
    const barYOffsets = isFence ? [0.375, 0.6875] : [0.25];

    useEffect(() => {
        if (blocks.length === 0) return;

        // 收集有连接的实例
        const nsBlocks = [];
        const ewBlocks = [];

        blocks.forEach((block) => {
            const key = `${block.position[0]},${block.position[1]},${block.position[2]}`;
            const conn = connections.get(key);

            if (conn) {
                if (conn.n || conn.s) nsBlocks.push(block);
                if (conn.e || conn.w) ewBlocks.push(block);
            }
        });

        // 1. 渲染所有柱子
        if (pillarMeshRef.current) {
            blocks.forEach((block, i) => {
                tempObject.position.set(
                    block.position[0] + 0.5,
                    block.position[1] + 0.5,
                    block.position[2] + 0.5
                );
                tempObject.scale.set(...pillarSize);
                tempObject.updateMatrix();
                pillarMeshRef.current.setMatrixAt(i, tempObject.matrix);
            });
            pillarMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        // 2. 渲染 NS 横杆（沿 Z 方向，分上下层）
        if (nsBlocks.length > 0) {
            barYOffsets.forEach((yOffset, layerIdx) => {
                const meshRef = layerIdx === 0 ? nsBarLowMeshRef : nsBarHighMeshRef;
                if (meshRef.current) {
                    nsBlocks.forEach((block, i) => {
                        tempObject.position.set(
                            block.position[0] + 0.5,
                            block.position[1] + 0.5 + yOffset,
                            block.position[2] + 0.5
                        );
                        // 沿 Z 方向：旋转 90 度
                        tempObject.rotation.set(0, Math.PI / 2, 0);
                        tempObject.scale.set(...barSize);
                        tempObject.updateMatrix();
                        meshRef.current.setMatrixAt(i, tempObject.matrix);
                    });
                    meshRef.current.instanceMatrix.needsUpdate = true;
                }
            });
        }

        // 3. 渲染 EW 横杆（沿 X 方向，分上下层）
        if (ewBlocks.length > 0) {
            barYOffsets.forEach((yOffset, layerIdx) => {
                const meshRef = layerIdx === 0 ? ewBarLowMeshRef : ewBarHighMeshRef;
                if (meshRef.current) {
                    ewBlocks.forEach((block, i) => {
                        tempObject.position.set(
                            block.position[0] + 0.5,
                            block.position[1] + 0.5 + yOffset,
                            block.position[2] + 0.5
                        );
                        tempObject.rotation.set(0, 0, 0);
                        tempObject.scale.set(...barSize);
                        tempObject.updateMatrix();
                        meshRef.current.setMatrixAt(i, tempObject.matrix);
                    });
                    meshRef.current.instanceMatrix.needsUpdate = true;
                }
            });
        }
    }, [blocks, connections, tempObject, pillarSize, barSize, barYOffsets]);

    const handleClick = (event) => {
        event.stopPropagation();
        const instanceId = event.instanceId;
        if (instanceId !== undefined && blocks[instanceId]) {
            onBlockClick(blocks[instanceId].id, event);
        }
    };

    if (blocks.length === 0) return null;

    // 收集有连接的实例数量
    const nsCount = blocks.filter(block => {
        const key = `${block.position[0]},${block.position[1]},${block.position[2]}`;
        const conn = connections.get(key);
        return conn && (conn.n || conn.s);
    }).length;

    const ewCount = blocks.filter(block => {
        const key = `${block.position[0]},${block.position[1]},${block.position[2]}`;
        const conn = connections.get(key);
        return conn && (conn.e || conn.w);
    }).length;

    return (
        <group>
            {/* 柱子（所有实例） */}
            <instancedMesh
                ref={pillarMeshRef}
                args={[null, null, blocks.length]}
                material={material}
                onClick={handleClick}
                frustumCulled={true}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[1, 1, 1]} />
            </instancedMesh>

            {/* NS 横杆 - 下层 */}
            {nsCount > 0 && (
                <instancedMesh
                    ref={nsBarLowMeshRef}
                    args={[null, null, nsCount]}
                    material={material}
                    onClick={handleClick}
                    frustumCulled={true}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[1, 1, 1]} />
                </instancedMesh>
            )}

            {/* EW 横杆 - 下层 */}
            {ewCount > 0 && (
                <instancedMesh
                    ref={ewBarLowMeshRef}
                    args={[null, null, ewCount]}
                    material={material}
                    onClick={handleClick}
                    frustumCulled={true}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[1, 1, 1]} />
                </instancedMesh>
            )}

            {/* NS 横杆 - 上层（仅 fence 双横杆） */}
            {isFence && nsCount > 0 && (
                <instancedMesh
                    ref={nsBarHighMeshRef}
                    args={[null, null, nsCount]}
                    material={material}
                    onClick={handleClick}
                    frustumCulled={true}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[1, 1, 1]} />
                </instancedMesh>
            )}

            {/* EW 横杆 - 上层（仅 fence 双横杆） */}
            {isFence && ewCount > 0 && (
                <instancedMesh
                    ref={ewBarHighMeshRef}
                    args={[null, null, ewCount]}
                    material={material}
                    onClick={handleClick}
                    frustumCulled={true}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={[1, 1, 1]} />
                </instancedMesh>
            )}
        </group>
    );
}

/**
 * TorchLanternInstancedBlocks - 渲染火把/灯笼组合造型（两部件模式）
 * Torch: 底部杆 + 顶部火焰头；Lantern: 顶部挂钩 + 灯体
 */
function TorchLanternInstancedBlocks({ blocks, blockType, onBlockClick, version = '1.20.1' }) {
    const part1MeshRef = useRef(); // 杆/挂钩
    const part2MeshRef = useRef(); // 火焰头/灯体
    const tempObject = useMemo(() => new THREE.Object3D(), []);

    const isTorch = blockType.includes('torch') && !blockType.includes('torchflower');
    const isLantern = blockType === 'lantern' || blockType === 'soul_lantern';

    // 材质
    const baseMaterial = useMemo(() => getOrCreateMaterial(blockType, version), [blockType, version]);

    // 火焰头/灯体材质（发光/半透明）
    const glowMaterial = useMemo(() => {
        if (isTorch) {
            // 火焰头：暖黄色发光
            const color = blockType === 'soul_torch' ? '#66ffff' : '#ffaa33';
            return new THREE.MeshBasicMaterial({
                color,
                toneMapped: false,
                transparent: false,
            });
        } else if (isLantern) {
            // 灯体：半透明暖黄
            const color = blockType === 'soul_lantern' ? '#66dddd' : '#e8a93c';
            return new THREE.MeshBasicMaterial({
                color,
                toneMapped: false,
                transparent: true,
                opacity: 0.85,
            });
        }
        return baseMaterial;
    }, [isTorch, isLantern, blockType, baseMaterial]);

    const shape = BLOCK_SHAPES[getBlockShape(blockType)];

    useEffect(() => {
        if (!part1MeshRef.current || !part2MeshRef.current || blocks.length === 0) return;

        if (isTorch) {
            // Torch: 杆 + 火焰头
            blocks.forEach((block, i) => {
                const baseX = block.position[0] + 0.5 + shape.offset[0];
                const baseY = block.position[1] + 0.5 + shape.offset[1];
                const baseZ = block.position[2] + 0.5 + shape.offset[2];

                // 杆（0.125 x 0.5 x 0.125，中心 y+0.25）
                tempObject.position.set(baseX, baseY + 0.25, baseZ);
                tempObject.rotation.set(0, 0, 0);
                tempObject.scale.set(0.125, 0.5, 0.125);
                tempObject.updateMatrix();
                part1MeshRef.current.setMatrixAt(i, tempObject.matrix);

                // 火焰头（0.1875³，中心 y+0.6）
                tempObject.position.set(baseX, baseY + 0.6, baseZ);
                tempObject.scale.set(0.1875, 0.1875, 0.1875);
                tempObject.updateMatrix();
                part2MeshRef.current.setMatrixAt(i, tempObject.matrix);
            });
        } else if (isLantern) {
            // Lantern: 挂钩 + 灯体
            blocks.forEach((block, i) => {
                const baseX = block.position[0] + 0.5 + shape.offset[0];
                const baseY = block.position[1] + 0.5 + shape.offset[1];
                const baseZ = block.position[2] + 0.5 + shape.offset[2];

                // 挂钩（0.0625 x 0.25 x 0.0625，顶部 y+0.375）
                tempObject.position.set(baseX, baseY + 0.375, baseZ);
                tempObject.rotation.set(0, 0, 0);
                tempObject.scale.set(0.0625, 0.25, 0.0625);
                tempObject.updateMatrix();
                part1MeshRef.current.setMatrixAt(i, tempObject.matrix);

                // 灯体（0.375 x 0.4375 x 0.375，中心 y-0.0625）
                tempObject.position.set(baseX, baseY - 0.0625, baseZ);
                tempObject.scale.set(0.375, 0.4375, 0.375);
                tempObject.updateMatrix();
                part2MeshRef.current.setMatrixAt(i, tempObject.matrix);
            });
        }

        part1MeshRef.current.instanceMatrix.needsUpdate = true;
        part2MeshRef.current.instanceMatrix.needsUpdate = true;
    }, [blocks, tempObject, isTorch, isLantern, shape]);

    const handleClick = (event) => {
        event.stopPropagation();
        const instanceId = event.instanceId;
        if (instanceId !== undefined && blocks[instanceId]) {
            onBlockClick(blocks[instanceId].id, event);
        }
    };

    if (blocks.length === 0) return null;

    return (
        <group>
            {/* 部件1：杆/挂钩 */}
            <instancedMesh
                ref={part1MeshRef}
                args={[null, null, blocks.length]}
                material={baseMaterial}
                onClick={handleClick}
                frustumCulled={true}
                castShadow
                receiveShadow
            >
                <boxGeometry args={[1, 1, 1]} />
            </instancedMesh>

            {/* 部件2：火焰头/灯体 */}
            <instancedMesh
                ref={part2MeshRef}
                args={[null, null, blocks.length]}
                material={glowMaterial}
                onClick={handleClick}
                frustumCulled={true}
                castShadow={false}
                receiveShadow={false}
            >
                <boxGeometry args={[1, 1, 1]} />
            </instancedMesh>
        </group>
    );
}

/**
 * CrossInstancedBlocks - Renders cross-shaped blocks (plants, crops, flowers)
 * Uses two intersecting planes per block
 */
function CrossInstancedBlocks({ blocks, blockType, onBlockClick, version = '1.20.1' }) {
    const mesh1Ref = useRef();
    const mesh2Ref = useRef();
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const [textureLoaded, setTextureLoaded] = useState(false);
    
    // Create material with transparency for plants
    const material = useMemo(() => {
        const textureKey = ALIASES[blockType] || blockType;
        const fallbackColor = FALLBACK_COLORS[blockType] || FALLBACK_COLORS['default'];
        
        const mat = new THREE.MeshBasicMaterial({
            color: fallbackColor,
            toneMapped: false,
            transparent: true,
            alphaTest: 0.1,
            side: THREE.DoubleSide,
            depthWrite: false,
        });
        
        return mat;
    }, [blockType]);
    
    // Load texture separately to trigger re-render
    useEffect(() => {
        const textureKey = ALIASES[blockType] || blockType;
        loadTexture(textureKey, version).then((tex) => {
            if (tex && material) {
                material.map = tex;
                material.color.set('#ffffff');
                material.needsUpdate = true;
                setTextureLoaded(true);
            }
        });
    }, [blockType, material, version]);

    useEffect(() => {
        if (!mesh1Ref.current || !mesh2Ref.current || blocks.length === 0) return;

        blocks.forEach((block, i) => {
            tempObject.position.set(
                block.position[0] + 0.5,
                block.position[1] + 0.5,
                block.position[2] + 0.5
            );
            tempObject.scale.set(1, 1, 1);
            
            // First plane - rotated 45 degrees
            tempObject.rotation.set(0, Math.PI / 4, 0);
            tempObject.updateMatrix();
            mesh1Ref.current.setMatrixAt(i, tempObject.matrix);
            
            // Second plane - rotated -45 degrees
            tempObject.rotation.set(0, -Math.PI / 4, 0);
            tempObject.updateMatrix();
            mesh2Ref.current.setMatrixAt(i, tempObject.matrix);
        });

        mesh1Ref.current.instanceMatrix.needsUpdate = true;
        mesh2Ref.current.instanceMatrix.needsUpdate = true;
    }, [blocks, tempObject]);

    const handleClick = (event) => {
        event.stopPropagation();
        const instanceId = event.instanceId;
        if (instanceId !== undefined && blocks[instanceId]) {
            onBlockClick(blocks[instanceId].id, event);
        }
    };

    if (blocks.length === 0) return null;

    return (
        <group>
            {/* First plane */}
            <instancedMesh
                ref={mesh1Ref}
                args={[null, null, blocks.length]}
                material={material}
                onClick={handleClick}
                frustumCulled={true}
                castShadow
            >
                <planeGeometry args={[1.414, 1]} />
            </instancedMesh>
            {/* Second plane */}
            <instancedMesh
                ref={mesh2Ref}
                args={[null, null, blocks.length]}
                material={material}
                onClick={handleClick}
                frustumCulled={true}
                castShadow
            >
                <planeGeometry args={[1.414, 1]} />
            </instancedMesh>
        </group>
    );
}

/**
 * WaterBlocks - 水方块专用组件，带波动动画
 * 仅当方块数 < 800 时启用动画，否则静态渲染
 */
function WaterBlocks({ blocks, version = '1.20.1' }) {
    const meshRef = useRef();
    const tempObject = useMemo(() => new THREE.Object3D(), []);
    const material = useMemo(() => getOrCreateMaterial('water', version), [version]);
    const enableAnimation = blocks.length < 800;

    // 为每个方块分配一个随机相位
    const phases = useMemo(() =>
        blocks.map(() => Math.random() * Math.PI * 2),
        [blocks]
    );

    // 初始化位置
    useEffect(() => {
        if (!meshRef.current || blocks.length === 0) return;

        blocks.forEach((block, i) => {
            tempObject.position.set(
                block.position[0] + 0.5,
                block.position[1] + 0.5,
                block.position[2] + 0.5
            );
            tempObject.scale.set(1, 1, 1);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [blocks, tempObject]);

    // 动画：缓慢高度波动
    useFrame((state) => {
        if (!meshRef.current || !enableAnimation || blocks.length === 0) return;

        const t = state.clock.elapsedTime;
        blocks.forEach((block, i) => {
            const wave = Math.sin(t * 0.5 + phases[i]) * 0.03;
            tempObject.position.set(
                block.position[0] + 0.5,
                block.position[1] + 0.5 + wave,
                block.position[2] + 0.5
            );
            tempObject.scale.set(1, 1, 1);
            tempObject.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObject.matrix);
        });

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    if (blocks.length === 0) return null;

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, blocks.length]}
            material={material}
            frustumCulled={true}
        >
            <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
    );
}

// ============ ULTRA PERFORMANCE MODE ============
// Single mesh with vertex colors - NO textures, minimal draw calls
// For 10,000+ blocks where FPS is more important than visual quality
const PERFORMANCE_THRESHOLD = 1000000;

function UltraPerformanceRenderer({ blocks, positionMap, onBlockClick }) {
    const meshRef = useRef();

    const geometry = useMemo(() => {
        if (blocks.length === 0) return null;

        // Helper to check if neighbor blocks the face
        const isFaceBlocked = (x, y, z) => {
            const key = `${x},${y},${z}`;
            const neighbor = positionMap?.get(key);
            if (!neighbor) return false;
            const type = neighbor.type?.toLowerCase() || '';
            if (TRANSPARENT_BLOCKS.includes(type)) return false;
            if (type.includes('_slab') || type.includes('_stairs')) return false;
            return true;
        };

        const positions = [];
        const normals = [];
        const colors = [];
        const indices = [];
        let vertexOffset = 0;

        const FACE_DIRS = [
            { axis: 'x', dir: 1, normal: [1, 0, 0] },
            { axis: 'x', dir: -1, normal: [-1, 0, 0] },
            { axis: 'y', dir: 1, normal: [0, 1, 0] },
            { axis: 'y', dir: -1, normal: [0, -1, 0] },
            { axis: 'z', dir: 1, normal: [0, 0, 1] },
            { axis: 'z', dir: -1, normal: [0, 0, -1] },
        ];

        blocks.forEach(block => {
            const [bx, by, bz] = block.position;
            const colorHex = FALLBACK_COLORS[block.type] || FALLBACK_COLORS['default'];
            const color = new THREE.Color(colorHex);

            FACE_DIRS.forEach(({ axis, dir, normal }) => {
                const nx = axis === 'x' ? bx + dir : bx;
                const ny = axis === 'y' ? by + dir : by;
                const nz = axis === 'z' ? bz + dir : bz;

                if (isFaceBlocked(nx, ny, nz)) return;

                let verts;
                if (axis === 'x') {
                    const x = dir > 0 ? bx + 1 : bx;
                    verts = dir > 0
                        ? [[x, by, bz], [x, by + 1, bz], [x, by + 1, bz + 1], [x, by, bz + 1]]
                        : [[x, by, bz + 1], [x, by + 1, bz + 1], [x, by + 1, bz], [x, by, bz]];
                } else if (axis === 'y') {
                    const y = dir > 0 ? by + 1 : by;
                    verts = dir > 0
                        ? [[bx, y, bz + 1], [bx + 1, y, bz + 1], [bx + 1, y, bz], [bx, y, bz]]
                        : [[bx, y, bz], [bx + 1, y, bz], [bx + 1, y, bz + 1], [bx, y, bz + 1]];
                } else {
                    const z = dir > 0 ? bz + 1 : bz;
                    verts = dir > 0
                        ? [[bx, by, z], [bx + 1, by, z], [bx + 1, by + 1, z], [bx, by + 1, z]]
                        : [[bx + 1, by, z], [bx, by, z], [bx, by + 1, z], [bx + 1, by + 1, z]];
                }

                verts.forEach(vert => {
                    positions.push(...vert);
                    normals.push(...normal);
                    colors.push(color.r, color.g, color.b);
                });

                indices.push(
                    vertexOffset, vertexOffset + 1, vertexOffset + 2,
                    vertexOffset, vertexOffset + 2, vertexOffset + 3
                );
                vertexOffset += 4;
            });
        });

        if (positions.length === 0) return null;

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.setIndex(indices);
        geo.computeBoundingSphere();

        return geo;
    }, [blocks, positionMap]);

    const handleClick = (event) => {
        event.stopPropagation();
        if (!event.point || blocks.length === 0) return;

        const point = event.point;
        let closestBlock = blocks[0];
        let minDist = Infinity;

        // Use spatial hashing for faster lookup in large datasets
        const gridX = Math.floor(point.x);
        const gridY = Math.floor(point.y);
        const gridZ = Math.floor(point.z);

        // Check nearby blocks only
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    const key = `${gridX + dx},${gridY + dy},${gridZ + dz}`;
                    const block = positionMap?.get(key);
                    if (block) {
                        const [x, y, z] = block.position;
                        const dist = Math.abs(point.x - x - 0.5) + Math.abs(point.y - y - 0.5) + Math.abs(point.z - z - 0.5);
                        if (dist < minDist) {
                            minDist = dist;
                            closestBlock = block;
                        }
                    }
                }
            }
        }

        onBlockClick(closestBlock.id, event);
    };

    if (!geometry) return null;

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            onClick={handleClick}
            frustumCulled={true}
        >
            <meshBasicMaterial vertexColors side={THREE.FrontSide} />
        </mesh>
    );
}

// ============ MAIN COMPONENT ============

const INVISIBLE_BLOCKS = ['air', 'cave_air', 'void_air', 'structure_void', 'barrier', 'AIR'];


// Semantic Colors for Blueprint Mode
const SEMANTIC_COLORS = {
    // Walls
    'WALL_STONE': '#808080',
    'WALL_WOOD': '#A0522D',
    'WALL_BRICK': '#B22222',
    'WALL_WHITE': '#F0F0F0',
    'WALL_RED': '#D32F2F',
    'WALL_BLUE': '#1976D2',
    'WALL_GREEN': '#388E3C',
    'WALL_YELLOW': '#FBC02D',

    // Roofs
    'ROOF_STONE': '#616161',
    'ROOF_WOOD': '#5D4037',
    'ROOF_RED': '#C62828',
    'ROOF_BLUE': '#1565C0',
    'ROOF_GOLD': '#FFA000',

    // Floors
    'FLOOR_STONE': '#757575',
    'FLOOR_WOOD': '#8D6E63',

    // Structure
    'FRAME_WOOD': '#3E2723',
    'WINDOW': '#90CAF9', // Light blue glass
    'AIR': 'transparent'
};

const SemanticInstancedGroup = ({ color, blocks }) => {
    const meshRef = useRef();

    // Use effect to ensure update happens after mount
    useEffect(() => {
        if (!meshRef.current) return;
        const tempObj = new THREE.Object3D();
        blocks.forEach((block, i) => {
            // Handle both array [x,y,z] and object {x,y,z} formats
            const pos = block.position || [block.x, block.y, block.z];
            const [x, y, z] = Array.isArray(pos) ? pos : [pos.x, pos.y, pos.z];

            tempObj.position.set(x, y, z);
            tempObj.updateMatrix();
            meshRef.current.setMatrixAt(i, tempObj.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [blocks]);

    return (
        <instancedMesh ref={meshRef} args={[null, null, blocks.length]} frustumCulled={true}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color={color}
                transparent={color === SEMANTIC_COLORS.WINDOW}
                opacity={color === SEMANTIC_COLORS.WINDOW ? 0.4 : 1.0}
                roughness={0.8}
            />
        </instancedMesh>
    );
};

export default function VoxelWorld({ version = '1.20.1' }) {
    // Get store values
    const blocks = useStore((state) => state.blocks);
    const semanticVoxels = useStore((state) => state.semanticVoxels);
    const selectedBlockIds = useStore((state) => state.selectedBlockIds);
    const selectBlock = useStore((state) => state.selectBlock);
    const pushHistory = useStore((state) => state.pushHistory);
    const updateBlocksPosition = useStore((state) => state.updateBlocksPosition);
    const finalizeBlocksPosition = useStore((state) => state.finalizeBlocksPosition);
    const viewMode = useStore((state) => state.viewMode); // 'mc' | 'blueprint'
    const controlMode = useStore((state) => state.controlMode); // 'orbit' | 'minecraft'

    // Transform Gizmo Logic
    const gizmoRef = useRef();
    const gizmoAnchorRef = useRef();
    const [dragging, setDragging] = useState(false);
    const startDragPos = useRef(new THREE.Vector3());
    const lastEmitPos = useRef(new THREE.Vector3());

    // Calculate selection average center for gizmo positioning
    const selectionCenter = useMemo(() => {
        if (selectedBlockIds.length === 0) return null;
        const selectedBlocks = blocks.filter(b => selectedBlockIds.includes(b.id));
        if (selectedBlocks.length === 0) return null;

        let x = 0, y = 0, z = 0;
        selectedBlocks.forEach(b => {
            x += b.position[0];
            y += b.position[1];
            z += b.position[2];
        });
        return [
            x / selectedBlocks.length + 0.5,
            y / selectedBlocks.length + 0.5,
            z / selectedBlocks.length + 0.5
        ];
    }, [selectedBlockIds, blocks]);

    // Use a state to force re-render when selection changes (to fix the ref delay)
    const [, forceUpdate] = useState({});
    useEffect(() => {
        forceUpdate({});
    }, [selectedBlockIds]);

    // Sync gizmo anchor position only when NOT dragging
    useEffect(() => {
        if (selectionCenter && gizmoAnchorRef.current && !dragging) {
            gizmoAnchorRef.current.position.set(...selectionCenter);
        }
    }, [selectionCenter, dragging]);

    // Handle Transform Controls events
    const handleDragStart = () => {
        // Disable dragging in GAME mode
        if (controlMode === 'minecraft') return;

        if (selectionCenter) {
            pushHistory(); // Save snapshot BEFORE moving
            startDragPos.current.set(...selectionCenter);
            lastEmitPos.current.set(...selectionCenter);
        }
        setDragging(true);
    };

    const handleDragChange = () => {
        if (!gizmoAnchorRef.current || !dragging) return;

        const currentPos = gizmoAnchorRef.current.position;
        const dx = currentPos.x - lastEmitPos.current.x;
        const dy = currentPos.y - lastEmitPos.current.y;
        const dz = currentPos.z - lastEmitPos.current.z;

        // Only update if movement exceeds threshold
        if (Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01 || Math.abs(dz) > 0.01) {
            // Throttle: only update at most every 50ms
            const now = Date.now();
            if (!handleDragChange._lastUpdate || now - handleDragChange._lastUpdate > 50) {
                handleDragChange._lastUpdate = now;
                updateBlocksPosition(selectedBlockIds, dx, dy, dz);
                lastEmitPos.current.copy(currentPos);
            }
        }
    };

    const handleDragEnd = () => {
        if (!gizmoAnchorRef.current) {
            setDragging(false);
            return;
        }

        // Final sync: ensure we catch any throttled updates
        const currentPos = gizmoAnchorRef.current.position;
        const dx = currentPos.x - lastEmitPos.current.x;
        const dy = currentPos.y - lastEmitPos.current.y;
        const dz = currentPos.z - lastEmitPos.current.z;

        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dz) > 0.001) {
            updateBlocksPosition(selectedBlockIds, dx, dy, dz);
        }

        setDragging(false);

        // Finalize position (rounding and saving)
        finalizeBlocksPosition(selectedBlockIds);
    };

    // Drag detection: prevent click after rotation
    const pointerDownPos = useRef({ x: 0, y: 0 });
    const isDraggingClick = useRef(false);
    const lastEvent = useRef(null);
    const DRAG_THRESHOLD = 5;

    const handlePointerDown = (e) => {
        pointerDownPos.current = { x: e.clientX, y: e.clientY };
        isDraggingClick.current = false;
        lastEvent.current = { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey };
    };

    const handlePointerUp = (e) => {
        const dx = e.clientX - pointerDownPos.current.x;
        const dy = e.clientY - pointerDownPos.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        isDraggingClick.current = distance > DRAG_THRESHOLD;
        lastEvent.current = { ctrlKey: e.ctrlKey, shiftKey: e.shiftKey };
    };

    const safeSelectBlock = (blockId, eventOrModifiers) => {
        // Disable selection in GAME mode
        if (controlMode === 'minecraft') return;

        if (isDraggingClick.current || dragging) return;
        const modifiers = eventOrModifiers?.ctrlKey !== undefined
            ? { ctrlKey: eventOrModifiers.ctrlKey, shiftKey: eventOrModifiers.shiftKey }
            : lastEvent.current || {};
        selectBlock(blockId, modifiers);
    };

    // ============ OCCLUSION CULLING ============
    // Build position map for O(1) neighbor lookups (used for face culling)
    const { visibleBlocks, positionMap } = useMemo(() => {
        const filtered = blocks.filter(b =>
            b && b.position && Array.isArray(b.position) && b.position.length >= 3 &&
            !INVISIBLE_BLOCKS.includes(b.type) &&
            !INVISIBLE_BLOCKS.includes(b.type?.toUpperCase())
        );

        // Build a position lookup map for O(1) neighbor checks
        const posMap = new Map();
        filtered.forEach(block => {
            const posKey = `${block.position[0]},${block.position[1]},${block.position[2]}`;
            posMap.set(posKey, block);
        });

        // Deduplicate by position (keep last block at each position)
        const uniqueBlocks = Array.from(posMap.values());

        // Check if a block is solid (opaque, not transparent/glass)
        const isSolidBlock = (block) => {
            if (!block) return false;
            const type = block.type?.toLowerCase() || '';
            // Transparent blocks don't occlude neighbors
            if (TRANSPARENT_BLOCKS.includes(type)) return false;
            // Slabs/stairs don't fully occlude
            if (type.includes('_slab') || type.includes('_stairs')) return false;
            // Small decorative blocks don't occlude
            if (type.includes('_button') || type.includes('_pressure_plate')) return false;
            if (type.includes('torch') || type.includes('lantern')) return false;
            if (type.includes('_wall') || type.includes('_fence')) return false;
            if (type.includes('carpet')) return false;
            return true;
        };

        // Check if block at position exists and is solid
        const hasSolidNeighbor = (x, y, z) => {
            const key = `${x},${y},${z}`;
            return isSolidBlock(posMap.get(key));
        };

        // Filter to only blocks with at least one exposed face
        const visible = uniqueBlocks.filter(block => {
            const [x, y, z] = block.position;

            // If this block is not solid itself (transparent/partial), always render it
            if (!isSolidBlock(block)) return true;

            // Check all 6 neighbors - if any neighbor is missing or non-solid, this block is visible
            const neighbors = [
                [x + 1, y, z], // +X
                [x - 1, y, z], // -X
                [x, y + 1, z], // +Y
                [x, y - 1, z], // -Y
                [x, y, z + 1], // +Z
                [x, y, z - 1], // -Z
            ];

            // Block is visible if at least one face is exposed (no solid neighbor)
            return neighbors.some(([nx, ny, nz]) => !hasSolidNeighbor(nx, ny, nz));
        });

        return { visibleBlocks: visible, positionMap: posMap };
    }, [blocks]);

    // ============ 相机自动适配建筑（生成完成时聚焦） ============
    const prevBlockCountRef = useRef(0);
    useEffect(() => {
        // 仅在方块数量从 0 变为非 0（新生成）或从非 0 变为 0（清空）时触发
        const currentCount = visibleBlocks.length;
        const prevCount = prevBlockCountRef.current;

        if ((prevCount === 0 && currentCount > 0) || (prevCount > 0 && currentCount === 0)) {
            // 使用 useThree hook 需要在 Canvas 内，这里通过全局访问或延迟调用
            // 延迟执行以确保 three.js 上下文已更新
            setTimeout(() => {
                try {
                    // 尝试从全局获取 camera 和 controls（React Three Fiber 模式）
                    const canvas = document.querySelector('canvas');
                    if (!canvas || !canvas.__three) return;

                    const camera = canvas.__three?.camera;
                    const controls = canvas.__three?.controls;

                    if (camera && visibleBlocks.length > 0) {
                        // 计算建筑 bounds
                        let minX = Infinity, minY = Infinity, minZ = Infinity;
                        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

                        visibleBlocks.forEach(block => {
                            const [x, y, z] = block.position;
                            minX = Math.min(minX, x);
                            minY = Math.min(minY, y);
                            minZ = Math.min(minZ, z);
                            maxX = Math.max(maxX, x + 1);
                            maxY = Math.max(maxY, y + 1);
                            maxZ = Math.max(maxZ, z + 1);
                        });

                        const centerX = (minX + maxX) / 2;
                        const centerY = (minY + maxY) / 2;
                        const centerZ = (minZ + maxZ) / 2;

                        const sizeX = maxX - minX;
                        const sizeY = maxY - minY;
                        const sizeZ = maxZ - minZ;
                        const maxDim = Math.max(sizeX, sizeY, sizeZ);

                        // 相机位置：中心 + 斜上方
                        const distance = maxDim * 1.6;
                        const cameraX = centerX + distance * 0.7;
                        const cameraY = centerY + distance * 0.8;
                        const cameraZ = centerZ + distance * 0.7;

                        camera.position.set(cameraX, cameraY, cameraZ);
                        camera.lookAt(centerX, centerY, centerZ);

                        // 更新 controls target（OrbitControls）
                        if (controls && controls.target) {
                            controls.target.set(centerX, centerY, centerZ);
                            controls.update();
                        }
                    } else if (camera && visibleBlocks.length === 0) {
                        // 清空后重置到默认视角
                        camera.position.set(10, 10, 10);
                        camera.lookAt(0, 0, 0);
                        if (controls && controls.target) {
                            controls.target.set(0, 0, 0);
                            controls.update();
                        }
                    }
                } catch (err) {
                    console.warn('Camera auto-focus failed:', err);
                }
            }, 100);
        }

        prevBlockCountRef.current = currentCount;
    }, [visibleBlocks]);

    // Removed Auto-center Logic (centerOffset is gone)

    const isStair = (block) => block.type?.toLowerCase().includes('_stairs');
    const isWaterBlock = (block) => block.type === 'water' || block.type === 'flowing_water';

    const { stairBlocks, waterBlocks, regularBlocks } = useMemo(() => {
        const stairs = [];
        const water = [];
        const regular = [];
        visibleBlocks.forEach(block => {
            if (isStair(block)) stairs.push(block);
            else if (isWaterBlock(block)) water.push(block);
            else regular.push(block);
        });
        return { stairBlocks: stairs, waterBlocks: water, regularBlocks: regular };
    }, [visibleBlocks]);

    const blocksByTexture = useMemo(() => {
        const groups = new Map();
        regularBlocks.forEach(block => {
            const textureKey = ALIASES[block.type] || block.type;
            if (!groups.has(textureKey)) groups.set(textureKey, []);
            groups.get(textureKey).push(block);
        });
        return groups;
    }, [regularBlocks]);

    const selectedBlocks = useMemo(() =>
        visibleBlocks.filter(b => selectedBlockIds.includes(b.id)),
        [visibleBlocks, selectedBlockIds]
    );

    // ============ 点光源（灯笼/火把照亮周围，≤10 个） ============
    const lightSources = useMemo(() => {
        const sources = [];
        visibleBlocks.forEach(block => {
            const cleanType = cleanBlockType(block.type);
            if (cleanType === 'lantern' || cleanType === 'soul_lantern' ||
                cleanType.includes('torch') && !cleanType.includes('torchflower')) {
                sources.push({
                    position: block.position,
                    type: cleanType
                });
            }
        });
        // 限制 ≤10 个（性能）
        return sources.slice(0, 10);
    }, [visibleBlocks]);

    if (viewMode === 'blueprint') {
        const semanticGroups = new Map();
        semanticVoxels.forEach(v => {
            if (v.type === 'AIR') return;
            const color = SEMANTIC_COLORS[v.type] || '#FF00FF';
            if (!semanticGroups.has(color)) semanticGroups.set(color, []);
            semanticGroups.get(color).push(v);
        });

        return (
            <group>
                {Array.from(semanticGroups.entries()).map(([color, groupBlocks]) => (
                    <SemanticInstancedGroup key={color} color={color} blocks={groupBlocks} />
                ))}
            </group>
        );
    }

    // MC MODE RENDER (Regular)
    // Get rotation and flip state for stair based on facing and half
    // Our stair model: high part (back) at -Z, low part (front) at +Z
    // facing = direction you walk UP to (where the high step is)
    // half=bottom: normal stair (ascending), half=top: upside-down stair (descending/ceiling)
    const getStairTransform = (properties) => {
        let rotation = 0;
        let isUpsideDown = false;

        if (properties) {
            // Check facing direction
            if (properties.includes('facing=south')) rotation = 0;
            else if (properties.includes('facing=west')) rotation = -Math.PI / 2;
            else if (properties.includes('facing=north')) rotation = Math.PI;
            else if (properties.includes('facing=east')) rotation = Math.PI / 2;

            // Check if upside-down
            isUpsideDown = properties.includes('half=top');
        }

        return { rotation, isUpsideDown };
    };

    // Check if we should use ultra performance mode (no textures, just vertex colors)
    const useUltraPerformance = visibleBlocks.length > PERFORMANCE_THRESHOLD;

    return (
        <group onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
            {/* 点光源（灯笼/火把） */}
            {lightSources.map((source, idx) => {
                const isSoul = source.type === 'soul_lantern' || source.type === 'soul_torch';
                const isLantern = source.type === 'lantern' || source.type === 'soul_lantern';
                const color = isSoul ? 0x66ddff : (isLantern ? 0xffbb66 : 0xffaa55);
                const intensity = isLantern ? 0.9 : 0.8;
                const yOffset = isLantern ? 0.3 : 0.5; // 灯笼稍低，火把稍高

                return (
                    <pointLight
                        key={`light-${idx}`}
                        position={[
                            source.position[0] + 0.5,
                            source.position[1] + yOffset,
                            source.position[2] + 0.5
                        ]}
                        color={color}
                        intensity={intensity}
                        distance={8}
                        decay={2}
                        castShadow={false}
                    />
                );
            })}

            {/* Ultra Performance Mode: Single mesh with vertex colors - includes ALL blocks */}
            {useUltraPerformance && (
                <UltraPerformanceRenderer
                    blocks={visibleBlocks}
                    positionMap={positionMap}
                    onBlockClick={safeSelectBlock}
                />
            )}

            {/* Regular Mode: Textured blocks grouped by texture */}
            {!useUltraPerformance && Array.from(blocksByTexture.entries()).map(([textureKey, blocksInGroup]) => (
                <TexturedInstancedBlocks
                    key={textureKey}
                    blocks={blocksInGroup}
                    blockType={blocksInGroup[0]?.type || textureKey}
                    onBlockClick={safeSelectBlock}
                    positionMap={positionMap}
                    version={version}
                />
            ))}

            {/* Render water blocks with animation */}
            {!useUltraPerformance && waterBlocks.length > 0 && (
                <WaterBlocks
                    blocks={waterBlocks}
                    version={version}
                />
            )}

            {/* Render stairs - simplified in ultra performance mode */}
            {!useUltraPerformance && stairBlocks.length > 0 && stairBlocks.length < 500 && stairBlocks.map((block) => {
                const { rotation, isUpsideDown } = getStairTransform(block.properties);
                const material = getOrCreateMaterial(block.type, version);

                // For upside-down stairs, flip the Y positions
                const bottomSlabY = isUpsideDown ? 0.25 : -0.25;
                const topHalfY = isUpsideDown ? -0.25 : 0.25;

                return (
                    <group
                        key={block.id}
                        position={[
                            block.position[0] + 0.5,
                            block.position[1] + 0.5,
                            block.position[2] + 0.5
                        ]}
                        rotation={[0, rotation, 0]}
                        onClick={(e) => {
                            e.stopPropagation();
                            safeSelectBlock(block.id, e);
                        }}
                    >
                        {/* Full-width slab (bottom for normal, top for upside-down) */}
                        <mesh position={[0, bottomSlabY, 0]} material={material} castShadow receiveShadow>
                            <boxGeometry args={[1, 0.5, 1]} />
                        </mesh>
                        {/* Back half (the solid/high side) */}
                        <mesh position={[0, topHalfY, 0.25]} material={material} castShadow receiveShadow>
                            <boxGeometry args={[1, 0.5, 0.5]} />
                        </mesh>
                    </group>
                );
            })}

            {/* Stairs as simple blocks when there are too many (>500) or in ultra mode */}
            {!useUltraPerformance && stairBlocks.length >= 500 && (
                <TexturedInstancedBlocks
                    blocks={stairBlocks}
                    blockType={stairBlocks[0]?.type || 'stone_stairs'}
                    onBlockClick={safeSelectBlock}
                    positionMap={positionMap}
                    version={version}
                />
            )}

            {/* Render selected blocks highlight (multi-select) */}
            {selectedBlocks.map(block => (
                <mesh
                    key={`highlight-${block.id}`}
                    position={[
                        block.position[0] + 0.5,
                        block.position[1] + 0.5,
                        block.position[2] + 0.5
                    ]}
                >
                    <boxGeometry args={[1.02, 1.02, 1.02]} />
                    <meshBasicMaterial color="#fbbf24" wireframe={true} transparent opacity={0.5} />
                </mesh>
            ))}

            {/* 3D Transform Gizmo (Select & Move like Blender/3DSMax) */}
            {controlMode === 'orbit' && selectionCenter && (
                <>
                    <group
                        ref={gizmoAnchorRef}
                        position={[selectionCenter[0], selectionCenter[1], selectionCenter[2]]}
                    />
                    {gizmoAnchorRef.current && (
                        <TransformControls
                            object={gizmoAnchorRef.current}
                            mode="translate"
                            onMouseDown={handleDragStart}
                            onObjectChange={handleDragChange}
                            onMouseUp={handleDragEnd}
                        />
                    )}
                </>
            )}
        </group>
    );
}


