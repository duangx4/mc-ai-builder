# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

for off in [37576160, 37617935, 37620484, 37636194, 37641343, 37652217, 37671409, 37682363, 37696608, 37701264, 37704734, 37728482, 37732264, 37736571]:
    s = off
    e = min(len(data), off + 400)
    chunk = data[s:e]
    nl = chunk.find(b'\n')
    line = chunk[:nl if nl > 0 else 200]
    print(f'{off}: {line.decode("utf-8", errors="replace")[:200]}')
