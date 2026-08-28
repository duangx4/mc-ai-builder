# -*- coding: utf-8 -*-
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# Dump readable windows around the 'Unexpected token' hits that are likely app code
for off in [19584157, 21883019, 21883468, 25544880, 25950120, 25953128]:
    s = max(0, off - 3000)
    e = min(len(data), off + 6000)
    text = data[s:e].decode('utf-8', errors='replace')
    print(f'===== around {off} =====')
    print(text)
    print()
