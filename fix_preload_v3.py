#!/usr/bin/env python3
# 精确修复 game.js：删除重复的道具预加载代码
with open('c:/Users/lamb/WorkBuddy/20260412222433/game.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 删除 lines 1352-1385 (1-indexed -> 0-indexed: 1351-1384)
# 这是重复的道具预加载代码
print(f'[FIX] 原行数: {len(lines)}')
del lines[1351:1385]  # 删除 1352-1385 行
print(f'[FIX] 删除后行数: {len(lines)}')

# 检查 line 1214 (0-indexed: 1213) 是否有错误的 preloadItemModels() 调用
if len(lines) > 1213 and 'preloadItemModels()' in lines[1213]:
    print('[FIX] 删除 line 1214 的错误调用')
    del lines[1213]

with open('c:/Users/lamb/WorkBuddy/20260412222433/game.js', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('[FIX] 完成！')
