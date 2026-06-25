#!/usr/bin/env python3
"""给 BaseLayout.astro 添加 ECharts 专用 CSS 变量（light + dark）"""
import re

FP = r'C:\Users\Administrator\Desktop\qihun-site\src\layouts\BaseLayout.astro'
with open(FP, 'r', encoding='utf-8') as f:
    content = f.read()

# Light 模式：在 --chart-text 后面插入
LIGHT_INSERT = """
        /* ECharts 图表专用色 */
        --chart-line-primary: #ff8c00;
        --chart-line-secondary: #4ecdc4;
        --chart-border: #cdd4dc;
        --chart-label: #5f6b7a;
        --chart-legend: #2c3e50;
        --chart-split: #ebedf0;
        --chart-tooltip-bg: #ffffff;
        --chart-tooltip-border: #cdd4dc;"""

# Dark 模式：在 --chart-text 后面插入
DARK_INSERT = """
        /* ECharts 图表专用色 */
        --chart-line-primary: #ff8c00;
        --chart-line-secondary: #4ecdc4;
        --chart-border: #2a2a4a;
        --chart-label: #a0a0b0;
        --chart-legend: #e8e8f0;
        --chart-split: #1a1a2e;
        --chart-tooltip-bg: #1a1a2e;
        --chart-tooltip-border: #2a2a4a;"""

# Light: --chart-text: #2c3e50; 后面插入
content = content.replace(
    '        --chart-text: #2c3e50;\n        /* 性价比胶囊金色 */',
    '        --chart-text: #2c3e50;' + LIGHT_INSERT + '\n        /* 性价比胶囊金色 */',
    1  # 只替换第一次（light 模式）
)

# Dark: --chart-text: #e0e0e0; 后面插入
content = content.replace(
    '        --chart-text: #e0e0e0;\n        /* 性价比胶囊金色 */',
    '        --chart-text: #e0e0e0;' + DARK_INSERT + '\n        /* 性价比胶囊金色 */',
    1  # 只替换第一次（dark 模式）
)

with open(FP, 'w', encoding='utf-8') as f:
    f.write(content)

print('[OK] BaseLayout.astro: ECharts CSS vars added (light + dark)')
