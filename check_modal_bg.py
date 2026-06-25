#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查哪些弹窗用了 var(--bg-secondary) 作为背景"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\qihun-site\src'
EXCLUDE = {'node_modules', 'dist', '.git', 'backup'}

found = {}
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCLUDE]
    for fname in files:
        if not fname.endswith(('.vue', '.astro')):
            continue
        fpath = os.path.join(root, fname)
        rel = os.path.relpath(fpath, BASE)
        with open(fpath, 'r', encoding='utf-8') as f:
            content = f.read()
        # 找 .modal 选择器 + background 含 bg-secondary
        matches = re.findall(
            r'(\.modal[^{]*)(\{[^}]{0,200})',
            content, re.DOTALL
        )
        for sel, body in matches:
            if 'bg-secondary' in body or 'modal-bg' in body:
                if rel not in found:
                    found[rel] = []
                found[rel].append(sel.strip()[:60] + ' ...')

if found:
    print('Files using --bg-secondary as modal background:')
    for rel, ms in sorted(found.items()):
        print(f'  [FILE] {rel}')
        for m in ms[:3]:
            print(f'    {m}')
else:
    print('No modal-bg-secondary found. Will add --modal-bg variable to BaseLayout.')

# 也检查有没有文件已经用了 --modal-bg
print('\n--- Files already using --modal-bg ---')
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCLUDE]
    for fname in files:
        if not fname.endswith(('.vue', '.astro', '.css')):
            continue
        fpath = os.path.join(root, fname)
        with open(fpath, 'r', encoding='utf-8') as f:
            if 'modal-bg' in f.read():
                print(f'  {os.path.relpath(fpath, BASE)}')
