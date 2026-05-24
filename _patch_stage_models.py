import re

p = r'c:/Users/lamb/WorkBuddy/20260412222433/game.js'
with open(p, 'r', encoding='utf-8') as f:
    c = f.read()

# ══════════════════════════════════════════════════════
# 1. 变量声明区（在 saturnGroup 等变量附近）
# ══════════════════════════════════════════════════════
old_vars = '''    let saturnModel       = null;   // THREE.Group 从.glb加载的土星
    let saturnModelUrl   = 'assets/models/saturn_20260524.glb';
    let saturnModelScale = 8;
    let saturnStarfield  = null;   // THREE.Points 第5关专属星空（4000星，无尘土）
    let saturnInScene   = false;
    let starfieldInScene = false;
    let saturnLoadError  = false;'''

new_vars = '''    // ─── 第1关 地球轨道 ───
    let earthModel       = null;
    let earthModelUrl    = 'assets/models/earth_moon_20260524.glb';
    let earthModelScale  = 6;
    let earthInScene     = false;
    let earthLoadError   = false;
    // ─── 第2关 月球中转站 ───
    let moonBaseModel    = null;
    let moonBaseModelUrl = 'assets/models/moon_base_20260524.glb';
    let moonBaseModelScale = 7;
    let moonBaseInScene  = false;
    let moonBaseLoadError = false;
    // ─── 第5关 土星风暴 ───
    let saturnModel       = null;   // THREE.Group 从.glb加载的土星
    let saturnModelUrl    = 'assets/models/saturn_20260524.glb';
    let saturnModelScale  = 8;
    let saturnStarfield   = null;   // THREE.Points 第5关专属星空（4000星，无尘土）
    let saturnInScene    = false;
    let starfieldInScene = false;
    let saturnLoadError   = false;'''

if old_vars in c:
    c = c.replace(old_vars, new_vars)
    print('✅ 变量声明已更新（新增地球+月球）')
else:
    print('❌ 变量声明未找到，尝试模糊匹配...')
    # 尝试找 saturnModel 变量区域
    idx = c.find('let saturnModel')
    if idx >= 0:
        print(f'  找到 saturnModel 位置: {idx}')

# ══════════════════════════════════════════════════════
# 2. 在 showSaturn() 函数之前插入 showEarth() 和 showMoonBase()
# ══════════════════════════════════════════════════════
showSaturn_start = c.find('    function showSaturn()')
if showSaturn_start < 0:
    print('❌ 未找到 showSaturn() 函数')
else:
    # 在第95行附近插入新函数（showSaturn 之前）
    insert_pos = showSaturn_start
    
    new_funcs = '''
    // ─── 第1关 地球轨道 3D模型 ───
    function showEarth() {
      console.log("[EARTH] showEarth(), stage=", _currentStage ? _currentStage.id : null);
      try {
        if (!earthModel && !earthLoadError) {
          if (typeof THREE.GLTFLoader === 'undefined') {
            console.error("[EARTH] GLTFLoader not loaded!");
            earthLoadError = true;
            return;
          }
          const loader = new THREE.GLTFLoader();
          loader.load(
            earthModelUrl,
            (gltf) => {
              earthModel = gltf.scene;
              earthModel.scale.set(earthModelScale, earthModelScale, earthModelScale);
              earthModel.position.set(0, 0, 0);
              earthModel.traverse((child) => {
                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
              });
              console.log('[EARTH] .glb model loaded');
              if (earthInScene) scene.add(earthModel);
            },
            (xhr) => { if (xhr.total > 0) console.log('[EARTH] loading: ' + ((xhr.loaded/xhr.total)*100).toFixed(0) + '%'); },
            (err) => { console.error('[EARTH] .glb load error:', err); earthLoadError = true; }
          );
        }
        if (earthModel && !earthInScene) {
          scene.add(earthModel);
          earthInScene = true;
          console.log("[EARTH] model added to scene");
        }
      } catch(e) { console.error("[EARTH] showEarth ERROR:", e); }
    }
    function hideEarth() {
      console.log("[EARTH] hideEarth()");
      try {
        if (earthModel && earthInScene) { scene.remove(earthModel); earthInScene = false; }
      } catch(e) { console.error("[EARTH] hideEarth ERROR:", e); }
    }

    // ─── 第2关 月球中转站 3D模型 ───
    function showMoonBase() {
      console.log("[MOON] showMoonBase(), stage=", _currentStage ? _currentStage.id : null);
      try {
        if (!moonBaseModel && !moonBaseLoadError) {
          if (typeof THREE.GLTFLoader === 'undefined') {
            console.error("[MOON] GLTFLoader not loaded!");
            moonBaseLoadError = true;
            return;
          }
          const loader = new THREE.GLTFLoader();
          loader.load(
            moonBaseModelUrl,
            (gltf) => {
              moonBaseModel = gltf.scene;
              moonBaseModel.scale.set(moonBaseModelScale, moonBaseModelScale, moonBaseModelScale);
              moonBaseModel.position.set(0, 0, 0);
              moonBaseModel.traverse((child) => {
                if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
              });
              console.log('[MOON] .glb model loaded');
              if (moonBaseInScene) scene.add(moonBaseModel);
            },
            (xhr) => { if (xhr.total > 0) console.log('[MOON] loading: ' + ((xhr.loaded/xhr.total)*100).toFixed(0) + '%'); },
            (err) => { console.error('[MOON] .glb load error:', err); moonBaseLoadError = true; }
          );
        }
        if (moonBaseModel && !moonBaseInScene) {
          scene.add(moonBaseModel);
          moonBaseInScene = true;
          console.log("[MOON] model added to scene");
        }
      } catch(e) { console.error("[MOON] showMoonBase ERROR:", e); }
    }
    function hideMoonBase() {
      console.log("[MOON] hideMoonBase()");
      try {
        if (moonBaseModel && moonBaseInScene) { scene.remove(moonBaseModel); moonBaseInScene = false; }
      } catch(e) { console.error("[MOON] hideMoonBase ERROR:", e); }
    }

'''
    
    c = c[:insert_pos] + new_funcs + c[insert_pos:]
    print('✅ showEarth/showMoonBase/hideEarth/hideMoonBase 函数已插入')

# ══════════════════════════════════════════════════════
# 3. 修改 animate() 中的场景切换逻辑
#    把原有的 showSaturn()/hideSaturn() 判断改成 switch
# ══════════════════════════════════════════════════════
old_animate_logic = '''      // 土星3D模型（第5关 土星风暴 场景包围）
      if (gameMode === 'stages' && _currentStage && _currentStage.id === 5) {
        showSaturn();
      } else {
        hideSaturn();
      }'''

new_animate_logic = '''      // 关卡3D模型场景（根据 _currentStage.id 显示对应模型）
      if (gameMode === 'stages' && _currentStage) {
        const sid = _currentStage.id;
        // 隐藏非当前关卡的模型
        if (sid !== 1) hideEarth();
        if (sid !== 2) hideMoonBase();
        if (sid !== 5) hideSaturn();
        // 显示当前关卡模型
        if (sid === 1) showEarth();
        else if (sid === 2) showMoonBase();
        else if (sid === 5) showSaturn();
      } else {
        // 非闯关模式：隐藏所有
        hideEarth();
        hideMoonBase();
        hideSaturn();
      }'''

if old_animate_logic in c:
    c = c.replace(old_animate_logic, new_animate_logic)
    print('✅ animate() 场景切换逻辑已更新')
else:
    print('❌ animate() 旧逻辑未找到')
    idx = c.find('// 土星3D模型')
    if idx >= 0:
        print(f'  找到注释位置: {idx}')
        print('  上下文:', repr(c[idx:idx+100]))

# ══════════════════════════════════════════════════════
# 4. 修改 animate() 中的模型旋转/跟随逻辑
# ══════════════════════════════════════════════════════
# 找到土星旋转的代码，扩展为所有模型
old_rotate = '''      // 土星旋转动画（第5关 土星风暴 背景）
      if (saturnInScene && saturnGroup) {
        saturnGroup.rotation.y += 0.08;
        // 土星在球后方，作为背景'''

new_rotate = '''      // 关卡3D模型旋转动画 + 跟随球体
      // 第1关 地球
      if (earthInScene && earthModel) {
        earthModel.rotation.y += 0.003;
        if (sphere) { earthModel.position.x = 12; earthModel.position.y = -2; earthModel.position.z = sphere.position.z + 50; }
      }
      // 第2关 月球基地
      if (moonBaseInScene && moonBaseModel) {
        moonBaseModel.rotation.y += 0.005;
        if (sphere) { moonBaseModel.position.x = -10; moonBaseModel.position.y = -3; moonBaseModel.position.z = sphere.position.z + 45; }
      }
      // 第5关 土星
      if (saturnInScene && saturnModel) {
        saturnModel.rotation.y += 0.08;
        if (sphere) { saturnModel.position.x = 14; saturnModel.position.y = -3; saturnModel.position.z = sphere.position.z + 55; }
      }'''

if old_rotate in c:
    c = c.replace(old_rotate, new_rotate)
    print('✅ animate() 模型旋转/跟随逻辑已更新')
else:
    print('❌ 旋转逻辑未找到')
    idx = c.find('// 土星旋转动画')
    if idx >= 0:
        print(f'  找到注释位置: {idx}')

# ══════════════════════════════════════════════════════
# 5. 保存
# ══════════════════════════════════════════════════════
with open(p, 'w', encoding='utf-8') as f:
    f.write(c)
print()
print('✅ game.js 已保存')
print('  修改内容:')
print('  - 新增 earthModel/moonBaseModel 变量')
print('  - 新增 showEarth()/hideEarth()')
print('  - 新增 showMoonBase()/hideMoonBase()')
print('  - 修改 animate() 场景切换逻辑（支持关卡1/2/5）')
print('  - 修改 animate() 模型旋转/跟随逻辑')
