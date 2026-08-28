# -*- coding: utf-8 -*-
import sys
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# server-pkg.cjs starts at 37576160. pkg stores: path\0 + {metadata}\0 + content
# The metadata blob is ~ small. Content follows. Dump 37576160+60 .. 37617900
start = 37576220
end = 37617900
text = data[start:end].decode('utf-8', errors='replace')
with open(r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\tools\extracted\server-pkg.cjs', 'w', encoding='utf-8') as f:
    f.write(text)
print('saved', len(text))

# Search for the key strings in this file
import re
for pat in ['fetch', 'chat/completions', 'Authorization', 'baseURL', 'apiKey', 'API_KEY', 'http', 'agent', 'model', 'stream', 'axios', 'openai', 'deepseek', 'key', 'url']:
    idxs = [m.start() for m in re.finditer(re.escape(pat), text, re.IGNORECASE)]
    print(f'{pat}: {len(idxs)} hits {idxs[:10]}')
