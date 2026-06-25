#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""检查并打印所有文件中真正需要变量化的硬编码颜色（排除变量定义和#fff/#000）"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\qihun-site\src'
EXCLUDE_DIRS = {'node_modules', 'dist', '.git', 'backup', 'coverage'}
EXTS = ('.vue', '.astro', '.css', '.ts', '.js')

# 合法豁免（黑白 + 透明 + CSS var 定义值）
SAFE = {
    '#fff', '#ffffff', '#FFF', '#FFFFFF',
    '#000', '#000000', '#00000000',
    'rgba(0,0,0,0)', 'rgba(255,255,255,0)',
    'rgb(0,0,0)', 'rgb(255,255,255)',
    'transparent', 'currentcolor', 'inherit',
}

results = {}
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
    for fname in files:
        if not any(fname.endswith(ext) for ext in EXTS):
            continue
        fpath = os.path.join(root, fname)
        rel = os.path.relpath(fpath, BASE)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                lines = f.readlines()
        except:
            continue

        found = set()
        for i, line in enumerate(lines, 1):
            stripped = line.strip()
            # 跳过 CSS 变量定义行（--xxx: #yyy）
            if re.match(r'--[\w-]+\s*:', stripped):
                continue
            # 找 #hex 和 rgba
            for m in re.finditer(r'#[0-9a-fA-F]{3,8}\b', line):
                tok = m.group().lower()
                if tok in SAFE:
                    continue
                # 检查前面是否有 var(
                ctx_start = max(0, m.start() - 30)
                if 'var(' in line[ctx_start:m.start()]:
                    continue
                found.add((i, m.group()))
            for m in re.finditer(r'rgba?\(\s*\d+', line):
                tok = m.group().strip()
                # 简单去重
                found.add((i, tok))
        if found:
            results[rel] = sorted(found)[:8]

if not results:
    print('[OK] All hardcoded colors have been variableized!')
else:
    print(f'Found {len(results)} files with potential hardcoded colors:\n')
    for rel, items in sorted(results.items()):
        print(f'  [FILE] {rel}')
        for lineno, tok in items:
            print(f'     L{lineno}: {tok}')
        if len(items) > 8:
            print(f'     ... and {len(items)-8} more')
