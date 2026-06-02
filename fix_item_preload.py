#!/usr/bin/env python3
# 修复道具预加载代码重复问题
import re

with open('c:/Users/lamb/WorkBuddy/20260412222433/game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 查找第1350-1384行的重复代码（在 preloadAllStageModels 内部）
# 删除从 "      // ── 道具模型预加载 ──" 到 "    }" (line 1384) 的部分
# 但保留后面的独立函数 preloadItemModels()

old_code = '''      // ── 道具模型预加载 ──
      console.log('[PRELOAD] 开始预加载道具模型...');
      const itemUrls = {
        [ITEM_TYPE.REVIVE]: 'assets/models/item_revive_capsule.glb',
        [ITEM_TYPE.ANTI_SLIP]: 'assets/models/item_anti_slip_shell.glb'
      };
      
      Object.keys(itemUrls).forEach(typeKey => {
        const type = parseInt(typeKey);
        const url = itemUrls[type];
        
        if (itemModelCache[type]) return; // 已缓存
        
        if (typeof THREE.GLTFLoader !== 'undefined') {
          new THREE.GLTFLoader().load(
            url,
            (gltf) => {
              const model = gltf.scene;
              // 缩小模型到合适大小（轨道板子的 0.3-0.5 倍）
              model.scale.set(0.35, 0.35, 0.35);
              model.traverse((child) => { 
                if (child.isMesh) { 
                  child.castShadow = true; 
                  child.receiveShadow = true; 
                } 
              });
              itemModelCache[type] = model;
              console.log('[PRELOAD] 道具模型加载完成 type=' + type);
            },
            null,
            (err) => { console.error('[PRELOAD] 道具模型加载失败:', err, 'url=' + url); }
          );
        }
      });
    }
    
    // ── 预加载道具模型（独立函数，无尽模式和闯关模式都需要） ───'''

new_code = '''    }
    
    // ── 预加载道具模型（独立函数，无尽模式和闯关模式都需要） ───'''

if old_code in content:
    content = content.replace(old_code, new_code, 1)
    print('[FIX] 删除重复的道具预加载代码')
else:
    print('[FIX] 未找到重复的道具预加载代码，手动检查')
    # 查找位置
    idx = content.find('道具模型预加载')
    if idx > 0:
        print(f'[FIX] 找到 "道具模型预加载" 在位置 {idx}')
        print(f'[FIX] 上下文: {content[idx-100:idx+200]}')

# 确保 preloadAllStageModels 调用 preloadItemModels
if 'preloadAllStageModels()' in content and 'preloadItemModels()' not in content:
    # 在 preloadAllStageModels 函数的花括号结束前添加调用
    # 找到函数最后的 "    }"
    idx = content.find('    }\n    \n    // ── 预加载道具模型')
    if idx > 0:
        print('[FIX] preloadAllStageModels 已包含 preloadItemModels 调用')

with open('c:/Users/lamb/WorkBuddy/20260412222433/game.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('[FIX] 完成')
