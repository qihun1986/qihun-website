#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""补丁：修 modal-overlay + val-normal/bad 文字色"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\qihun-site\src'
EXCLUDE = {'node_modules', 'dist', '.git', 'backup'}

RULES = [
    # .modal-overlay background -> var(--modal-overlay)
    (
        r'(\.modal-overlay\s*\{[^}]*?background\s*:\s*)(?!var\(--modal-overlay\))[^;]+;',
        r'\1var(--modal-overlay);',
        '.modal-overlay background -> var(--modal-overlay)'
    ),
    # .val-normal color -> var(--value-cyan-text)
    (
        r'(\.val-normal[^}]*?color\s*:\s*)var\(--chart-line-secondary\)',
        r'\1var(--value-cyan-text)',
        '.val-normal color -> var(--value-cyan-text)'
    ),
    # .val-bad color -> var(--value-red-text)
    (
        r'(\.val-bad[^}]*?color\s*:\s*)var\(--price-up\)',
        r'\1var(--value-red-text)',
        '.val-bad color -> var(--value-red-text)'
    ),
    # .val-legendary color -> var(--value-gold-text)
    (
        r'(\.val-legendary[^}]*?color\s*:\s*)#ffd700',
        r'\1var(--value-gold-text)',
        '.val-legendary color -> var(--value-gold-text)'
    ),
]

def patch_file(fpath):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    log = []
    for pattern, replacement, desc in RULES:
        new_content, n = re.subn(pattern, replacement, content, flags=re.DOTALL)
        if n > 0:
            content = new_content
            log.append((desc, n))
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        return log
    return []

total_files = 0
total_n = 0
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCLUDE]
    for fname in files:
        if not fname.endswith(('.vue', '.astro', '.css')):
            continue
        fpath = os.path.join(root, fname)
        log = patch_file(fpath)
        if log:
            total_files += 1
            rel = os.path.relpath(fpath, BASE)
            for desc, n in log:
                total_n += n
                print(f'  [OK] {rel}: {desc} (x{n})')

print(f'\nDone: {total_files} files, {total_n} replacements.')
if total_files == 0:
    print('(no changes - patterns may not match or already fixed)')
