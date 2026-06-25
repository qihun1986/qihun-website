#!/usr/bin/env python3
"""全局配色变量化 - 替换所有硬编码值为 CSS 变量 (ASCII safe)"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\qihun-site\src'

# 替换规则：(搜索正则, 替换值, 说明)
RULES = [
    # 1. 表格容器边框 gold
    (
        r'border:\s*1px solid rgba\(255,\s*215,\s*0,\s*0\.25\)',
        'border: 1px solid var(--table-border-gold)',
        'table-border-gold'
    ),
    # 2. 表格容器 outline blue
    (
        r'outline:\s*1\.5px solid rgba\(74,\s*144,\s*217,\s*0\.35\)',
        'outline: 1.5px solid var(--table-outline-blue)',
        'table-outline-blue'
    ),
    # 3. 表格容器 box-shadow
    (
        r'box-shadow:\s*0 4px 16px rgba\(0,\s*0,\s*0,\s*0\.3\)',
        'box-shadow: var(--card-shadow)',
        'card-shadow'
    ),
    # 4. 弹窗遮罩
    (
        r'background:\s*rgba\(0,\s*0,\s*0,\s*0\.85\)',
        'background: var(--modal-overlay)',
        'modal-overlay'
    ),
    # 5. 性价比胶囊背景 gold-bg
    (
        r'background:\s*rgba\(255,\s*215,\s*0,\s*0\.2\);',
        'background: var(--value-gold-bg);',
        'value-gold-bg'
    ),
    # 6. 性价比金色文字
    (
        r'color:\s*#ffd700;',
        'color: var(--value-gold-text);',
        'value-gold-text'
    ),
    # 7. 表格分割线
    (
        r'border-bottom:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.03\);',
        'border-bottom: 1px solid var(--table-divider);',
        'table-divider'
    ),
    # 8. 表头文字色
    (
        r'color:\s*#b0b0c0;',
        'color: var(--thead-text);',
        'thead-text'
    ),
    # 9. toolbar-btn hover border-color gold
    (
        r'border-color:\s*rgba\(255,\s*215,\s*0,\s*0\.5\);',
        'border-color: var(--table-border-gold);',
        'border-color-gold'
    ),
    # 10. toolbar-btn / sort-icon hover background gold
    (
        r'background:\s*rgba\(255,\s*215,\s*0,\s*0\.08\);',
        'background: var(--value-gold-bg);',
        'bg-gold-008'
    ),
    # 11. preset-btn.active 金色背景/边框/文字 (多值同行)
    (
        r'background:\s*rgba\(255,215,0,0\.15\);\s*border-color:\s*rgba\(255,215,0,0\.6\);\s*color:\s*#ffd700;',
        'background: var(--value-gold-bg); border-color: var(--table-border-gold); color: var(--value-gold-text);',
        'preset-btn-active'
    ),
    # 12. cpu-row hover background (保留原值，或也替换)
    # 用变量 --row-hover-bg，需在 BaseLayout 定义；暂时跳过
]

def patch_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    changes = []

    for pattern, replacement, desc in RULES:
        new_content = re.sub(pattern, replacement, content)
        if new_content != content:
            count = len(re.findall(pattern, content))
            changes.append(f'  [OK] {desc}: {count} place(s)')
            content = new_content

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, changes
    return False, []

TARGET_FILES = [
    r'components\CpuDashboard.vue',
    r'components\GpuDashboard.vue',
    r'components\CpuSpecsModal.vue',
    r'components\GpuSpecsModal.vue',
    r'components\CpuTierDashboard.vue',
    r'components\CpuTierDetailModal.vue',
    r'components\CpuTierCompareModal.vue',
    r'components\DealModal.vue',
    r'components\FilterDrawer.vue',
    r'components\PriceChartModal.vue',
    r'components\GpuPriceChartModal.vue',
    r'components\ThanksWall.vue',
    r'components\CarouselBanner.vue',
    r'components\VideoPlayer.vue',
    r'components\InfoCarousel.astro',
    r'layouts\BaseLayout.astro',
    r'pages\about.astro',
    r'pages\cpu-tier.astro',
    r'pages\cpu.astro',
    r'pages\gpu.astro',
    r'pages\index.astro',
    r'pages\videos.astro',
]

if __name__ == '__main__':
    total_files = 0
    total_changes = 0
    for rel in TARGET_FILES:
        fp = os.path.join(BASE, rel)
        if not os.path.exists(fp):
            print(f'[SKIP] {rel} (not found)')
            continue
        modified, changes = patch_file(fp)
        if modified:
            total_files += 1
            total_changes += len(changes)
            print(f'[PATCH] {rel}')
            for c in changes:
                print(c)
        else:
            print(f'[CLEAN] {rel}')

    print(f'\n=== Done: {total_files} files, {total_changes} replacements ===')
