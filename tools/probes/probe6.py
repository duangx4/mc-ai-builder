# -*- coding: utf-8 -*-
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# Search for key agent strings and dump surrounding context
keys = [
    b'agent',
    b'Agent',
    b'Invalid',
    b'format',
    b'JSON',
    b'json',
    b'API',
    b'Key',
    b'key',
    b'url',
    b'Url',
    b'endpoint',
    b'Endpoint',
    b'http',
]
# focus region 19.8-20.1MB where agent/generate/stream clusters
start = 19800000
end = 20050000
text = data[start:end].decode('utf-8', errors='replace')

# find readable lines containing interesting tokens
import re
lines = text.split('\n')
for i, ln in enumerate(lines):
    low = ln.lower()
    if any(k in low for k in ['agent', 'api', 'key', 'url', 'http', 'json', 'invalid', 'format', 'endpoint', 'model', 'provider', 'base']):
        # print only if line is mostly printable
        printable = sum(1 for c in ln if c.isprintable() or c in ' \t')
        if printable / max(len(ln),1) > 0.8 and len(ln.strip()) > 5:
            print(f'{i:6d}: {ln.strip()[:200]}')
