import re

p = r'c:/Users/lamb/WorkBuddy/20260412222433/game.js'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

count = 0

# ════════════════════════════════════════════════════
# 1. showSaturn() 函数：saturnGroup → saturnModel
# ════════════════════════════════════════════════════
old = '        if (!saturnGroup && !saturnLoadError) {'
new = '        if (!saturnModel && !saturnLoadError) {'
if old in c:
    c = c.replace(old, new)
    count += 1
    print('✅ showSaturn: saturnGroup → saturnModel (loader)')

old = '              saturnGroup = gltf.scene;\n'
new = '              saturnModel = gltf.scene;\n'
if old in c:
    c = c.replace(old, new)
    count += 1
    print('✅ showSaturn: saturnGroup = gltf.scene')

old = '              saturnGroup.scale.set(8, 8, 8);\n'
new = '              saturnModel.scale.set(saturnModelScale, saturnModelScale, saturnModelScale);\n'
if old in c:
    c = c.replace(old, new)
    count += 1
    print('✅ showSaturn: scale → saturnModelScale')

old = '              saturnGroup.position.set(0, 0, 0);\n'
new = '              saturnModel.position.set(0, 0, 0);\n'
if old in c:
    c = c.replace(old, new)
    count += 1
    print('✅ showSaturn: position.set')

old = '                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }\n              });\n              console.log(\'[SATURN] .glb model loaded\');\n              if (saturnInScene) scene.add(saturnGroup);'
new = '                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }\n              });\n              console.log(\'[SATURN] .glb model loaded\');\n              if (saturnInScene) scene.add(saturnModel);'
if old in c:
    c = c.replace(old, new)
    count += 1
    print('✅ showSaturn: scene.add(saturnGroup) → saturnModel')

old = '        if (saturnGroup && !saturnInScene) {\n          scene.add(saturnGroup);'
new = '        if (saturnModel && !saturnInScene) {\n          scene.add(saturnModel);'
if old in c:
    c = c.replace(old, new)
    count += 1
    print('✅ showSaturn: add saturnModel')

old = '        if (saturnInScene && saturnGroup) {\n          scene.remove(saturnGroup);'
new = '        if (saturnInScene && saturnModel) {\n          scene.remove(saturnModel);'
if old in c:
    c = c.replace(old, new)
    count += 1
    print('✅ hideSaturn: remove saturnModel')

# ════════════════════════════════════════════════════
# 2. animate() 中残留的 saturnGroup.position → saturnModel.position
# ════════════════════════════════════════════════════
old = '''        if (sphere) { saturnGroup.position.x = 14; saturnGroup.position.y = -3; saturnGroup.position.z = sphere.position.z + 55; }'''
new = '''        if (sphere) { saturnModel.position.x = 14; saturnModel.position.y = -3; saturnModel.position.z = sphere.position.z + 55; }'''
if old in c:
    c = c.replace(old, new)
    count += 1
    print('✅ animate(): saturnGroup.position → saturnModel.position')

# ════════════════════════════════════════════════════
# 3. 删除废弃代码 makeSaturnBodyTexture + createSaturnProcedural
# ════════════════════════════════════════════════════
# 找 makeSaturnBodyTexture 起始位置
idx1 = c.find('    // ─── 辅助：生成土星条纹纹理（Canvas 2D） ───')
if idx1 >= 0:
    # 找 createSaturnStarfield 的起始位置（废弃代码之后的有用代码）
    idx2 = c.find('    // ─── 土星专属星空（4000星，无尘土）──', idx1)
    if idx2 >= 0:
        # 删除 idx1 到 idx2 之间的内容（不含 idx2）
        c = c[:idx1] + '\n' + c[idx2:]
        count += 1
        print('✅ 已删除 makeSaturnBodyTexture + createSaturnProcedural（废弃代码）')
    else:
        print('❌ 未找到 createSaturnStarfield 标记，跳过删除')
else:
    print('ℹ️  未找到 makeSaturnBodyTexture（可能已删除）')

# ════════════════════════════════════════════════════
# 4. 清理土星尘土粒子相关变量（saturnDust*）— 第5关不再需要
#    保留星空（saturnStarfield）即可
# ════════════════════════════════════════════════════
dust_vars = [
    '    let saturnDustPositions  = null;\n',
    '    let saturnDustVelocities = null;\n',
    '    let saturnDustPhase     = null;\n',
    '    let saturnDustFreq      = null;\n',
    '    let saturnDustAmp       = null;\n',
    '    let saturnDustLife      = null;\n',
    '    let saturnDustMaxLife   = null;\n',
    '    let saturnDustMesh     = null;\n',
]
for v in dust_vars:
    if v in c:
        c = c.replace(v, '')
        count += 1
        print(f'✅ 已删除变量: {v.strip()}')

# ════════════════════════════════════════════════════
# 5. 删除 createSaturnStarfield 中的尘土粒子创建代码
#    （只保留星空 4000 颗星）
# ════════════════════════════════════════════════════
# 检查 createSaturnStarfield 是否还在（应该已被上面的删除操作移除）
idx_sf = c.find('    function createSaturnStarfield()')
if idx_sf >= 0:
    print('ℹ️  createSaturnStarfield() 还存在，检查是否有尘土代码...')
    # 找函数结束位置
    idx_end = c.find('\n    }\n', idx_sf + 100)
    if idx_end >= 0:
        func_body = c[idx_sf:idx_end+6]
        if 'DUST_COUNT' in func_body:
            print('⚠️  发现尘土代码，需要手动清理')
        else:
            print('✅ createSaturnStarfield() 无尘土代码')

# ════════════════════════════════════════════════════
# 保存
# ════════════════════════════════════════════════════
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)

print(f'\n✅ game.js 已保存，共 {count} 处修改')
print('  修复内容：')
print('  - showSaturn() 中 saturnGroup → saturnModel')
print('  - animate() 中 saturnGroup.position → saturnModel.position')
print('  - 删除 makeSaturnBodyTexture + createSaturnProcedural')
print('  - 删除 saturnDust* 变量')
