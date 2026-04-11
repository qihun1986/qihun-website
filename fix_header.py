import re

path = r"C:\Users\Administrator\Desktop\qihun-web\vue-project\src\components\BaseHeader.vue"

with open(path, "rb") as f:
    data = f.read()

before = data

# Find all corrupted </xxx> patterns: where ? (0x3F) precedes /tagname>
# Strategy: find all 0x3F bytes, check if followed by /xxxxx>
corruptions = []

# Known patterns to fix
fixes = [
    (b'<?\x2frouter-link>', b'</router-link>'),
    (b'<?\x2fspan>', b'</span>'),
    (b'<?\x2fbutton>', b'</button>'),
    (b'<?\x2fa>', b'</a>'),
]

for old, new in fixes:
    idx = data.find(old)
    if idx >= 0:
        print(f"Found '{old}' at position {idx}")
        data = data.replace(old, new)
        corruptions.append(old)

# Fix alt="text? class= -> alt="text" class=
# Find pattern: alt=" then text then ?(0x3F) then space+class=
# Use binary search for this specific pattern
alt_pattern = rb'alt="([^"]+)\x3f class="'
matches = list(re.finditer(alt_pattern, data))
if matches:
    for m in matches:
        old_val = m.group(0)
        text = m.group(1).decode('utf-8')
        new_val = f'alt="{text}" class="'.encode('utf-8')
        print(f"Fixing alt: '{old_val}' -> '{new_val}'")
        data = data.replace(old_val, new_val)

# Fix remaining standalone ? between Chinese chars followed by space or <
# Pattern: Chinese char (2-byte UTF-8) followed by 0x3F followed by space or <
# UTF-8 Chinese ranges: E4-E9 range for first byte
chi_fix = rb'([\xe4-\xe9][\x80-\xbf][\x80-\xbf])\x3f([\x20\x3c])'
mf = list(re.finditer(chi_fix, data))
print(f"Found {len(mf)} remaining '?' between Chinese chars")
for m in mf:
    old = m.group(0)
    ch = m.group(1).decode('utf-8')
    follow = m.group(2)
    new = (ch + ('<' if follow == 0x3c else ' ')).encode('utf-8')
    print(f"  Fix: '{old}' -> '{new}'")
    data = data.replace(old, new)

if data != before:
    with open(path, "wb") as f:
        f.write(data)
    print("Fixed!")
else:
    print("No changes needed")

# Verify key lines
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print("\nLines 1-25:")
for i, l in enumerate(lines[:25], 1):
    print(f"{i}: {l.rstrip()}")
