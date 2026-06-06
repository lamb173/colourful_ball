// 临时脚本：重写 trySpawnItem() 函数
const fs = require('fs');
const path = 'c:\\Users\\lamb\\WorkBuddy\\20260412222433\\game.js';

let code = fs.readFileSync(path, 'utf8');

// 新函数代码
const newFunction = `    function trySpawnItem(group) {
      // 加速/冰面轨道不生成道具，但计数器增加（保底机制）
      if (group.type === 4 || group.type === 5) {
        groupsSinceLastItem++;
        return;
      }
      // 基础概率（v20.20版本：长直8%，方形12%）
      const baseProb = group.type === 1 ? 0.08 : 0.12;
      // 保底递增：每多过一个group没生成道具，概率增加1.5%，封顶50%
      const prob = Math.min(baseProb + groupsSinceLastItem * 0.015, 0.5);
      if (Math.random() >= prob) {
        groupsSinceLastItem++;
        return;
      }
      groupsSinceLastItem = 0; // 生成成功，重置计数器
      
      // 决定生成哪种道具
      let type;
      
      if (gameMode === 'stages' && _currentStage) {
        // 闯关模式：按关卡解锁不同道具
        const stageId = _currentStage.id;
        
        // 根据关卡确定可生成的道具类型
        let allowedTypes = [];
        
        if (stageId <= 2) {
          // 第1-2关：只出现【复活太空舱】
          allowedTypes = [ITEM_TYPE.REVIVE];
        } else if (stageId === 3) {
          // 第3关：复活舱 + 飞行器
          allowedTypes = [ITEM_TYPE.REVIVE, ITEM_TYPE.FLIGHT_SUIT];
        } else if (stageId === 4) {
          // 第4关：复活舱 + 防滑外套
          allowedTypes = [ITEM_TYPE.REVIVE, ITEM_TYPE.ANTI_SLIP];
        } else if (stageId === 5) {
          // 第5关：复活舱 + 防风外套（无防滑外套）
          allowedTypes = [ITEM_TYPE.REVIVE, ITEM_TYPE.WIND_PROOF];
        } else if (stageId === 6) {
          // 第6关：复活舱 + 防滑外套（无防风外套）
          allowedTypes = [ITEM_TYPE.REVIVE, ITEM_TYPE.ANTI_SLIP];
        } else {
          // 第7-10关：四种道具均可出现
          allowedTypes = [ITEM_TYPE.REVIVE, ITEM_TYPE.ANTI_SLIP, ITEM_TYPE.WIND_PROOF, ITEM_TYPE.FLIGHT_SUIT];
        }
        
        // 检查飞行器是否已达到本关上限
        if (allowedTypes.includes(ITEM_TYPE.FLIGHT_SUIT)) {
          // 获取本关已生成的飞行器数量
          const flightSpawnedThisStage = localStorage.getItem('flightSpawnedStage_' + stageId) || 0;
          const flightLimit = stageId === 3 ? 1 : (stageId <= 7 ? 2 : 3);
          
          if (parseInt(flightSpawnedThisStage) >= flightLimit) {
            // 已达到上限，移除飞行器
            allowedTypes = allowedTypes.filter(t => t !== ITEM_TYPE.FLIGHT_SUIT);
          }
        }
        
        // 根据权重随机选择
        if (allowedTypes.length === 1) {
          type = allowedTypes[0];
        } else {
          // 均等概率随机选择
          const rand = Math.random();
          const idx = Math.floor(rand * allowedTypes.length);
          type = allowedTypes[idx];
        }
        
        // 如果选择了飞行器，增加本关计数
        if (type === ITEM_TYPE.FLIGHT_SUIT) {
          const key = 'flightSpawnedStage_' + stageId;
          const count = parseInt(localStorage.getItem(key) || '0') + 1;
          localStorage.setItem(key, count);
          console.log('[ITEM] Flight suit spawned in stage ' + stageId + ', count=' + count);
        }
        
      } else {
        // 无尽模式：四种道具均可出现
        const rand = Math.random();
        if (rand < 0.25) type = ITEM_TYPE.REVIVE;
        else if (rand < 0.5) type = ITEM_TYPE.ANTI_SLIP;
        else if (rand < 0.75) type = ITEM_TYPE.WIND_PROOF;
        else type = ITEM_TYPE.FLIGHT_SUIT;
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
        // 长直轨道：放在球当前x坐标处（球必经之路）
        x = ballX;
        z = group.landZ;
      } else {
        // 方形轨道：用与createTriple/DoublePlatform完全相同的公式计算x，保证在方块正中心
        const ck = currentBallColorKey || 'blue';
        const matchIdx = group.partColorKeys ? group.partColorKeys.indexOf(ck) : -1;
        const idx = matchIdx >= 0 ? matchIdx : 0;
        const totalW = group.type === 2 ? (SQ_W * 3 + SQ_GAP_X * 2) : (SQ_W * 2 + SQ_GAP_X);
        x = -totalW / 2 + SQ_W / 2 + idx * (SQ_W + SQ_GAP_X);
        z = group.landZ;
        console.log('[ITEM] Square spawn: type=' + group.type + ' ck=' + ck + ' idx=' + idx + ' x=' + x.toFixed(2) + ' z=' + z.toFixed(2) + ' partColorKeys=' + group.partColorKeys);
      }
      
      // 根据道具类型设置缩放
      if (type === ITEM_TYPE.FLIGHT_SUIT) {
        mesh.scale.set(1.8, 1.8, 1.8);
      } else if (type === ITEM_TYPE.WIND_PROOF) {
        mesh.scale.set(1.5, 1.5, 1.5);
      } else {
        mesh.scale.set(1.2, 1.2, 1.2);
      }
      
      mesh.position.set(x, PLAT_Y + PLAT_H / 2 + 1.2, z);
      mesh.userData = { itemType: type };
      scene.add(mesh);
      items.push(mesh);
      
      console.log('[ITEM] Spawned type=' + type + ' at x=' + x.toFixed(2) + ' z=' + z.toFixed(2) + ' stage=' + (_currentStage ? _currentStage.id : 'endless'));
    }`;

// 替换旧函数
const startMarker = '    function trySpawnItem(group) {';
const endMarker = '    })();';

const startIdx = code.indexOf(startMarker);
if (startIdx === -1) {
  console.log('ERROR: Could not find start of trySpawnItem');
  process.exit(1);
}

// 找到函数结束位置（下一个顶级函数或闭包结束）
let depth = 0;
let endIdx = -1;
let searchFrom = startIdx;

while (searchFrom < code.length) {
  const nextFunc = code.indexOf('    function ', searchFrom);
  const nextClosure = code.indexOf('    })();', searchFrom);
  
  if (nextFunc === -1 && nextClosure === -1) break;
  
  if (nextFunc !== -1 && (nextClosure === -1 || nextFunc < nextClosure)) {
    // 找到了下一个函数
    endIdx = nextFunc;
    break;
  } else {
    // 找到了闭包结束
    endIdx = nextClosure + '    })();'.length;
    break;
  }
}

if (endIdx === -1) {
  console.log('ERROR: Could not find end of trySpawnItem');
  process.exit(1);
}

// 替换
code = code.substring(0, startIdx) + newFunction + code.substring(endIdx);

fs.writeFileSync(path, code, 'utf8');
console.log('SUCCESS: trySpawnItem() rewritten successfully');
console.log('New function length: ' + newFunction.length + ' bytes');
