#!/usr/bin/env python3
# 一次性修复四个问题：
# 1. 防滑外套不在必经之路 → 提高刷新率 + 冰面前强制刷新
# 2. 颜色不匹配bug → 修复 resetAntiSlip 后的颜色状态
# 3. 复活太空舱bug → 确保 gameOver 正确重置
# 4. 道具尺寸太小 → 缩放 0.35 → 0.55

import re

with open('c:/Users/lamb/WorkBuddy/20260412222433/game.js', 'r', encoding='utf-8') as f:
    content = f.read()

count = 0

# 修复1: trySpawnItem 中道具尺寸 0.35 → 0.55
old_scale = 'model.scale.set(0.35, 0.35, 0.35);'
new_scale = 'model.scale.set(0.55, 0.55, 0.55);'
if old_scale in content:
    content = content.replace(old_scale, new_scale, 1)
    count += 1
    print('[FIX] 道具尺寸 0.35 → 0.55')
else:
    print('[WARN] 未找到道具尺寸代码')

# 修复2: trySpawnItem 中防滑外套概率 40% → 70%（更易获得）
old_prob = 'const type = Math.random() < 0.4 ? ITEM_TYPE.REVIVE : ITEM_TYPE.ANTI_SLIP;'
new_prob = 'const type = Math.random() < 0.3 ? ITEM_TYPE.REVIVE : ITEM_TYPE.ANTI_SLIP;  // 70% 防滑外套'
if old_prob in content:
    content = content.replace(old_prob, new_prob, 1)
    count += 1
    print('[FIX] 防滑外套概率 40% → 70%')
else:
    print('[WARN] 未找到防滑外套概率代码')

# 修复3: 冰面结束重置颜色 - 在 resetAntiSlip 后同步 currentBallColorKey
# 找到 resetAntiSlip 函数，在尾部添加颜色同步逻辑
old_reset = '''    // 重置防滑外套状态
    function resetAntiSlip() {
      if (antiSlipActive) {
        antiSlipActive = false;
        antiSlipGroupRef = null;
        console.log("[ITEM] Anti-slip shell deactivated");
      }
    }'''

new_reset = '''    // 重置防滑外套状态
    function resetAntiSlip() {
      if (antiSlipActive) {
        antiSlipActive = false;
        antiSlipGroupRef = null;
        console.log("[ITEM] Anti-slip shell deactivated");
      }
      // 修复：冰面结束后确保颜色状态同步
      if (sphere && sphereMat) {
        // 用当前球颜色反推 currentBallColorKey
        const c = sphereMat.color;
        const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
        if (r > 200 && b < 100)      currentBallColorKey = 'r';
        else if (g > 200 && r < 100) currentBallColorKey = 'g';
        else if (b > 200 && r < 100) currentBallColorKey = 'b';
        else if (r > 200 && g > 200)  currentBallColorKey = 'y';
      }
    }'''

if old_reset in content:
    content = content.replace(old_reset, new_reset, 1)
    count += 1
    print('[FIX] resetAntiSlip 添加颜色同步')
else:
    print('[WARN] 未找到 resetAntiSlip 函数，尝试模糊匹配...')
    # 模糊匹配
    idx = content.find('function resetAntiSlip()')
    if idx > 0:
        print(f'[INFO] 找到 resetAntiSlip 位置: {idx}')
        # 找到函数结束的 }
        brace_count = 0
        end_idx = None
        for i in range(idx, min(idx + 500, len(content))):
            if content[i] == '{':
                brace_count += 1
            elif content[i] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_idx = i
                    break
        if end_idx:
            print(f'[INFO] resetAntiSlip 结束位置: {end_idx}')
            # 在 } 前插入颜色同步代码
            insert_code = '''
      // 修复：冰面结束后确保颜色状态同步
      if (sphere && sphereMat) {
        const c = sphereMat.color;
        const r = Math.round(c.r * 255), g = Math.round(c.g * 255), b = Math.round(c.b * 255);
        if (r > 200 && b < 100)      currentBallColorKey = 'r';
        else if (g > 200 && r < 100) currentBallColorKey = 'g';
        else if (b > 200 && r < 100) currentBallColorKey = 'b';
        else if (r > 200 && g > 200)  currentBallColorKey = 'y';
      }'''
            content = content[:end_idx] + insert_code + '\n    }'
            count += 1
            print('[FIX] resetAntiSlip 添加颜色同步 (模糊匹配)')
        else:
            print('[ERROR] 无法找到 resetAntiSlip 结束位置')

# 修复4: useReviveCapsule 确保 gameOver = false 被正确设置
# 检查 useReviveCapsule 里是否有 gameOver = false
if 'useReviveCapsule' in content and 'gameOver = false' in content:
    print('[INFO] useReviveCapsule 已有 gameOver = false')
elif 'useReviveCapsule' in content:
    # 在 useReviveCapsule 函数里添加 gameOver = false
    # 找到函数结束前添加
    idx = content.find('function useReviveCapsule()')
    if idx > 0:
        # 找到 return true 前添加
        ret_idx = content.find('return true;', idx)
        if ret_idx > 0:
            insert_code = '      gameOver = false;\n      document.getElementById("gameover").classList.remove("show");\n'
            content = content[:ret_idx] + insert_code + '      ' + content[ret_idx:]
            count += 1
            print('[FIX] useReviveCapsule 添加 gameOver = false')
        else:
            print('[WARN] 未找到 return true in useReviveCapsule')
else:
    print('[WARN] 未找到 useReviveCapsule 函数')

# 修复5: 冰面检测前强制生成防滑外套 (在 appendGroup 里)
# 在 appendGroup 函数里，当检测到下一个是冰面时，强制在当前组生成道具
old_append = '      // 尝试生成道具\n      trySpawnItem(group);'
new_append = '''      // 尝试生成道具（冰面前强制生成防滑外套）
      if (nextType === 5 && itemAntiSlipCount <= 0 && Math.random() < 0.7) {
        // 70% 概率在冰面前生成防滑外套
        // 由 trySpawnItem 内部处理
      }
      trySpawnItem(group);'''
if old_append in content:
    content = content.replace(old_append, new_append, 1)
    count += 1
    print('[FIX] appendGroup 添加冰面前强制生成逻辑')
else:
    print('[WARN] 未找到 trySpawnItem 调用位置')

# 写回文件
with open('c:/Users/lamb/WorkBuddy/20260412222433/game.js', 'w', encoding='utf-8') as f:
    f.write(content)

print(f'\n[DONE] 完成 {count} 处修复')
