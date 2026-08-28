# -*- coding: utf-8 -*-
import sys, json, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# Try different pkg snapshot formats: path\0{json}\0 or path + varint length
# Dump raw bytes after path end
off = 37576160
pos = off
while pos < len(data) and data[pos] != 0:
    pos += 1
print('path ends at', pos)
print('next 400 bytes:', data[pos:pos+400])

# Try: pkg uses JSON meta, maybe with BOM/whitespace
m = re.search(rb'\{"mode":\d+,"size":\d+,"isFileValue":', data[pos:pos+2000])
if m:
    print('found meta at', pos + m.start())
    meta_raw = m.group(0)
    # find end brace
    start_off = pos + m.start()
    depth = 0
    i = start_off
    while i < len(data):
        if data[i] == 123:
            depth += 1
        elif data[i] == 125:
            depth -= 1
            if depth == 0:
                break
        i += 1
    meta = json.loads(data[start_off:i+1])
    print('meta:', meta)
    content_start = i + 1
    if content_start < len(data) and data[content_start] == 0:
        content_start += 1
    size = meta.get('size', 0)
    content = data[content_start:content_start+size]
    out = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\tools\extracted\server-pkg.cjs'
    with open(out, 'wb') as f:
        f.write(content)
    print('saved', len(content), 'bytes')
    print(content[:2500].decode('utf-8', errors='replace'))
else:
    print('no meta json found, trying hexdump around')
    print(data[pos:pos+200].hex())
