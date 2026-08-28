---
name: gates
description: 大门与拱门形制——何时用门方块、何时砌大型门洞/拱门，附 VoxelBuilder 砌法示例
---

# 🏯 大门与拱门（Gates & Arches）

## 决策规则：不要一律用木门方块

`builder.setDoor` 只能放 **1×2 的标准门方块**，适合小尺度的房门、民居、小铺。当需求是**大门、城门、殿门、门楼、拱门、portal**，或建筑是**大殿/城堡/宫殿/宅邸**等级别时，**绝不能用木门方块代表大门**——要用砖石在墙体上**开大型门洞**并按风格砌拱券/门框/门楼。

按建筑规模和风格选择：

| 建筑规模 | 门的形式 |
|---------|---------|
| 小屋/小铺（10×10 级） | `builder.setDoor` 木门即可 |
| 大殿/府邸（20×20+） | 矩形大门洞 + 门框 + 过梁；或半圆拱券 |
| 城堡/宫殿/教堂（40×40+） | 高大拱门（半圆/尖拱/门楼），宽 4-6、高 6-10 |
| 中式院落/园林 | 门屋/门楼、月洞门、垂花门 |
| 日式 | 鸟居（牌坊式门） |

风格匹配：**中式**用朱红柱+青砖/白墙门洞、上覆门檐；**罗马/古典**用半圆拱券（stone_bricks/大理石）；**哥特**用尖拱；**埃及**用梯形塔门；**现代**用简单大方框门洞。

## 通用做法（三明治式）

```javascript
// 1. 先把整面墙砌好（含门洞区域的墙）
builder.fill(WX0, WY0, FZ, WX1, WY1, FZ, WALL_MAT);
// 2. 再在门洞位置挖空（fill 'air'），门洞宽 GW、高 GH
builder.fill(midX - Math.floor(GW / 2), WY0, FZ,
             midX + Math.floor((GW - 1) / 2), WY0 + GH - 1, FZ, 'air');
// 3. 最后砌门框、过梁或拱券（见下）
```

## 半圆拱券（罗马式 / 通用）

```javascript
// 门洞宽 GW（偶数）、矩形高 GH，拱脚高 gy0；R = GW / 2
const R = GW / 2;
// 先挖矩形门洞
builder.fill(midX - Math.floor(GW / 2), gy0, FZ,
             midX + Math.floor((GW - 1) / 2), gy0 + GH - 1, FZ, 'air');
// 半圆拱券：从拱脚层（h=0 全宽）到拱顶（h=R 单块）
for (let h = 0; h <= R; h++) {
  const dx = Math.floor(Math.sqrt(R * R - h * h)); // 该层拱的半宽
  const y = gy0 + GH + h;
  builder.fill(midX - dx, y, FZ, midX + dx, y, FZ, ARCH_MAT);
}
// 拱券外沿加强一圈（厚 2），更立体
builder.line(midX - R, gy0 + GH, FZ, midX, gy0 + GH + R, FZ, ARCH_MAT);
builder.line(midX + R, gy0 + GH, FZ, midX, gy0 + GH + R, FZ, ARCH_MAT);
```

## 月洞门（中式园林圆形门洞）

```javascript
// 圆形边框：半径 R，圆心 (cx, cy)，墙在 FZ
const R = 3, cx = midX, cy = WY0 + 6;
for (let dx = -R; dx <= R; dx++) {
  const hw = Math.floor(Math.sqrt(R * R - dx * dx)); // 该列的半高
  builder.set(cx + dx, cy - hw, FZ, FRAME_MAT);
  builder.set(cx + dx, cy + hw, FZ, FRAME_MAT);
}
// 圆内挖空（可选：直接把洞内墙清掉）
builder.fill(cx - R + 1, cy - R + 1, FZ, cx + R - 1, cy + R - 1, FZ, 'air');
```

## 中式门楼 / 牌坊（门洞 + 门檐）

```javascript
// 大门洞（宽 4-6、高 5-8）+ 两侧门柱 + 顶部门檐/屋顶
// 1) 两侧门柱（贴墙或独立）
builder.fill(midX - GW / 2 - 1, gy0, FZ, midX - GW / 2 - 1, gy0 + GH, FZ, COL_MAT);
builder.fill(midX + GW / 2 + 1, gy0, FZ, midX + GW / 2 + 1, gy0 + GH, FZ, COL_MAT);
// 2) 门洞上方过梁 + 小额枋
builder.fill(midX - GW / 2 - 1, gy0 + GH, FZ, midX + GW / 2 + 1, gy0 + GH + 1, FZ, BEAM_MAT);
// 3) 门檐/门楼屋顶（用 drawRoofBounds 或简单坡顶）
builder.drawRoofBounds(midX - GW / 2 - 2, gy0 + GH + 1, FZ, midX + GW / 2 + 2, FZ + 2, 3, 'straight', ROOF_MAT, { gable: ROOF_MAT });
// 4) 门洞内不设门扇（通透）或挂一对灯笼
builder.set(midX - GW / 2 + 1, gy0 + GH - 2, FZ, 'lantern?hanging=true');
builder.set(midX + GW / 2 - 1, gy0 + GH - 2, FZ, 'lantern?hanging=true');
```

## 哥特尖拱（高而窄的尖拱门）

```javascript
// 简化尖拱：矩形门洞 + 两段弧交于尖顶（用 drawBezier 或折线）
builder.fill(midX - 1, gy0, FZ, midX + 1, gy0 + GH, FZ, 'air');       // 窄门洞（宽 3）
const apexY = gy0 + GH + GW;                                          // 尖顶高度
// 左弧：从左侧门脚到尖顶
builder.line(midX - 1, gy0 + GH, FZ, midX, apexY, FZ, ARCH_MAT);
// 右弧：从右侧门脚到尖顶
builder.line(midX + 1, gy0 + GH, FZ, midX, apexY, FZ, ARCH_MAT);
// 弧线加密：沿弧中间再各加一层（让尖拱更圆润，可选）
```

## 检查清单

- [ ] 大建筑的大门**不是** `dark_oak_door` 等门方块，而是砖石砌的门洞/拱门
- [ ] 门洞宽高与建筑规模匹配（越大越高）
- [ ] 门洞上方有过梁/拱券/门檐，两侧有门框柱
- [ ] 风格与建筑一致（中式门楼、罗马拱、哥特尖拱……）
- [ ] 门洞用 `fill(..., 'air')` 挖空，保证通行
