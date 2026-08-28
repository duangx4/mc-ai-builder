# -*- coding: utf-8 -*-
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# Find where app source files are embedded (pkg snapshot entries)
for pat in [b'mc-ai-builder', b'server.js', b'agent.js', b'agent/', b'/agent', b'apiAgent', b'runAgent', b'skills/registry']:
    offs = []
    start = 0
    while True:
        i = data.find(pat, start)
        if i < 0:
            break
        offs.append(i)
        start = i + 1
        if len(offs) >= 30:
            break
    print(f'{pat.decode()}: {offs}')
