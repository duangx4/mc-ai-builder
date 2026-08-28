# -*- coding: utf-8 -*-
import re

EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

# Find all ASCII URLs
urls = re.findall(rb'https?://[A-Za-z0-9\.\-_/:%\?&=~#@\+\$,;\(\)!]+', data)
seen = set()
for u in urls:
    s = u.decode('ascii', errors='replace')
    if s not in seen:
        seen.add(s)
        print(s)
