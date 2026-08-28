# -*- coding: utf-8 -*-
import sys, json, re
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# The pkg snapshot is compressed with its own scheme. Let's find the exact boundaries.
# AUTO_EXIT at 37612727, apiConversationHistory at 37600216 — these are inside the server code.
# The server-pkg.cjs entry is at 37576160. Content starts after the header.
# pkg snapshot format: after path string and header, there's a v8-snapshot-like blob. Actually pkg uses its own
# "snapshot" with bzip2? Let's check: pkg uses 'pkg' compression (zlib deflate) by default for assets? No — pkg embeds
# JS as raw strings in a virtual filesystem, the snapshot is stored with its own serialization.
# Try: scan for zlib headers (0x78 0x9C / 0x78 0xDA / 0x78 0x01) near 37576160.
region = data[37576160:37577000]
for i in range(len(region)-2):
    if region[i] == 0x78 and region[i+1] in (0x01, 0x5e, 0x9c, 0xda):
        print('zlib header at offset', 37576160+i, hex(region[i+1]))

# Also look for the actual JS text of server code - find "require(" patterns near these strings
for anchor in [37600216, 37612727]:
    s = max(0, anchor - 3000)
    e = min(len(data), anchor + 3000)
    text = data[s:e].decode('utf-8', errors='replace')
    print(f'===== around {anchor} =====')
    lines = text.split('\n')
    for i, ln in enumerate(lines):
        printable = sum(1 for c in ln if c.isprintable() or c in ' \t')
        if printable / max(len(ln), 1) > 0.9 and len(ln.strip()) > 2:
            print(f'{i:5d}: {ln.strip()[:160]}')
    print()
