# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

for anchor in [21775313, 21775976, 37842705, 37859786, 37859837, 37860134, 37860485, 37863633]:
    s = max(0, anchor - 1500)
    e = min(len(data), anchor + 2500)
    text = data[s:e].decode('utf-8', errors='replace')
    print(f'===== around {anchor} =====')
    lines = text.split('\n')
    for i, ln in enumerate(lines):
        printable = sum(1 for c in ln if c.isprintable() or c in ' \t')
        if printable / max(len(ln), 1) > 0.9 and len(ln.strip()) > 2:
            print(f'{i:5d}: {ln.strip()[:180]}')
    print()
