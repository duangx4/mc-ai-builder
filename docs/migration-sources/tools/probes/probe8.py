# -*- coding: utf-8 -*-
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# Dump readable windows around the agent/stream/generate clusters (app code likely)
for off in [19864105, 19869005, 19869852, 19876031, 19889214, 19896907, 19942074, 19942447, 21016303, 21019151, 21632694, 21775313, 21886790, 21938187]:
    s = max(0, off - 4000)
    e = min(len(data), off + 8000)
    text = data[s:e].decode('utf-8', errors='replace')
    # keep only printable-ish content
    lines = text.split('\n')
    kept = []
    for ln in lines:
        printable = sum(1 for c in ln if c.isprintable() or c in ' \t')
        if printable / max(len(ln), 1) > 0.85 and len(ln.strip()) > 3:
            kept.append(ln.rstrip()[:220])
    print(f'===== around {off} =====')
    print('\n'.join(kept[:60]))
    print()
