# -*- coding: utf-8 -*-
import re

EXE = r'C:\Users\21972\OneDrive\Desktop\MC\ai bulider\MC-AI-Builder.exe'
with open(EXE, 'rb') as f:
    data = f.read()

pats = [
    b'chat/completions',
    b'/v1/chat',
    b'api.openai.com',
    b'api.deepseek.com',
    b'baseURL',
    b'baseUrl',
    b'Authorization',
    b'Bearer',
    b'openai',
    b'deepseek',
    b'anthropic',
    b'claude',
    b'API Key',
    b'apiKey',
    b'model',
    b'agent',
    b'Agent Error',
    b'stream',
    b'SSE',
    b'text/event-stream',
    b'lanth',
    b'lantian',
    b'proxy',
    b'agent/run',
    b'/api/agent',
    b'generate',
    b'max_tokens',
    b'temperature',
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
        if len(offs) >= 10:
            break
    print(f'{p.decode()}: {offs[:10]}')
