#!/usr/bin/env python3
"""查找 ECharts 配置中的硬编码颜色"""
import os, re

BASE = r'C:\Users\Administrator\Desktop\qihun-site\src'

results = {}
for root, dirs, names in os.walk(BASE):
    for n in names:
        if not n.endswith(('.vue', '.js', '.ts')):
            continue
        fp = os.path.join(root, n)
        try:
            with open(fp, encoding='utf-8') as f:
                content = f.read()
            if 'echarts' not in content.lower():
                continue
            # 找所有颜色值
            hex_c = re.findall(r'#[0-9a-fA-F]{3,8}', content)
            rgba_c = re.findall(r'rgba?\([^)\'"]+\)', content)
            # 找 color: 'xxx' 模式
            str_c = re.findall(r'color\s*:\s*[\'"][^\'"]+[\'"]', content)
            all_c = list(set(hex_c + rgba_c + str_c))
            if all_c:
                rel = os.path.relpath(fp, BASE)
                results[rel] = all_c[:20]
        except Exception as e:
            pass

if results:
    for f in sorted(results):
        print(f'FILE: {f}')
        for c in sorted(results[f]):
            print(f'    {c}')
else:
    print('No ECharts hardcoded colors found')
