#!/usr/bin/env python3
"""替换 PriceChartModal.vue 和 GpuPriceChartModal.vue 的 ECharts 硬编码颜色
为 getComputedStyle 动态读取 CSS 变量
"""
import re, os

BASE = r'C:\Users\Administrator\Desktop\qihun-site\src\components'

def patch_render_chart(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    # 1. 在 renderChart 函数开头注入：读取 CSS 变量
    #    找 renderChart(history) { 或 renderChart(history) {\n
    css_var_reader = """
  // 从 CSS 变量读取颜色（支持浅色/深色自适应）
  const rootStyle = getComputedStyle(document.documentElement)
  const C = s => rootStyle.getPropertyValue(s).trim()
  const chartText    = C('--chart-text') || '#e0e0e0'
  const chartBorder  = C('--chart-border') || '#2a2a4a'
  const chartLabel   = C('--chart-label') || '#a0a0b0'
  const chartLegend  = C('--chart-legend') || '#e8e8f0'
  const chartSplit   = C('--chart-split') || '#1a1a2e'
  const chartTooltipBg    = C('--chart-tooltip-bg') || '#1a1a2e'
  const chartTooltipBorder = C('--chart-tooltip-border') || '#2a2a4a'
  const chartLinePrimary   = C('--chart-line-primary') || '#ff8c00'
  const chartLineSecondary = C('--chart-line-secondary') || '#4ecdc4'
"""

    # 在 renderChart(history) { 之后插入
    content = re.sub(
        r'(function renderChart\(history\)\s*\{)',
        r'\1' + css_var_reader,
        content,
        count=1
    )

    # 2. 替换 tooltip 里的硬编码
    content = re.sub(
        r"backgroundColor:\s*'#1a1a2e'",
        'backgroundColor: chartTooltipBg',
        content
    )
    content = re.sub(
        r"borderColor:\s*'#2a2a4a'",
        'borderColor: chartTooltipBorder',
        content
    )
    content = re.sub(
        r"textStyle:\s*\{\s*color:\s*'#e0e0e0'\s*\}",
        'textStyle: { color: chartText }',
        content
    )

    # 3. 替换 legend textStyle
    content = re.sub(
        r"textStyle:\s*\{\s*color:\s*'#e8e8f0',\s*fontSize:\s*13\s*\}",
        'textStyle: { color: chartLegend, fontSize: 13 }',
        content
    )

    # 4. 替换 xAxis / yAxis axisLine.lineStyle.color
    content = re.sub(
        r"lineStyle:\s*\{\s*color:\s*'#2a2a4a'\s*\}",
        'lineStyle: { color: chartBorder }',
        content
    )

    # 5. 替换 axisLabel.color
    content = re.sub(
        r"color:\s*'#a0a0b0'",
        'color: chartLabel',
        content
    )

    # 6. 替换 yAxis splitLine.lineStyle.color
    content = re.sub(
        r"splitLine:\s*\{\s*lineStyle:\s*\{\s*color:\s*'#1a1a2e'\s*\}\s*\}",
        'splitLine: { lineStyle: { color: chartSplit } }',
        content
    )

    # 7. 替换 series lineStyle / itemStyle color
    content = re.sub(
        r"color:\s*'#ff8c00'",
        'color: chartLinePrimary',
        content
    )
    content = re.sub(
        r"color:\s*'#4ecdc4'",
        'color: chartLineSecondary',
        content
    )

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True, 'patched'
    else:
        return False, 'no change'

for fname in ['PriceChartModal.vue', 'GpuPriceChartModal.vue']:
    fp = os.path.join(BASE, fname)
    if not os.path.exists(fp):
        print(f'[SKIP] {fname} not found')
        continue
    ok, msg = patch_render_chart(fp)
    status = '[OK]' if ok else '[CLEAN]'
    print(f'{status} {fname}: {msg}')
