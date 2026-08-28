# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
JS = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\dist\assets\index-CV-t4nr_.js'
with open(JS, 'r', encoding='utf-8') as f:
    src = f.read()

def show(anchor, before=800, after=1500, label=''):
    print(f'\n########## {label} @ {anchor} ##########')
    s = max(0, anchor - before)
    e = min(len(src), anchor + after)
    print(src[s:e])
    print()

# 1. GS function (Invalid API response)
i = src.find('Invalid API response')
show(i, 600, 1200, 'GS parser')

# 2. chat/completions fetch sites
for m in re.finditer(r'chat/completions', src):
    show(m.start(), 1000, 900, 'fetch chat/completions')

# 3. localStorage settings key
for m in re.finditer(r'localStorage', src):
    pass
