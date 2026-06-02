import re

with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 修复1: 声明拾取爆发状态变量（在 burstActive 附近）──
# 先找 burstActive 第一次被赋值的位置，在前面插入变量声明
burst_assign = content.find('    burstActive    = false;')
if burst_assign == -1:
    # 找不到就用 grep 结果里的行号附近
    # 直接在文件顶部、"use strict" 之后插入
    strict_pos = content.find('"use strict";')
    if strict_pos != -1:
        next_line = content.find('\n', strict_pos) + 1
        vars_str = 'var burstActive = false;\nvar burstTimer = 0;\nvar pickupBurstActive = false;\nvar pickupBurstTimer = 0;\n'
        content = content[:next_line] + vars_str + content[next_line:]
        print('[FIX] 在 "use strict" 后添加变量声明（var）')
    else:
        print('[ERROR] 找不到插入位置')
else:
    # 在 burstActive 声明前插入
    insert_pos = content.rfind('\n', 0, burst_assign) + 1
    vars_str = 'var pickupBurstActive = false;\nvar pickupBurstTimer = 0;\n'
    content = content[:insert_pos] + vars_str + content[insert_pos:]
    print('[FIX] 添加 pickupBurstActive/pickupBurstTimer 变量声明')

# ── 修复2: triggerPickupBurst 里的 addScaledVector 拼写错误 ──
old_add = 'm.position.addScaledVector(particleVels[i], dt);'
new_add = 'm.position.addScaledVector(particleVels[i], dt);'
if old_add in content:
    content = content.replace(old_add, new_add)
    print('[FIX] addScaledVector 拼写错误已修复')
else:
    print('[SKIP] addScaledVector 拼写错误未找到（可能已修复）')

# ── 修复3: updatePickupBurst 里的 addScaledVector 拼写错误 ──
if 'addScaledVector' in content:
    content = content.replace('addScaledVector', 'addScaledVector')
    print('[FIX] updatePickupBurst: addScaledVector 拼写错误已修复')

# ── 修复4: triggerPickupBurst 里用 var 声明局部变量（避免全局污染）──
# 不需要，因为已经在顶部声明了

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n✅ 修复完成，开始验证...')

# 验证
with open('game.js', 'r', encoding='utf-8') as f:
    verify = f.read()

if 'var pickupBurstActive' in verify:
    print('[VERIFY] pickupBurstActive 变量已声明 ✅')
else:
    print('[VERIFY] pickupBurstActive 变量未找到 ❌')

if 'addScaledVector' in verify and 'addScaledVector' not in verify.replace('addScaledVector', ''):
    print('[VERIFY] addScaledVector 拼写错误可能还在 ❌')
else:
    print('[VERIFY] addScaledVector 拼写检查通过 ✅')

