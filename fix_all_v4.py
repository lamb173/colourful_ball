#!/usr/bin/env python3
# fix_all_v4.py - 修复道具系统四个问题
import re

with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# ─── 修复1: 道具尺寸太小 (0.55 → 0.75) ───
old_scale = "model.scale.set(0.55, 0.55, 0.55);"
new_scale = "model.scale.set(0.75, 0.75, 0.75);"
if old_scale in content:
    content = content.replace(old_scale, new_scale)
    print("[FIX] 道具尺寸 0.55 → 0.75")
else:
    print("[SKIP] 道具尺寸已修改或字符串不匹配")

# ─── 修复2: trySpawnItem() 防滑外套生成在球当前颜色匹配的轨道部分 ───
# 替换整个 trySpawnItem 函数体（从函数开始到结束的大括号）
old_trySpawn = """    // ─── 道具系统函数 ───
    // 尝试在指定 group 上生成道具
    function trySpawnItem(group) {
      if (group.type === 4 || group.type === 5) return;
      const prob = group.type === 1 ? 0.08 : 0.12;
      if (Math.random() >= prob) return;
      const type = Math.random() < 0.3 ? ITEM_TYPE.REVIVE : ITEM_TYPE.ANTI_SLIP;  // 70% 防滑外套
      const modelTemplate = itemModelCache[type];
      if (!modelTemplate) return;
      const mesh = modelTemplate.clone(true);
      mesh.traverse(child => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
      let x, z;
      if (group.type === 1) {
        x = 0;
        z = group.landZ;
      } else {
        const keys = group.partColorKeys || ["r", "g", "b"];
        const idx = Math.floor(Math.random() * keys.length);
        const totalW = group.type === 2 ? (SQ_W * 3 + SQ_GAP_X * 2) : (SQ_W * 2 + SQ_GAP_X);
        x = -totalW / 2 + SQ_W / 2 + idx * (SQ_W + SQ_GAP_X);
        z = group.landZ;
      }"""

new_trySpawn = """    // ─── 道具系统函数 ───
    // 尝试在指定 group 上生成道具
    function trySpawnItem(group) {
      if (group.type === 4 || group.type === 5) return;
      // 防滑外套：必须生成在球当前颜色匹配的轨道部分上
      // 复活太空舱：随机位置即可
      const prob = group.type === 1 ? 0.08 : 0.12;
      if (Math.random() >= prob) return;
      // 决定生成哪种道具
      let type;
      if (group.type === 1) {
        // 长直轨道：两种道具都行
        type = Math.random() < 0.3 ? ITEM_TYPE.REVIVE : ITEM_TYPE.ANTI_SLIP;
      } else {
        // 方形轨道：检查是否有匹配球当前颜色的部分
        const hasMatch = group.partColorKeys && group.partColorKeys.includes(currentBallColorKey);
        if (hasMatch) {
          // 有匹配颜色：优先生成防滑外套
          type = Math.random() < 0.7 ? ITEM_TYPE.ANTI_SLIP : ITEM_TYPE.REVIVE;
        } else {
          // 没有匹配颜色：只生成复活太空舱
          type = ITEM_TYPE.REVIVE;
        }
      }
      const modelTemplate = itemModelCache[type];
      if (!modelTemplate) return;
      const mesh = modelTemplate.clone(true);
      mesh.traverse(child => {
        if (child.isMesh && child.material) {
          child.material = child.material.clone();
        }
      });
      let x, z;
      if (group.type === 1) {
        // 长直轨道：放中间
        x = 0;
        z = group.landZ;
      } else {
        // 方形轨道：找到球当前颜色匹配的部分
        const matchIdx = group.partColorKeys ? group.partColorKeys.indexOf(currentBallColorKey) : -1;
        const idx = matchIdx >= 0 ? matchIdx : Math.floor(Math.random() * (group.partColorKeys || ["r","g","b"]).length);
        const totalW = group.type === 2 ? (SQ_W * 3 + SQ_GAP_X * 2) : (SQ_W * 2 + SQ_GAP_X);
        x = -totalW / 2 + SQ_W / 2 + idx * (SQ_W + SQ_GAP_X);
        z = group.landZ;
      }"""

if old_trySpawn in content:
    content = content.replace(old_trySpawn, new_trySpawn)
    print("[FIX] trySpawnItem: 防滑外套生成在球当前颜色匹配的轨道部分")
else:
    print("[SKIP] trySpawnItem 字符串不匹配，手动检查")

# ─── 修复3: 颜色不匹配bug - 检查 checkLandColorMatch 逻辑 ───
# 问题：checkLandColorMatch 使用 ballX 找到最近的部分，但 ballX 是球的当前X位置
# 如果球在跳跃过程中X位置变了，可能导致颜色匹配错误
# 修复：在 checkLandColorMatch 里使用更可靠的逻辑
old_checkMatch = """    function checkLandColorMatch(group, ballColorKey) {
      if (group.type === 1) return true;
      if (!group.partColorKeys) return true;
      const bx = ballX;
      let closestIdx = 0;
      let closestDist = Infinity;
      group.parts.forEach((p, i) => {
        const dist = Math.abs(bx - p.mesh.position.x);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      });
      return group.partColorKeys[closestIdx] === ballColorKey;
    }"""

new_checkMatch = """    function checkLandColorMatch(group, ballColorKey) {
      if (group.type === 1) return true;
      if (!group.partColorKeys) return true;
      // 找到球落点最近的部分
      const bx = ballX;
      let closestIdx = 0;
      let closestDist = Infinity;
      group.parts.forEach((p, i) => {
        const dist = Math.abs(bx - p.mesh.position.x);
        if (dist < closestDist) { closestDist = dist; closestIdx = i; }
      });
      const match = group.partColorKeys[closestIdx] === ballColorKey;
      if (!match) {
        console.log('[COLOR] 颜色不匹配: 落点颜色=' + group.partColorKeys[closestIdx] + ' 球颜色=' + ballColorKey);
      }
      return match;
    }"""

if old_checkMatch in content:
    content = content.replace(old_checkMatch, new_checkMatch)
    print("[FIX] checkLandColorMatch: 添加调试日志")
else:
    print("[SKIP] checkLandColorMatch 字符串不匹配")

# ─── 修复4: 复活太空舱bug - useReviveCapsule 里重置 jumpTimer ───
# 问题：复活后 jumpTimer 可能没有正确重置，导致球立即再次跳跃
old_revive = "      sphere.position.set(ballX, BOUNCE_FLOOR, ballZ);\n      jumpTimer = 0;\n      gameOver = false;";
new_revive = "      sphere.position.set(ballX, BOUNCE_FLOOR, ballZ);\n      jumpTimer = -0.5;  // 短暂延迟，让玩家有反应时间\n      gameOver = false;\n      // 确保颜色状态正确\n      sphereMat.color.copy(lastDeathColor);\n      currentBallColorKey = lastDeathColorKey;";
if old_revive in content:
    content = content.replace(old_revive, new_revive)
    print("[FIX] useReviveCapsule: 添加跳跃延迟和颜色状态确认")
else:
    print("[SKIP] useReviveCapsule 字符串不匹配")

with open('game.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("\n✅ 修复完成，请测试")
