#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""验证 CpuTierDashboard.vue 中 model_short 修改是否到位（ASCII输出）"""

with open(r"C:\Users\Administrator\Desktop\qihun-site\src\components\CpuTierDashboard.vue", "r", encoding="utf-8") as f:
    content = f.read()

checks = [
    ("1. displayLabel", "displayLabel: cpu.model_short"),
    ("2. searchDropdownItems label", "label: c.model_short"),
    ("3. mobileSearchResults label", "label: c.model_short"),
    ("4. chip-name (compare bar)", "cpu.model_short || formatCpuName(cpu.model)"),
    ("5. benchmarkCpu title", "benchmarkCpu?.model_short"),
    ("6a. tier-left model_short", "row.left.model_short"),
    ("6b. tier-right model_short", "row.right.model_short"),
    ("6c. tier-pct v-if left", 'v-if="row.left"'),
    ("6d. tier-pct v-if right", 'v-if="row.right"'),
    ("7. desktop score table", "{{ cpu.model }}"),
    ("9. result-name", "item.cpu.model_short"),
    ("10. chip-label", "cpu.model_short || formatCpuName(cpu.model)"),
    ("11. tooltip title", "label.cpu.model_short"),
]

print("=" * 60)
print("CpuTierDashboard.vue 验证结果：")
print("=" * 60)
all_ok = True
for name, pattern in checks:
    found = pattern in content
    status = "[OK]" if found else "[FAIL] NOT FOUND"
    if not found:
        all_ok = False
    print(f"  {status} {name}")

print()
if all_ok:
    print("[PASS] All 13 checks passed!")
else:
    print("[WARN] Above [FAIL] items need fixing")

# 检查 CpuTierDetailModal.vue
print("\n" + "=" * 60)
print("CpuTierDetailModal.vue (12a):")
print("=" * 60)
try:
    with open(r"C:\Users\Administrator\Desktop\qihun-site\src\components\CpuTierDetailModal.vue", "r", encoding="utf-8") as f:
        detail_content = f.read()
    pattern_12a = "cpu?.model_short || cpu?.model || ''"
    found_12a = pattern_12a in detail_content
    print(f"  {'[OK]' if found_12a else '[FAIL] NOT FOUND'} 12a. modal title model_short")
except Exception as e:
    print(f"  READ ERROR: {e}")

# 检查 CpuTierCompareModal.vue
print("\n" + "=" * 60)
print("CpuTierCompareModal.vue (12b):")
print("=" * 60)
try:
    with open(r"C:\Users\Administrator\Desktop\qihun-site\src\components\CpuTierCompareModal.vue", "r", encoding="utf-8") as f:
        compare_content = f.read()
    pattern_12b = "cpu.model_short || formatCpuName(cpu.model)"
    found_12b = pattern_12b in compare_content
    print(f"  {'[OK]' if found_12b else '[FAIL] NOT FOUND'} 12b. compare modal title model_short")
except Exception as e:
    print(f"  READ ERROR: {e}")
