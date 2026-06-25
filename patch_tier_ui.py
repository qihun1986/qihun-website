#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CpuTierDashboard.vue UI优化补丁脚本"""

with open(r"C:\Users\Administrator\Desktop\qihun-site\src\components\CpuTierDashboard.vue", "r", encoding="utf-8") as f:
    content = f.read()

# ========== 第一部分：电脑端优化 ==========

# 1. 给天梯整体区域套 .tier-card 卡片外框 + 标题栏
old1 = (
    '    <!-- 游戏/多核 天梯图内容 -->\n'
    '    <template v-if="activeTab === \'game\' || activeTab === \'multi\'">\n'
    '      <!-- 桌面端散点图 -->\n'
    '      <div class="scatter-container"'
)
new1 = (
    '    <!-- 游戏/多核 天梯图内容 -->\n'
    '    <template v-if="activeTab === \'game\' || activeTab === \'multi\'">\n'
    '      <div class="mini-table-box tier-card">\n'
    '        <div class="mini-table-header">\n'
    '          <h3>{{ activeTab === \'game\' ? \'🏆 CPU游戏天梯图\' : \'⚡ CPU多核天梯图\' }}</h3>\n'
    '        </div>\n'
    '        <!-- 桌面端散点图 -->\n'
    '      <div class="scatter-container"'
)
if old1 in content:
    content = content.replace(old1, new1, 1)
    print("  [1] tier-card 外框 + 标题栏 → 成功")
else:
    print("  [1] tier-card 外框 → 未找到匹配，跳过")

# 1b. 在 </template> 前关闭 .tier-card 的 </div>
# 找到 legend-section 后面的 </template>
old1b = '      </div>\n    </template>'
new1b = '      </div>\n      </div>\n    </template>'
# 只替换 legend-section 后面的那个（用上下文区分）
old1b_ctx = '</div>\n      </div>\n    </template>'
if old1b_ctx in content:
    print("  [1b] 已存在关闭 div，跳过")
else:
    # 在 </template> 前加 </div>
    content = content.replace('      </div>\n    </template>', '      </div>\n      </div>\n    </template>', 1)
    print("  [1b] tier-card 关闭 div → 成功")

# 2. .cpu-dot 样式替换（完整块）
old2 = (
    '.cpu-dot {\n'
    '  position: absolute; width: 8px; height: 8px; background: #ffd700;\n'
    '  border-radius: 50%; transform: translate(-50%, -50%); cursor: pointer; z-index: 10;\n}'
)
new2 = (
    '.cpu-dot {\n'
    '  position: absolute;\n'
    '  width: 12px; /* 从 8px 放大到 12px */\n'
    '  height: 12px;\n'
    '  background: #ffd700;\n'
    '  border-radius: 50%;\n'
    '  transform: translate(-50%, -50%);\n'
    '  cursor: pointer;\n'
    '  z-index: 10;\n'
    '  box-shadow: 0 0 6px rgba(255,215,0,0.6);\n'
    '  transition: transform 0.15s, box-shadow 0.15s;\n'
    '}'
)
if old2 in content:
    content = content.replace(old2, new2, 1)
    print("  [2] .cpu-dot 样式 → 成功")
else:
    print("  [2] .cpu-dot 样式 → 未找到匹配，跳过")

# 2b. .cpu-dot::before 样式替换
old2b = (
    '.cpu-dot::before {\n'
    '  content: \'\'; position: absolute; left: -4px; top: -10px; width: 130px; height: 28px;\n'
    '  background: transparent; border-radius: 4px;\n'
    '}'
)
new2b = (
    '.cpu-dot::before {\n'
    '  content: \'\'; position: absolute; left: -6px; top: -12px; width: 130px; height: 30px;\n'
    '  background: transparent; border-radius: 4px;\n'
    '}'
)
if old2b in content:
    content = content.replace(old2b, new2b, 1)
    print("  [2b] .cpu-dot::before → 成功")
else:
    print("  [2b] .cpu-dot::before → 未找到匹配，跳过")

# 2c. .cpu-dot.hollow 样式替换
old2c = '.cpu-dot.hollow { background: transparent; border: 1.5px solid #ffd700; }'
new2c = '.cpu-dot.hollow { background: transparent; border: 2px solid #ffd700; /* 加粗边框 */\n  box-shadow: 0 0 4px rgba(255,215,0,0.4); }'
if old2c in content:
    content = content.replace(old2c, new2c, 1)
    print("  [2c] .cpu-dot.hollow → 成功")
else:
    print("  [2c] .cpu-dot.hollow → 未找到匹配，跳过")

# 3. .dot-label 样式替换
old3 = (
    '.dot-label { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: #e2e8f0; font-size: 0.75rem; white-space: nowrap; pointer-events: none; }'
)
new3 = (
    '.dot-label {\n'
    '  position: absolute;\n'
    '  left: 10px;\n'
    '  top: 50%;\n'
    '  transform: translateY(-50%);\n'
    '  color: #e2e8f0;\n'
    '  font-size: 0.75rem;\n'
    '  font-weight: 500;\n'
    '  white-space: nowrap;\n'
    '  pointer-events: none;\n'
    '  background: rgba(0,0,0,0.55); /* 新增半透明黑底 */\n'
    '  padding: 1px 6px;\n'
    '  border-radius: 3px;\n'
    '  line-height: 1.4;\n'
    '}'
)
if old3 in content:
    content = content.replace(old3, new3, 1)
    print("  [3] .dot-label 样式 → 成功")
else:
    print("  [3] .dot-label 样式 → 未找到匹配，跳过")

# 3b. 追加 .cpu-dot:hover 样式（在 .cpu-dot 块后面找位置插入）
hover_css = (
    '\n\n/* 散点图圆点悬停效果 */\n'
    '.cpu-dot:hover {\n'
    '  transform: translate(-50%, -50%) scale(2.2);\n'
    '  box-shadow: 0 0 14px rgba(255,215,0,1);\n'
    '  z-index: 25;\n'
    '}'
)
if '.cpu-dot:hover' not in content:
    # 在 .cpu-dot.hollow 后面插入
    insert_marker = '.cpu-dot.hollow { background: transparent; border: 2px solid #ffd700;'
    if insert_marker in content:
        # 找到 .cpu-dot.hollow 块的结束位置
        idx = content.index(insert_marker)
        idx = content.index('}', content.index('}', idx) + 1) + 1
        content = content[:idx] + hover_css + content[idx:]
        print("  [3b] .cpu-dot:hover → 成功插入")
    else:
        print("  [3b] .cpu-dot:hover → 插入失败（找不到插入点）")
else:
    print("  [3b] .cpu-dot:hover → 已存在，跳过")

# 4. .col-divider 样式替换
old4 = '.col-divider { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--border); opacity: 0.4; }'
new4 = '.col-divider { position: absolute; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.08); /* 稍微提亮 */\n  opacity: 1; }'
if old4 in content:
    content = content.replace(old4, new4, 1)
    print("  [4] .col-divider → 成功")
else:
    print("  [4] .col-divider → 未找到匹配，跳过")

# 4b. 在 scatter-plot 内添加性能分区底色
old4b = '<div class="scatter-plot" ref="scatterPlot">'
new4b = (
    '<div class="scatter-plot" ref="scatterPlot">\n'
    '          <!-- 性能分区底色 -->\n'
    '          <div class="perf-zone" style="top: 0%; height: 25%; background: rgba(255,215,0,0.02);"></div>\n'
    '          <div class="perf-zone" style="top: 25%; height: 25%; background: rgba(255,255,255,0.015);"></div>\n'
    '          <div class="perf-zone" style="top: 50%; height: 25%; background: rgba(255,215,0,0.02);"></div>\n'
    '          <div class="perf-zone" style="top: 75%; height: 25%; background: rgba(255,255,255,0.015);"></div>'
)
if old4b in content and 'perf-zone' not in content:
    content = content.replace(old4b, new4b, 1)
    print("  [4b] 性能分区底色 → 成功")
else:
    print("  [4b] 性能分区底色 → 已存在或找不到匹配，跳过")

# 4c. 追加 .perf-zone 样式
perf_zone_css = (
    '\n\n/* 性能分区底色 */\n'
    '.perf-zone {\n'
    '  position: absolute;\n'
    '  left: 0;\n'
    '  right: 0;\n'
    '  pointer-events: none;\n'
    '  z-index: 0;\n'
    '}'
)
if '.perf-zone' not in content:
    # 在 .col-divider 样式后面插入
    insert_idx = content.index('.col-divider {')
    insert_idx = content.index('}', content.index('}', insert_idx) + 1) + 1
    content = content[:insert_idx] + perf_zone_css + content[insert_idx:]
    print("  [4c] .perf-zone 样式 → 成功插入")
else:
    print("  [4c] .perf-zone 样式 → 已存在，跳过")

# 5. .benchmark-line 样式替换
old5 = '.benchmark-line { position: absolute; left: 0; right: 0; height: 1px; border-top: 1px dashed rgba(255,215,0,0.5); z-index: 2; }'
new5 = '.benchmark-line { position: absolute; left: 0; right: 0; height: 1px; border-top: 1px dashed rgba(255,215,0,0.6); /* 金色虚线，更明显 */\n  z-index: 2; }'
if old5 in content:
    content = content.replace(old5, new5, 1)
    print("  [5] .benchmark-line → 成功")
else:
    print("  [5] .benchmark-line → 未找到匹配，跳过")

# 5b. .benchmark-line-label 样式替换
old5b = '.benchmark-line-label { position: absolute; right: 8px; top: -14px; font-size: 0.7rem; color: var(--accent); background: var(--bg-secondary); padding: 0 4px; }'
new5b = '.benchmark-line-label { position: absolute; right: 8px; top: -14px; font-size: 0.7rem; color: var(--accent); background: var(--bg-secondary); /* 使用卡片底色作为文字背景 */\n  padding: 2px 6px; border-radius: 3px; font-weight: 600; }'
if old5b in content:
    content = content.replace(old5b, new5b, 1)
    print("  [5b] .benchmark-line-label → 成功")
else:
    print("  [5b] .benchmark-line-label → 未找到匹配，跳过")

# 7. .legend-section 样式替换
old7 = '.legend-section { margin-top: 1.5rem; padding: 1rem; background: rgba(255,215,0,0.05); border-radius: 8px; }'
new7 = '.legend-section { margin-top: 1.5rem; padding: 1rem; background: rgba(255,215,0,0.06); /* 对齐提示区底色 */\n  border-radius: 8px; border: 1px solid rgba(255,215,0,0.1); }'
if old7 in content:
    content = content.replace(old7, new7, 1)
    print("  [7] .legend-section → 成功")
else:
    print("  [7] .legend-section → 未找到匹配，跳过")

# 8. Tooltip 样式（替换现有或追加）
tooltip_css = (
    '\n\n/* Tooltip */\n'
    '.cpu-tooltip {\n'
    '  z-index: 1000;\n'
    '  background: var(--bg-secondary);\n'
    '  border: 1px solid var(--border);\n'
    '  border-radius: 8px;\n'
    '  padding: 0.5rem 0.75rem;\n'
    '  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);\n'
    '  pointer-events: none;\n'
    '  min-width: 140px;\n'
    '}\n'
    '.tooltip-title {\n'
    '  font-weight: 600;\n'
    '  color: var(--accent);\n'
    '  font-size: 0.8rem;\n'
    '  margin-bottom: 0.25rem;\n'
    '}\n'
    '.tooltip-percent {\n'
    '  font-size: 0.85rem;\n'
    '  color: var(--text-primary);\n'
    '  font-weight: 600;\n'
    '}\n'
    '.tooltip-estimated {\n'
    '  font-size: 0.7rem;\n'
    '  color: var(--text-secondary);\n'
    '  margin-top: 0.15rem;\n'
    '}'
)
if '.cpu-tooltip' not in content:
    # 在 </style> 前插入
    content = content.replace('</style>', tooltip_css + '\n</style>', 1)
    print("  [8] Tooltip 样式 → 成功插入")
else:
    print("  [8] Tooltip 样式 → 已存在，跳过")

# ========== 第二部分：手机端优化 ==========

# 1. 双列整体间距（在 @media 块中处理）
# 检查是否有 @media (max-width: 768px) 块
if '@media (max-width: 768px)' in content:
    # 在 @media 块中追加 .tier-mobile 等样式
    mobile_css = (
        '\n  .tier-mobile { padding: 0; }\n'
        '  .tier-2col { gap: 0; }\n'
        '  .tier-item { padding: 0.4rem 0.6rem; }\n'
        '  .tier-item:active { background: rgba(255,215,0,0.15); transform: scale(0.96); transition: transform 0.05s; }\n'
        '  .tier-pct { font-family: \'JetBrains Mono\', monospace; font-size: 0.85rem; color: var(--text-secondary); min-width: 40px; text-align: center; }\n'
    )
    # 找到 @media 块的结束位置（下一个非缩进的 } 或文件结束）
    # 简单处理：在 @media 块内的 .tier-mobile { display: block; } 后面插入
    insert_pos = content.find('.tier-mobile { display: block; }')
    if insert_pos > 0:
        insert_pos = content.index('}', insert_pos) + 1
        # 检查是否已插入
        if '.tier-mobile { padding: 0; }' not in content:
            content = content[:insert_pos] + mobile_css + content[insert_pos:]
            print("  [二.1-4] 手机端样式 → 成功插入")
        else:
            print("  [二.1-4] 手机端样式 → 已存在，跳过")
    else:
        print("  [二.1-4] 手机端样式 → 找不到插入点，跳过")
else:
    print("  [二.1-4] @media 块 → 未找到，跳过")

# 5. 移动端滚动条样式
scrollbar_css = (
    '\n\n/* 移动端滚动条统一 */\n'
    '.mobile-score-table::-webkit-scrollbar { width: 4px; height: 4px; }\n'
    '.mobile-score-table::-webkit-scrollbar-thumb { background: #3a3a5a; border-radius: 2px; }\n'
)
if 'mobile-score-table::-webkit-scrollbar' not in content:
    content = content.replace('</style>', scrollbar_css + '</style>', 1)
    print("  [二.5] 移动端滚动条 → 成功插入")
else:
    print("  [二.5] 移动端滚动条 → 已存在，跳过")

# ========== 第三部分：两端通用优化 ==========

# 4. 空状态提示
empty_html = (
    '\n        <div v-if="cpus.length === 0" class="empty">\n          暂无CPU数据，请稍后再试 😊\n        </div>\n'
)
# 在 <template v-if="activeTab === 'game' || activeTab === 'multi'"> 内的 tier-card 后面插入
# 实际上应该放在 tier-card 内部、散点图前面
if 'class="empty"' not in content:
    # 在 tier-card 标题栏后面插入
    insert_pos = content.find('<div class="mini-table-header">')
    if insert_pos > 0:
        insert_pos = content.index('</div>', insert_pos) + 6
        content = content[:insert_pos] + empty_html + content[insert_pos:]
        print("  [三.4] 空状态提示 → 成功插入")
    else:
        print("  [三.4] 空状态提示 → 找不到插入点，跳过")
else:
    print("  [三.4] 空状态提示 → 已存在，跳过")

# 写入文件
with open(r"C:\Users\Administrator\Desktop\qihun-site\src\components\CpuTierDashboard.vue", "w", encoding="utf-8") as f:
    f.write(content)

print("\n✅ 所有修改完成，文件已保存")
