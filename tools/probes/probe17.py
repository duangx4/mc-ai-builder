# -*- coding: utf-8 -*-
import sys, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# Unique app strings to locate the server code block
for pat in [b'API Server running on', b'AUTO_EXIT', b'apiConversationHistory', b'No heartbeat detected', b'startsWithQaz', b'mcserver2026', b'devLogs', b'heartbeat']:
    offs = []
    start = 0
    while True:
        i = data.find(pat, start)
        if i < 0:
            break
        offs.append(i)
        start = i + 1
        if len(offs) >= 20:
            break
    print(f'{pat.decode()}: {offs}')
