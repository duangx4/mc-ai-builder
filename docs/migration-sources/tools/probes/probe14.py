# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# Print readable lines of region 37576160..37618000
start = 37576160
end = 37618000
text = data[start:end].decode('utf-8', errors='replace')
lines = text.split('\n')
for i, ln in enumerate(lines):
    printable = sum(1 for c in ln if c.isprintable() or c in ' \t')
    if printable / max(len(ln), 1) > 0.9 and len(ln.strip()) > 3:
        print(f'{i:5d}: {ln.strip()[:200]}')
