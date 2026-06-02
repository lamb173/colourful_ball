with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 添加拾取爆发状态变量（在 burstActive 附近）
old = '    let burstActive    = false;\n    let burstTimer     = 0;'
new = '    let burstActive    = false;\n    let burstTimer     = 0;\n    let pickupBurstActive = false;\n    let pickupBurstTimer  = 0;'
if old in content:
    content = content.replace(old, new, 1)
    print('[FIX] 添加 pickupBurstActive/pickupBurstTimer 变量')
else:
    print('[SKIP] 变量声明位置未找到，手动检查')

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)
print('完成')
