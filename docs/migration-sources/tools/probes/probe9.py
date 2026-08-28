# -*- coding: utf-8 -*-
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# The biz window (37.59MB-37.69MB) contains app server code (routes, agent logic).
# Extract wider region around it: 37.5MB - 38.1MB where express() was found at 37963533.
start = 37500000
end = 38150000
text = data[start:end].decode('utf-8', errors='replace')
with open(r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\tools\extracted\app_server_region.txt', 'w', encoding='utf-8') as f:
    f.write(text)
print('saved', len(text))

# Also the 21.6MB region had baseURL hits (21618902 etc) - that's node internals.
# And 21.98MB 'Unexpected token' - check
for off in [21883019, 21883468]:
    s = max(0, off - 500)
    e = min(len(data), off + 2000)
    print(f'--- around {off} ---')
    print(data[s:e].decode('utf-8', errors='replace')[:2500])
