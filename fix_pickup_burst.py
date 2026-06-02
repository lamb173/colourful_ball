import re

with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 修复1: 在 triggerBurst 前插入 triggerPickupBurst 函数 ──
insert_pos = content.find('    function triggerBurst(pos, color) {')
if insert_pos == -1:
    print('[ERROR] triggerBurst 函数未找到')
else:
    new_func = """    // ── 道具拾取特效（不隐藏球，不触发 Game Over）──
    function triggerPickupBurst(pos, color) {
      pickupBurstActive = true;
      pickupBurstTimer  = 0;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const m = particleMeshes[i];
        m.position.copy(pos);
        m.visible = true;
        m.material.color.copy(color);
        m.material.opacity = 1;
        m.material.emissive = color.clone().multiplyScalar(0.4);
        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const speed = 2 + Math.random() * 5;  // 比死亡爆发速度慢
        particleVels[i].set(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed * 0.8 + 2,
          Math.cos(phi) * speed * 0.5
        );
        m.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0);
      }
    }

    function updatePickupBurst(dt) {
      if (!pickupBurstActive) return;
      pickupBurstTimer += dt;
      const progress = pickupBurstTimer / 0.8;  // 0.8秒结束
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const m = particleMeshes[i];
        if (!m.visible) continue;
        particleVels[i].y -= 12 * dt;
        m.position.addScaledVector(particleVels[i], dt);
        m.material.opacity = Math.max(0, 1 - progress * 1.2);
        if (m.material.opacity <= 0) m.visible = false;
      }
      if (progress >= 1) {
        pickupBurstActive = false;
      }
    }

"""
    content = content[:insert_pos] + new_func + content[insert_pos:]
    print('[FIX] 添加 triggerPickupBurst + updatePickupBurst')

# ── 修复2: 声明拾取爆发状态变量 ──
old_vars = '    let burstActive    = false;\n    let burstTimer     = 0;'
new_vars = '    let burstActive    = false;\n    let burstTimer     = 0;\n    let pickupBurstActive = false;\n    let pickupBurstTimer  = 0;'
if old_vars in content:
    content = content.replace(old_vars, new_vars, 1)
    print('[FIX] 添加 pickupBurstActive/pickupBurstTimer 变量')
else:
    print('[SKIP] 变量声明未找到')

# ── 修复3: animate() 里调用 updatePickupBurst ──
old_animate = '      updateBurst(dt);'
new_animate = '      updateBurst(dt);\n      updatePickupBurst(dt);'
if old_animate in content:
    content = content.replace(old_animate, new_animate, 1)
    print('[FIX] animate(): 添加 updatePickupBurst 调用')
else:
    print('[SKIP] animate 中的 updateBurst 调用未找到')

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('\n✅ 修复完成')
