#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""全站硬编码颜色统一替换 - 按魂哥清单执行"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\qihun-site\src'
EXCLUDE = {'node_modules', 'dist', '.git', 'backup'}

# ── 替换规则 (old_str, new_str, 说明) ──────────────────────────────
RULES = [
    # 1. modal-overlay 背景
    (
        r'background\s*:\s*rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.85\s*\)',
        'background: var(--modal-overlay)',
        'modal-overlay rgba(0,0,0,0.85) -> var(--modal-overlay)'
    ),
    # 2. modal / modal-panel 背景 bg-secondary -> modal-bg
    (
        r'(.modal-panel\s*\{[^}]*?background\s*:\s*)var\(--bg-secondary\)',
        r'\1var(--modal-bg)',
        '.modal-panel background -> var(--modal-bg)'
    ),
    (
        r'(.modal\s*\{[^}]*?background\s*:\s*)var\(--bg-secondary\)',
        r'\1var(--modal-bg)',
        '.modal background -> var(--modal-bg)'
    ),
    # 3. val-legendary 背景/文字
    (
        r'background\s*:\s*rgba\(\s*255\s*,\s*215\s*,\s*0\s*,\s*0\.2\s*\)',
        'background: var(--value-gold-bg)',
        'val-legendary bg rgba(255,215,0,0.2) -> var(--value-gold-bg)'
    ),
    (
        r'color\s*:\s*#ffd700(?!\w)',
        'color: var(--value-gold-text)',
        'val-legendary text #ffd700 -> var(--value-gold-text)'
    ),
    (
        r'color\s*:\s*#ffd700(?!\w)',
        'color: var(--value-gold-text)',
        'val-legendary text #ffd700 -> var(--value-gold-text)'
    ),
    # 4. val-normal 背景/文字
    (
        r'background\s*:\s*rgba\(\s*78\s*,\s*205\s*,\s*196\s*,\s*0\.2\s*\)',
        'background: var(--value-cyan-bg)',
        'val-normal bg rgba(78,205,196,0.2) -> var(--value-cyan-bg)'
    ),
    (
        r'color\s*:\s*#4ecdc4(?!\w)',
        'color: var(--value-cyan-text)',
        'val-normal text #4ecdc4 -> var(--value-cyan-text)'
    ),
    # 5. val-bad 背景/文字
    (
        r'background\s*:\s*rgba\(\s*255\s*,\s*82\s*,\s*82\s*,\s*0\.2\s*\)',
        'background: var(--value-red-bg)',
        'val-bad bg rgba(255,82,82,0.2) -> var(--value-red-bg)'
    ),
    (
        r'color\s*:\s*#ff5252(?!\w)',
        'color: var(--value-red-text)',
        'val-bad text #ff5252 -> var(--value-red-text)'
    ),
    # 6. ECharts 图表：这几个文件已用 getComputedStyle 动态读，跳过
    #     PriceChartModal.vue / GpuPriceChartModal.vue 的 renderChart() 已处理

    # 7. 空状态 .empty-state（给没有该 class 的空状态加上）
    #    查找 empty 相关样式，替换为引用 .empty-state
    #    这里先不自动改，因为各组件结构不同，手动确认更安全

    # 8. 错误提示 .error-box（同上，先不自动改）
]

def patch_file(fpath, rules):
    """对单个文件应用所有规则，返回修改数"""
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    applied = []
    for pattern, replacement, desc in rules:
        new_content, n = re.subn(pattern, replacement, content, flags=re.DOTALL)
        if n > 0:
            content = new_content
            applied.append((desc, n))
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        return applied
    return []

# ── 主循环 ──────────────────────────────────────────────────────────
total_files = 0
total_patches = 0
log_lines = []

for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCLUDE]
    for fname in files:
        if not fname.endswith(('.vue', '.astro', '.css')):
            continue
        fpath = os.path.join(root, fname)
        rel = os.path.relpath(fpath, BASE)
        applied = patch_file(fpath, RULES)
        if applied:
            total_files += 1
            for desc, n in applied:
                total_patches += n
                log_lines.append(f'  [OK] {rel}: {desc} (x{n})')

print(f'Patched {total_files} files, {total_patches} replacements total.')
for line in log_lines:
    print(line)
if total_files == 0:
    print('(no changes made - all patterns may already be fixed)')
