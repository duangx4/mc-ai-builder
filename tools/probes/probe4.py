# -*- coding: utf-8 -*-
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
OUT = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\tools\extracted\agent_region.txt'
with open(EXE, 'rb') as f:
    data = f.read()

# agent/generate/stream region ~19.5MB - 20.0MB
start = 19570000
end = 20050000
text = data[start:end].decode('utf-8', errors='replace')
with open(OUT, 'w', encoding='utf-8') as f:
    f.write(text)
print('saved', len(text), 'chars')

# Also dump around 21618902 (baseURL) and 37842705 (baseUrl)
for name, s, e in [
    ('region_baseurl_21618.txt', 21610000, 21650000),
    ('region_baseurl_37842.txt', 37820000, 37890000),
    ('region_auth_37968.txt', 37950000, 38010000),
]:
    t = data[s:e].decode('utf-8', errors='replace')
    with open(r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\tools\extracted\\' + name, 'w', encoding='utf-8') as f:
        f.write(t)
    print('saved', name, len(t))
