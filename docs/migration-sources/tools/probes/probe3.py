# -*- coding: utf-8 -*-
EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

pats = [
    b'is not valid JSON',
    b'Agent Error',
    b'agent error',
    b'Unexpected token',
    b'<!doctype',
    b'<!DOCTYPE',
    b'Not Found',
    b'Cannot GET',
    b'404',
    b'error',
    b'Error:',
]
for p in pats:
    offs = []
    start = 0
    while True:
        i = data.find(p, start)
        if i < 0:
            break
        offs.append(i)
        start = i + 1
        if len(offs) >= 15:
            break
    print(f'{p.decode()}: {offs[:15]}')
