# -*- coding: utf-8 -*-
with open(r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe', 'rb') as f:
    data = f.read()
idx = data.find(b'whitelist')
window = data[max(0, idx-1500): idx+1500]
with open(r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\tools\whitelist_window.txt', 'wb') as f:
    f.write(window)
print('saved', len(window))
