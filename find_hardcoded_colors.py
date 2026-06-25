#!/usr/bin/env python3
"""扫描项目中所有未被 CSS 变量替换的硬编码颜色"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\qihun-site'
EXCLUDE = {'node_modules', 'dist', '.git', 'backup', '.astro', 'coverage'}
EXTS = ('.vue', '.astro', '.css', '.ts', '.js', '.jsx', '.tsx')

# 匹配十六进制颜色和 rgba/rgb
PATTERNS = [
    re.compile(r'#([0-9a-fA-F]{3,8})\b'),
    re.compile(r'rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+'),
]

# 常见"合法"颜色（黑白/透明），可以忽略
SAFE_COLORS = {
    '#fff', '#ffffff', '#FFF', '#FFFFFF',
    '#000', '#000000', '#00000000',
    'rgba(0,0,0,0)', 'rgba(255,255,255,0)',
    'rgb(0,0,0)', 'rgb(255,255,255)',
    'transparent', 'currentcolor', 'inherit',
}

results = {}

for root, dirs, files in os.walk(BASE):
    # 过滤排除目录
    dirs[:] = [d for d in dirs if d not in EXCLUDE]
    for fname in files:
        if not any(fname.endswith(ext) for ext in EXTS):
            continue
        fpath = os.path.join(root, fname)
        relpath = os.path.relpath(fpath, BASE)
        try:
            with open(fpath, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception:
            continue

        found = set()
        for pat in PATTERNS:
            for m in pat.finditer(content):
                token = m.group()
                # 跳过 CSS var() 里面的（已经被变量化）
                ctx_start = max(0, m.start() - 30)
                if 'var(' in content[ctx_start:m.start()]:
                    continue
                # 跳过安全色
                if any(s.lower() in token.lower() for s in SAFE_COLORS):
                    continue
                found.add(token)

        if found:
            results[relpath] = sorted(found)

if not results:
    print('[OK] No hardcoded colors found, all variableized!')
else:
    print(f'Found {len(results)} files with hardcoded colors:\n')
    for rel, colors in sorted(results.items()):
        short = rel.replace('src\\', '').replace('\\', '/')
        print(f'  [FILE] {short}')
        for c in colors[:8]:
            print(f'     -> {c}')
        if len(colors) > 8:
            print(f'     ... and {len(colors)-8} more')
    print('\nSuggestion: replace above colors with CSS variables')
