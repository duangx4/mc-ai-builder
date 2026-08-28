# -*- coding: utf-8 -*-
import sys

with open(r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe', 'rb') as f:
    data = f.read()

print('exe size:', len(data))
for pat in [b'server.js', b'/snapshot/', b'__dirname', b'express()', b'Invalid assistant message']:
    print(pat, '->', data.find(pat))
