p = r'c:/Users/lamb/WorkBuddy/20260412222433/game.js'
with open(p, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'文件总行数: {len(lines)}')

# ════════════════════════════════════════════════════
# 1. 删除 makeSaturnBodyTexture 函数（行124附近）
# ════════════════════════════════════════════════════
start = None
for i, line in enumerate(lines):
    if 'function makeSaturnBodyTexture()' in line:
        start = i
        break

if start is not None:
    # 找到函数结束的 '}' 
    depth = 0
    end = None
    for i in range(start, len(lines)):
        depth += lines[i].count('{') - lines[i].count('}')
        if depth < 0:  # 函数结束
            end = i
            break
    if end is not None:
        print(f'  删除 makeSaturnBodyTexture: 行{start+1}~{end+1}')
        lines[start:end+1] = []
    else:
        print('❌ 未找到 makeSaturnBodyTexture 结束位置')
else:
    print('ℹ️  makeSaturnBodyTexture 未找到（可能已删除）')

# ════════════════════════════════════════════════════
# 2. 删除 createSaturnProcedural 函数
# ════════════════════════════════════════════════════
start = None
for i, line in enumerate(lines):
    if 'function createSaturnProcedural()' in line:
        start = i
        break

if start is not None:
    depth = 0
    end = None
    for i in range(start, len(lines)):
        depth += lines[i].count('{') - lines[i].count('}')
        if depth < 0:
            end = i
            break
    if end is not None:
        print(f'  删除 createSaturnProcedural: 行{start+1}~{end+1}')
        lines[start:end+1] = []
    else:
        print('❌ 未找到 createSaturnProcedural 结束位置')
else:
    print('ℹ️  createSaturnProcedural 未找到（可能已删除）')

# ════════════════════════════════════════════════════
# 3. 清理 createSaturnStarfield：删除尘土粒子代码，只保留星空
# ════════════════════════════════════════════════════
start = None
for i, line in enumerate(lines):
    if 'function createSaturnStarfield()' in line:
        start = i
        break

if start is not None:
    # 找到 DUST_COUNT 所在行，删除从 DUST_COUNT 到 saturnDustMesh = new THREE.Points 之后的部分
    # 只保留星空创建部分（STAR_COUNT 相关）
    dust_start = None
    dust_end = None
    for i in range(start, min(start+200, len(lines))):
        if 'const DUST_COUNT' in lines[i]:
            dust_start = i
        if dust_start is not None and 'saturnDustMesh = new THREE.Points' in lines[i]:
            # 找到这行之后的第一个 ';' 或行尾
            dust_end = i + 1  # 包含这一行
            # 再找 group.add(saturnDustMesh) 也删除
            for j in range(i+1, min(i+10, len(lines))):
                if 'group.add(saturnDustMesh)' in lines[j]:
                    dust_end = j + 1
                    break
            break
    
    if dust_start is not None and dust_end is not None:
        print(f'  删除 createSaturnStarfield 尘土代码: 行{dust_start+1}~{dust_end+1}')
        lines[dust_start:dust_end] = []
    elif dust_start is not None:
        print(f'  找到 DUST_COUNT 在行{dust_start+1}，但未找到结束位置')
    else:
        print('ℹ️  createSaturnStarfield 中未找到 DUST_COUNT（可能已清理）')
else:
    print('ℹ️  createSaturnStarfield 未找到')

# ════════════════════════════════════════════════════
# 4. 删除 animate() 中的尘土动画代码
# ════════════════════════════════════════════════════
dust_anim_start = None
for i, line in enumerate(lines):
    if 'if (starfieldInScene && saturnDustPositions && saturnDustPhase)' in line:
        dust_anim_start = i
        break

if dust_anim_start is not None:
    # 找到对应的 '}' 结束
    depth = 0
    end = None
    for i in range(dust_anim_start, len(lines)):
        depth += lines[i].count('{') - lines[i].count('}')
        if depth < 0:
            end = i
            break
    if end is not None:
        print(f'  删除 animate() 尘土动画: 行{dust_anim_start+1}~{end+1}')
        lines[dust_anim_start:end+1] = []
    else:
        print('❌ 未找到尘土动画结束位置')
else:
    print('ℹ️  animate() 中未找到尘土动画代码')

# ════════════════════════════════════════════════════
# 保存
# ════════════════════════════════════════════════════
with open(p, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print()
print(f'✅ game.js 已保存，当前行数: {len(lines)}')
print('  清理完成：')
print('  - makeSaturnBodyTexture() 已删除')
print('  - createSaturnProcedural() 已删除')
print('  - createSaturnStarfield() 尘土代码已删除')
print('  - animate() 尘土动画代码已删除')
