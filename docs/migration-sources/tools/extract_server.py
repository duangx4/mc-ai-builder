# -*- coding: utf-8 -*-
"""提取 exe 内嵌 JS 源码（pkg snapshot 区域）"""
import os, re, sys

EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
OUT_DIR = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\tools\extracted'

os.makedirs(OUT_DIR, exist_ok=True)

with open(EXE, 'rb') as f:
    data = f.read()

# 业务代码区：从 37600000 到 snapshot 区起点，或找源码边界
# apiConversationHistory 在 37600216，/api/skills 在 37611790
# 向后找一个大窗口，保存为可读文件
start = 37590000
end = min(len(data), 37690000)  # 100KB 窗口
window = data[start:end]

# 保存原始
with open(os.path.join(OUT_DIR, 'biz_window.bin'), 'wb') as f:
    f.write(window)

# 找 window 内的 JS 源码可读范围
# 尝试解码
text = window.decode('utf-8', errors='replace')
with open(os.path.join(OUT_DIR, 'biz_window.txt'), 'w', encoding='utf-8') as f:
    f.write(text)

print(f'saved biz_window.txt ({len(text)} chars)')

# 显示 /api/skills 周围 3000 字节
rel = 37611790 - start
print('=== /api/skills 周围 ===')
print(text[max(0, rel-1500): rel+1500])
