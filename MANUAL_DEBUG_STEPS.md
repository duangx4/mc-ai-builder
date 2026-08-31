# 手动诊断步骤

请在浏览器中执行以下操作：

1. 打开 http://localhost:5174
2. 按 F12 打开开发者工具
3. 在 Console 中执行：

```javascript
// 检查画布
const canvas = document.querySelector('canvas');
console.log('Canvas dimensions:', canvas.width, canvas.height);
console.log('Canvas style:', canvas.style.width, canvas.style.height);

// 检查 WebGL
const gl = canvas.getContext('webgl2');
const pixels = new Uint8Array(canvas.width * canvas.height * 4);
gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

// 检查是否有任何非黑色像素
let hasContent = false;
for (let i = 0; i < pixels.length; i += 4) {
  if (pixels[i] > 10 || pixels[i+1] > 10 || pixels[i+2] > 10) {
    hasContent = true;
    console.log('Found content at pixel', Math.floor(i/4));
    break;
  }
}
console.log('Has content:', hasContent);

// 尝试手动 resize
window.dispatchEvent(new Event('resize'));
console.log('Triggered resize');

// 等待几秒后再次检查
setTimeout(() => {
  gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  let hasContent2 = false;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 10 || pixels[i+1] > 10 || pixels[i+2] > 10) {
      hasContent2 = true;
      break;
    }
  }
  console.log('Has content after resize:', hasContent2);
}, 2000);
```

4. 尝试手动拖动鼠标旋转相机，看是否能看到任何内容

5. 检查是否有任何可见的网格、坐标轴或立方体

请告诉我结果。
