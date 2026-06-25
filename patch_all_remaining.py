#!/usr/bin/env python3
"""Batch patch remaining hardcoded colors in all Vue/Astro components.
Maps hardcoded values to existing CSS variables in BaseLayout.astro.
"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\qihun-site\src'
REPORT = []

# 颜色 → CSS 变量映射表（严格对齐 BaseLayout.astro 已有变量）
COLOR_MAP = {
    # 背景 / 表面
    '#0d1523':  'var(--bg-primary)',
    '#151f30':  'var(--bg-secondary)',
    '#1c2a40':  'var(--bg-tertiary)',
    '#1a1a2e':  'var(--chart-split)',
    '#2a2a4a':  'var(--chart-border)',
    '#3a3a5a':  'var(--scrollbar-thumb)',
    '#0d0d1a':  'var(--bg-primary)',
    '#1a1a2e':  'var(--chart-tooltip-bg)',
    # 文字
    '#2c3e50':  'var(--text-primary)',
    '#5f6b7a':  'var(--text-secondary)',
    '#8b949e':  'var(--text-secondary)',
    '#b0b0c0':  'var(--thead-text)',
    '#e0e0e0':  'var(--chart-text)',
    '#e2e8f0':  'var(--text-primary)',
    '#e8e8f0':  'var(--chart-legend)',
    '#a0a0b0':  'var(--chart-label)',
    '#a0a0a0':  'var(--text-secondary)',
    # 金色强调
    '#c48b0a':  'var(--accent)',
    '#a37208':  'var(--accent-hover)',
    '#ffd700':  'var(--accent)',
    '#ffc107':  'var(--accent-hover)',
    '#ffb347':  'var(--accent)',
    '#ffcc00':  'var(--accent)',
    # 红 / 绿
    '#d63031':  'var(--price-up)',
    '#ff5252':  'var(--price-up)',
    '#b91c1c':  'var(--error-text)',
    '#10ac84':  'var(--price-down)',
    '#4caf50':  'var(--price-down)',
    '#22c55e':  'var(--price-down)',
    # 品牌色
    '#0071c5':  'var(--brand-intel)',
    '#60a5fa':  'var(--brand-intel)',
    '#e34f26':  'var(--brand-amd)',
    '#f87171':  'var(--brand-amd)',
    '#e04040':  'var(--brand-amd)',
    '#76b900':  'var(--brand-nvidia)',
    '#a3e635':  'var(--brand-nvidia)',
    '#4ecdc4':  'var(--chart-line-secondary)',
    '#ff8c00':  'var(--chart-line-primary)',
    '#ff6928':  'var(--price-up)',
    '#ef4444':  'var(--price-up)',
    # rgba 值 → CSS 变量
    'rgba(0,0,0,0.05)':    'var(--table-divider)',
    'rgba(0,0,0,0.1)':     'var(--shadow-modal)',
    'rgba(0,0,0,0.12)':    'var(--shadow-fab)',
    'rgba(0,0,0,0.3)':     'var(--shadow-card)',
    'rgba(0,0,0,0.5)':     'var(--modal-overlay)',
    'rgba(0,0,0,0.55)':    'var(--modal-overlay)',
    'rgba(0,0,0,0.85)':    'var(--modal-overlay)',
    'rgba(255,215,0,0.2)':  'var(--value-gold-bg)',
    'rgba(255,215,0,0.25)': 'var(--table-border-gold)',
    'rgba(255,255,255,0.03)': 'var(--table-divider)',
    'rgba(255,255,255,0.3)':  'rgba(255,255,255,0.3)',  # 保留（横杠）
    'rgba(74,144,217,0.25)': 'var(--table-outline-blue)',
    'rgba(74,144,217,0.6)':  'rgba(74,144,217,0.6)',    # type-badge 保留
    'rgba(80,200,120,0.6)':  'rgba(80,200,120,0.6)',    # type-badge 保留
    'rgba(255,140,0,0.6)':   'rgba(255,140,0,0.6)',     # type-badge 保留
}

# 文件扩展名
EXTS = ('.vue', '.astro', '.css', '.ts', '.js')

EXCLUDE = {'node_modules', 'dist', '.git', 'backup', 'coverage', '.astro', 'benchmark_results'}

def patch_file(fpath):
    """返回 (changed, details)"""
    try:
        with open(fpath, 'r', encoding='utf-8') as f:
            original = f.read()
    except Exception as e:
        return False, str(e)

    content = original
    details = []

    for hard, css_var in COLOR_MAP.items():
        # 跳过 "保留" 项
        if css_var.startswith('rgba') and hard != css_var:
            # 这个 rgba 需要替换
            pass
        # 在 CSS 变量定义区（:root 或 @media）里的不动
        # 简单策略：如果所在行包含 ": root {" 或 "@media" 则跳过该行
        lines = content.split('\n')
        new_lines = []
        for line in lines:
            stripped = line.strip()
            # 跳过 CSS 变量定义行（--var: #xxx）
            if re.match(r'--[\w-]+\s*:\s*' + re.escape(hard), stripped):
                new_lines.append(line)
                continue
            # 执行替换（整行替换，避免 var() 内部被换）
            if f'var(' not in line or hard not in line.split('var(')[0]:
                if hard in line:
                    new_line = line.replace(hard, css_var)
                    if new_line != line:
                        details.append(f'  {os.path.basename(fpath)}: {hard[:30]} → {css_var[:30]}')
                    line = new_line
            new_lines.append(line)
        content = '\n'.join(new_lines)

    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, details
    return False, []

# 遍历
for root, dirs, files in os.walk(BASE):
    dirs[:] = [d for d in dirs if d not in EXCLUDE]
    for fname in files:
        if not any(fname.endswith(ext) for ext in EXTS):
            continue
        fpath = os.path.join(root, fname)
        changed, details = patch_file(fpath)
        if changed:
            REPORT.append((fpath, details))

if REPORT:
    print(f'[OK] Patched {len(REPORT)} files:\n')
    for fpath, details in REPORT:
        rel = os.path.relpath(fpath, BASE)
        print(f'  📄 {rel}')
        for d in details[:5]:
            print(d)
        if len(details) > 5:
            print(f'     ... +{len(details)-5} more')
else:
    print('[CLEAN] No hardcoded colors found that need patching')
