# -*- coding: utf-8 -*-
import sys, json
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# pkg snapshot: path\0 {json meta}\0 content
# Find entry for server-pkg.cjs
off = data.find(b'mc-ai-builder\\server-pkg.cjs')
print('entry at', off)
# after path (null-terminated) find metadata JSON starting with {"mode":
pos = off
while pos < len(data) and data[pos] != 0:
    pos += 1
print('path ends at', pos)
# look for {"mode": in next 500 bytes
meta_start = data.find(b'{"mode":', pos, pos + 500)
print('meta at', meta_start)
if meta_start > 0:
    # find closing brace of JSON
    depth = 0
    i = meta_start
    while i < len(data):
        if data[i] == 123:  # {
            depth += 1
        elif data[i] == 125:  # }
            depth -= 1
            if depth == 0:
                break
        i += 1
    meta_raw = data[meta_start:i+1]
    meta = json.loads(meta_raw)
    print('meta:', meta)
    content_start = i + 1
    if data[content_start] == 0:
        content_start += 1
    size = meta.get('size', 0)
    content = data[content_start:content_start+size]
    out = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\tools\extracted\server-pkg.cjs'
    with open(out, 'wb') as f:
        f.write(content)
    print('saved', len(content), 'bytes ->', out)
    # show first 3000 chars
    print(content[:3000].decode('utf-8', errors='replace'))
