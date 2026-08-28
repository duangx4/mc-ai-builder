# -*- coding: utf-8 -*-
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# dump around 23816547 (agent.js) - the pkg virtual filesystem path list
s = 23810000
e = 23860000
text = data[s:e].decode('utf-8', errors='replace')
with open(r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\tools\extracted\region_agentjs.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print('saved', len(text))

# print readable snippets
import re
lines = text.split('\n')
for i, ln in enumerate(lines):
    printable = sum(1 for c in ln if c.isprintable() or c in ' \t')
    if printable / max(len(ln), 1) > 0.9 and len(ln.strip()) > 3:
        print(f'{i:6d}: {ln.strip()[:180]}')
