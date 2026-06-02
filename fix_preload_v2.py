#!/usr/bin/env python3
# 修复 game.js：删除 preloadAllStageModels() 内的旧道具预加载代码，添加 preloadItemModels() 调用
import re

with open('c:/Users/lamb/WorkBuddy/20260412222433/game.js', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 找到 preloadAllStageModels 函数内的道具预加载代码范围
# 删除从 "      // ── 道具模型预加载 ──" 到 "      });" 的部分（在 `    }` 之前）
new_lines = []
i = 0
skip_until = -1
in_preload_func = False

for i, line in enumerate(lines):
    # 检测是否在 preloadAllStageModels 函数内
    if 'function preloadAllStageModels()' in line:
        in_preload_func = True
    if in_preload_func and line.strip() == '}' and i > 1196:
        # 函数结束，重置标志
        # 但先检查是否需要添加 preloadItemModels() 调用
        # 在函数结束前添加调用
        new_lines.append('      // 预加载道具模型\n')
        new_lines.append('      preloadItemModels();\n')
        new_lines.append(line)  # 添加函数结束的 }
        in_preload_func = False
        continue
    
    # 跳过旧道具预加载代码（在 preloadAllStageModels 内部）
    if in_preload_func and '// ── 道具模型预加载 ──' in line:
        # 开始跳过，直到遇到 `      });` 后跟 `    }`
        skip_until = i
        # 找到对应的结束位置
        brace_count = 0
        for j in range(i, min(i+50, len(lines))):
            if 'Object.keys(itemUrls).forEach' in lines[j]:
                brace_count = 1
            if brace_count > 0:
                if 'new THREE.GLTFLoader().load(' in lines[j]:
                    brace_count += 1
                if lines[j].strip() == '});' or (lines[j].strip() == '}' and brace_count == 1):
                    brace_count -= 1
                    if brace_count == 0:
                        skip_until = j
                        break
        continue
    
    if skip_until >= i:
        # 还在跳过范围内
        continue
    
    new_lines.append(line)

# 写回文件
with open('c:/Users/lamb/WorkBuddy/20260412222433/game.js', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'[FIX] 完成！原行数: {len(lines)}, 新行数: {len(new_lines)}')
print(f'[FIX] 删除了 {len(lines) - len(new_lines)} 行重复代码')
