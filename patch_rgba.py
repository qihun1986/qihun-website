#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全站第3批：白色叠加/金色高亮/阴影 rgba -> CSS 变量"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\qihun-site\src'
EXCLUDE = {'node_modules', 'dist', '.git', 'backup'}

# 替换规则：(正则, 替换后, 说明)
# 注意：只替换 .vue / .astro 里 <style> 块中的 CSS，不碰 JS 字符串
RULES = [
    # ── 金色高亮 rgba(255,215,0,*) ──────────────────────────────
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.03\s*\)',
        'var(--hover-bg)',
        'gold 0.03 -> var(--hover-bg)'
    ),
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.05\s*\)',
        'var(--hover-bg-strong)',
        'gold 0.05 -> var(--hover-bg-strong)'
    ),
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.06\s*\)',
        'var(--hover-bg)',
        'gold 0.06 -> var(--hover-bg)'
    ),
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.08\s*\)',
        'var(--hover-bg-strong)',
        'gold 0.08 -> var(--hover-bg-strong)'
    ),
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.1\s*\)',
        'var(--brand-border-weak)',
        'gold 0.1 -> var(--brand-border-weak)'
    ),
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.12\s*\)',
        'var(--brand-border)',
        'gold 0.12 -> var(--brand-border)'
    ),
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.15\s*\)',
        'var(--brand-border-strong)',
        'gold 0.15 -> var(--brand-border-strong)'
    ),
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.2\s*\)',
        'var(--brand-border-strong)',
        'gold 0.2 -> var(--brand-border-strong)'
    ),
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.3\s*\)',
        'var(--brand-border-strong)',
        'gold 0.3 -> var(--brand-border-strong)'
    ),
    (
        r'rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.4\s*\)',
        'var(--brand-border-strong)',
        'gold 0.4 -> var(--brand-border-strong)'
    ),
    (
        r'rgba\(\s*255\s*,\s*204\s*,\s*0\s*,\s*0\.08\s*\)',
        'var(--hover-bg-strong)',
        'gold#ffcc00 0.08 -> var(--hover-bg-strong)'
    ),
    (
        r'rgba\(\s*255\s*,\s*204\s*,\s*0\s*,\s*0\.3\s*\)',
        'var(--brand-border-strong)',
        'gold#ffcc00 0.3 -> var(--brand-border-strong)'
    ),
    # ── 白色叠加 rgba(255,255,255,*) ───────────────────────────
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.03\s*\)',
        'var(--overlay-white-03)',
        'white 0.03 -> var(--overlay-white-03)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.04\s*\)',
        'var(--overlay-white-04)',
        'white 0.04 -> var(--overlay-white-04)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.05\s*\)',
        'var(--overlay-white-05)',
        'white 0.05 -> var(--overlay-white-05)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.06\s*\)',
        'var(--overlay-white-06)',
        'white 0.06 -> var(--overlay-white-06)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.07\s*\)',
        'var(--overlay-white-07)',
        'white 0.07 -> var(--overlay-white-07)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.08\s*\)',
        'var(--overlay-white-08)',
        'white 0.08 -> var(--overlay-white-08)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.1\s*\)',
        'var(--overlay-white-10)',
        'white 0.1 -> var(--overlay-white-10)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.12\s*\)',
        'var(--overlay-white-12)',
        'white 0.12 -> var(--overlay-white-12)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.13\s*\)',
        'var(--overlay-white-13)',
        'white 0.13 -> var(--overlay-white-13)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.2\s*\)',
        'var(--overlay-white-20)',
        'white 0.2 -> var(--overlay-white-20)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.3\s*\)',
        'var(--overlay-white-30)',
        'white 0.3 -> var(--overlay-white-30)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.4\s*\)',
        'var(--overlay-white-40)',
        'white 0.4 -> var(--overlay-white-40)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.5\s*\)',
        'var(--overlay-white-50)',
        'white 0.5 -> var(--overlay-white-50)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.55\s*\)',
        'var(--overlay-white-55)',
        'white 0.55 -> var(--overlay-white-55)'
    ),
    (
        r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,\s*0\.6\s*\)',
        'var(--overlay-white-60)',
        'white 0.6 -> var(--overlay-white-60)'
    ),
    # ── 黑色阴影 rgba(0,0,0,*) ─────────────────────────────────
    (
        r'rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.1\s*\)',
        'var(--shadow-card)',
        'black 0.1 -> var(--shadow-card)'
    ),
    (
        r'rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.12\s*\)',
        'var(--shadow-fab)',
        'black 0.12 -> var(--shadow-fab)'
    ),
    (
        r'rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.2\s*\)',
        'var(--shadow-card-strong)',
        'black 0.2 -> var(--shadow-card-strong)'
    ),
    (
        r'rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.3\s*\)',
        'var(--shadow-fab-strong)',
        'black 0.3 -> var(--shadow-fab-strong)'
    ),
    (
        r'rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.4\s*\)',
        'var(--shadow-modal)',
        'black 0.4 -> var(--shadow-modal)'
    ),
    (
        r'rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.5\s*\)',
        'var(--shadow-strong)',
        'black 0.5 -> var(--shadow-strong)'
    ),
    (
        r'rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.6\s*\)',
        'var(--overlay-dark-60)',
        'black 0.6 -> var(--overlay-dark-60)'
    ),
    # ── 品牌色 linear-gradient（不碰，由 CSS var 控制）────────
    # rgba(0,113,197,*) Intel蓝 / rgba(227,79,38,*) AMD红 / rgba(118,185,0,*) NVIDIA绿
    # 这三个保留，属于品牌渐变，不适合用通用变量
]

def patch_file(fpath):
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    log = []
    for pattern, replacement, desc in RULES:
        new_content, n = re.subn(pattern, replacement, content)
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
out_lines = []
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCLUDE]
    for fname in files:
        if not fname.endswith(('.vue', '.astro', '.css')):
            continue
        fpath = os.path.join(root, fname)
        # 跳过 BaseLayout.astro（变量定义文件）
        if fpath.endswith('BaseLayout.astro'):
            continue
        log = patch_file(fpath)
        if log:
            total_files += 1
            rel = os.path.relpath(fpath, BASE)
            for desc, n in log:
                total_n += n
                out_lines.append(f'  [OK] {rel}: {desc} (x{n})')

print(f'Patched {total_files} files, {total_n} replacements total.')
for line in out_lines:
    print(line)
if total_files == 0:
    print('(no changes - all already fixed or patterns not matched)')
