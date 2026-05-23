    // v2026-05-23-2351 — 统一错误处理，不强制跳回欢迎页
    var _gameError = null;
    var _welcomeTimeoutId = null;
    var _errorShown = false;
    function showFatalError(msg) {
      if (_errorShown) return; _errorShown = true;
      console.error('[FATAL]', msg);
      // 创建独立错误覆盖层，不破坏现有页面结构
      var errDiv = document.createElement('div');
      errDiv.id = 'fatal-error';
      errDiv.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(5,0,10,0.97);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:\"Segoe UI\",\"PingFang SC\",sans-serif;';
      errDiv.innerHTML = '<h1 style="font-size:1.6rem;color:#ff6688;margin-bottom:0.5em;letter-spacing:0.06em;">⚠ 出错了</h1>'
        + '<p style="font-size:0.95rem;color:rgba(255,255,255,0.6);max-width:80vw;text-align:center;line-height:1.6;margin-bottom:2em;word-break:break-all;">' + msg + '</p>'
        + '<button id="fatal-retry" style="font-size:1.05rem;font-weight:700;color:#fff;background:linear-gradient(135deg,#6633cc,#cc3388);border:none;border-radius:12px;padding:12px 32px;cursor:pointer;letter-spacing:0.08em;">刷新页面 ↻</button>';
      document.body.appendChild(errDiv);
      document.getElementById('fatal-retry').addEventListener('click', function() { location.reload(); });
    }
    window.addEventListener('error', function(e) {
      _gameError = e.error || e.message;
      var msg = _gameError && _gameError.message ? _gameError.message : String(_gameError);
      console.error('[GAME]', msg);
      showFatalError(msg);
    });
    console.log('[GAME] Script starting, THREE available:', typeof THREE !== 'undefined');
    if (typeof THREE === 'undefined') {
      document.getElementById('welcome-page').querySelector('h1').textContent = '⚠ Three.js 加载失败，请检查网络';
      document.getElementById('welcome-page').style.background = 'rgba(50,0,0,0.95)';
      console.error('[FATAL] THREE not loaded');
      // 不 throw，让后续错误处理器接管
    }

    // ★ 欢迎页跳转 — 放在脚本最前面，保证无论后面代码怎么崩都能跳转
    (function setupWelcomeTransition() {
      var _moved = false;

      // 强制确保欢迎页可见（防止 CSS 权重问题）
      var wpForce = document.getElementById('welcome-page');
      if (wpForce) {
        wpForce.style.opacity = '1';
        wpForce.style.display = 'flex';
        console.log('[GAME] welcome-page forced visible');
      }

      function doGo() {
        if (_moved) return; _moved = true;
        console.log('[GAME] Welcome → Mode transition triggered');
        var wp = document.getElementById('welcome-page');
        var mp = document.getElementById('mode-page');
        if (!wp) { console.error('[GAME] welcome-page NOT found'); return; }
        if (!mp) { console.error('[GAME] mode-page NOT found'); return; }
        wp.classList.remove('active'); wp.classList.add('fade-out');
        setTimeout(function() {
          wp.style.display = 'none';
          mp.style.display = 'flex';
          mp.classList.remove('fade-out'); mp.classList.add('active');
          console.log('[GAME] Mode page should now be visible');
        }, 500);
      }
      // 3.2s 自动跳转
      _welcomeTimeoutId = setTimeout(doGo, 3200);
      // 点击任意位置跳转（绑定到 document，防止 welcome-page 被 canvas 遮挡）
      document.addEventListener('click', function handler() {
        console.log('[GAME] document clicked, calling doGo()');
        doGo();
        document.removeEventListener('click', handler);
      });
      console.log('[GAME] Welcome timeout + click registered');
    })();

    // ═══════════════════════════════════════════════════════
    //  基础场景
    // ═══════════════════════════════════════════════════════
    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x0a0a1a, 0.014);

    const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 600);
    camera.position.set(0, 4, -10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(innerWidth, innerHeight);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
    renderer.toneMapping       = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);
    renderer.domElement.style.position = 'fixed';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '1';
    renderer.domElement.style.display = 'block'; // 始终可见，菜单页透过 z-index 遮盖

    const CAM_OFFSET = new THREE.Vector3(0, 5.5, -13);

    // ═══════════════════════════════════════════════════════
    //  星空
    // ═══════════════════════════════════════════════════════
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(2500 * 3);
    for (let i = 0; i < starPos.length; i++) starPos[i] = (Math.random() - 0.5) * 400;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(new THREE.Points(starGeo,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.2, sizeAttenuation: true })));

    // ═══════════════════════════════════════════════════════
    //  颜色定义
    // ═══════════════════════════════════════════════════════
    const COLORS = {
      pink:   new THREE.Color(1.0, 0.35, 0.62),
      yellow: new THREE.Color(1.0, 0.82, 0.08),
      blue:   new THREE.Color(0.15, 0.42, 1.0),
    };
    const COLOR_KEYS = ['pink', 'yellow', 'blue'];

    // ═══════════════════════════════════════════════════════
    //  轨道系统
    // ═══════════════════════════════════════════════════════
    const PLAT_H   = 0.25;
    const PLAT_Y   = -1.2;
    const GROUP_GAP_BASE = 3.0;  // 最小间距
    const GROUP_GAP_VAR  = 2.5;  // 随机浮动量（实际间距 = BASE + random*VAR，即 3.0~5.5）

    const LONG_W = 8, LONG_D = 3.6;
    const SQ_W = 2.4, SQ_D = 2.4;
    const SQ_GAP_X = 1.2;

    // 类型感知间距：不同轨道类型使用不同的 Z 方向间隙
    function randomGap(type) {
      switch(type) {
        case 1: return 3.0 + Math.random() * 2.5;  // 长直 → 下一轨：3.0~5.5m（标准）
        case 2: // double 方形
        case 3: return 1.8 + Math.random() * 2.2;  // 方形 → 下一轨：1.8~4.0m（紧凑）
        case 4: return 3.5 + Math.random() * 3.0;  // 加速 → 下一轨：3.5~6.5m（略宽）
        case 5: return 5.0 + Math.random() * 3.5;  // 冰面 → 下一轨：5.0~8.5m（跨越）
        default: return 3.0 + Math.random() * 2.5;
      }
    }
    function longTotalZ()   { return LONG_D + randomGap(1); }  // 3.6 + 3.0~5.5 = 6.6~9.1
    function tripleTotalZ() { return SQ_D   + randomGap(3); }  // 2.4 + 1.8~4.0 = 4.2~6.4
    function doubleTotalZ() { return SQ_D   + randomGap(2); }  // 同上
    function iceTotalZ()    { return ICE_D  + randomGap(5); }  // 24.0 + 5.0~8.5 = 29~32.5
    function boostTotalZ()  { return LONG_D + randomGap(4); }  // 3.6 + 3.5~6.5 = 7.1~10.1

    // ── 向前箭头纹理（正方形方块上底面装饰）──
    const arrowCanvas = document.createElement('canvas');
    arrowCanvas.width = 128; arrowCanvas.height = 128;
    const actx = arrowCanvas.getContext('2d');
    actx.clearRect(0, 0, 128, 128);
    // 画一个白色向前箭头（canvas Y 向下，所以 Y 增大 = 前/-Z）
    actx.clearRect(0, 0, 128, 128);
    // 外层发光描边（模糊阴影）
    actx.save();
    actx.shadowColor = '#ffffff';
    actx.shadowBlur = 12;
    actx.strokeStyle = 'rgba(255,255,255,0.7)';
    actx.lineWidth = 4;
    actx.beginPath();
    actx.moveTo(64, 108);
    actx.lineTo(100, 63);
    actx.lineTo(76, 63);
    actx.lineTo(76, 20);
    actx.lineTo(52, 20);
    actx.lineTo(52, 63);
    actx.lineTo(28, 63);
    actx.closePath();
    actx.stroke(); // 触发 shadowBlur
    actx.restore();
    // 箭头填充
    actx.fillStyle = '#ffffff';
    actx.beginPath();
    actx.moveTo(64, 108);
    actx.lineTo(100, 63);
    actx.lineTo(76, 63);
    actx.lineTo(76, 20);
    actx.lineTo(52, 20);
    actx.lineTo(52, 63);
    actx.lineTo(28, 63);
    actx.closePath();
    actx.fill();
    // 白色描边
    actx.strokeStyle = '#ffffff';
    actx.lineWidth = 3;
    actx.beginPath();
    actx.moveTo(64, 108);
    actx.lineTo(100, 63);
    actx.lineTo(76, 63);
    actx.lineTo(76, 20);
    actx.lineTo(52, 20);
    actx.lineTo(52, 63);
    actx.lineTo(28, 63);
    actx.closePath();
    actx.stroke();

    const arrowTex = new THREE.CanvasTexture(arrowCanvas);

    function addArrowOverlay(platformPart) {
      // 底层：发光光晕（Additive 混合）
      const glowGeo = new THREE.PlaneGeometry(SQ_W * 0.7, SQ_D * 0.7);
      const glowMat = new THREE.MeshBasicMaterial({
        map: arrowTex,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
      });
      glowMat.toneMapped = false;
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.rotation.x = -Math.PI / 2;
      glowMesh.position.set(
        platformPart.mesh.position.x,
        PLAT_Y - PLAT_H / 2 + PLAT_H + 0.003,
        platformPart.mesh.position.z
      );
      scene.add(glowMesh);

      // 主层：箭头本体
      const overlayGeo = new THREE.PlaneGeometry(SQ_W * 0.6, SQ_D * 0.6);
      const overlayMat = new THREE.MeshBasicMaterial({
        map: arrowTex,
        transparent: true,
        depthWrite: false,
        side: THREE.FrontSide,
      });
      overlayMat.toneMapped = false;
      const overlay = new THREE.Mesh(overlayGeo, overlayMat);
      overlay.rotation.x = -Math.PI / 2;
      overlay.position.set(
        platformPart.mesh.position.x,
        PLAT_Y - PLAT_H / 2 + PLAT_H + 0.006,
        platformPart.mesh.position.z
      );
      scene.add(overlay);
      platformPart.arrowOverlay = overlay;
      platformPart.arrowGlow = glowMesh;
    }

    function createPlatform(x, y, z, w, d, color) {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.3 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, PLAT_H, d), mat);
      mesh.receiveShadow = true;
      mesh.position.set(x, y - PLAT_H / 2, z);
      scene.add(mesh);

      const edgeMat = new THREE.MeshBasicMaterial({
        color: color.clone().multiplyScalar(0.6), transparent: true, opacity: 0.9,
      });
      const hw = w / 2 - 0.02, hd = d / 2 - 0.02;
      const edges = [];
      [-hw, hw].forEach(ex => {
        const e = new THREE.Mesh(new THREE.BoxGeometry(0.06, PLAT_H + 0.03, d), edgeMat);
        e.position.set(x + ex, y - PLAT_H / 2 + 0.015, z);
        scene.add(e); edges.push(e);
      });
      [-hd, hd].forEach(ez => {
        const e = new THREE.Mesh(new THREE.BoxGeometry(w, PLAT_H + 0.03, 0.06), edgeMat);
        e.position.set(x, y - PLAT_H / 2 + 0.015, z + ez);
        scene.add(e); edges.push(e);
      });
      return { mesh, edges, colorKey: null, arrowOverlay: null };
    }

    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function createLongPlatform(startZ) {
      const colorKey = COLOR_KEYS[Math.floor(Math.random() * 3)];
      const color = COLORS[colorKey];
      const part = createPlatform(0, PLAT_Y, startZ + LONG_D / 2, LONG_W, LONG_D, color);
      part.colorKey = colorKey;
      return {
        type: 1, parts: [part], totalZ: longTotalZ(),
        landZ: startZ + LONG_D / 2, color: color.clone(), colorKey,
        partColorKeys: [colorKey],
      };
    }

    function createTriplePlatform(startZ) {
      const keys = shuffle(COLOR_KEYS);
      const parts = [];
      const totalW = SQ_W * 3 + SQ_GAP_X * 2;
      for (let i = 0; i < 3; i++) {
        const x = -totalW / 2 + SQ_W / 2 + i * (SQ_W + SQ_GAP_X);
        const p = createPlatform(x, PLAT_Y, startZ + SQ_D / 2, SQ_W, SQ_D, COLORS[keys[i]]);
        p.colorKey = keys[i];
        addArrowOverlay(p);
        parts.push(p);
      }
      return {
        type: 2, parts, totalZ: tripleTotalZ(),
        landZ: startZ + SQ_D / 2,
        partColorKeys: keys.slice(),
      };
    }

    function createDoublePlatform(startZ, forceColorKey) {
      let keys;
      if (forceColorKey) {
        const others = COLOR_KEYS.filter(k => k !== forceColorKey);
        keys = shuffle([forceColorKey, others[Math.floor(Math.random() * others.length)]]);
      } else {
        keys = shuffle(COLOR_KEYS).slice(0, 2);
      }
      const parts = [];
      const totalW = SQ_W * 2 + SQ_GAP_X;
      for (let i = 0; i < 2; i++) {
        const x = -totalW / 2 + SQ_W / 2 + i * (SQ_W + SQ_GAP_X);
        const p = createPlatform(x, PLAT_Y, startZ + SQ_D / 2, SQ_W, SQ_D, COLORS[keys[i]]);
        p.colorKey = keys[i];
        addArrowOverlay(p);
        parts.push(p);
      }
      return {
        type: 3, parts, totalZ: doubleTotalZ(),
        landZ: startZ + SQ_D / 2,
        partColorKeys: keys.slice(),
      };
    }

    // ── type4：加速轨道（白色发光，与长直轨道同尺寸）──
    function createBoostPlatform(startZ) {
      const geo = new THREE.BoxGeometry(LONG_W, PLAT_H, LONG_D);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.1,
        transparent: true,
        opacity: 0.92,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, PLAT_Y, startZ + LONG_D / 2);
      mesh.receiveShadow = true;
      scene.add(mesh);

      // 边框发光
      const edgesGeo = new THREE.EdgesGeometry(geo);
      const edgesMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
      const edges = new THREE.LineSegments(edgesGeo, edgesMat);
      mesh.add(edges);

      // 呼吸发光动画参数
      mesh.userData.boostGlow = true;
      mesh.userData.glowPhase = Math.random() * Math.PI * 2;

      return {
        type: 4,
        parts: [{ mesh, colorKey: null, edges: [edges] }],
        totalZ: boostTotalZ(),
        landZ: startZ + LONG_D / 2,
        color: new THREE.Color(0xffffff),
        colorKey: null,
        partColorKeys: [null],
        startZ,
      };
    }

    // ── 游戏模式（必须在 initGroups 之前声明，因为 appendGroup 引用它）──
    let gameMode = 'endless'; // 'endless' | 'stages'
    let _currentStage = null; // 当前闯关配置（STAGE_CONFIGS 元素）

    // ── 闯关模式：10 关星际穿越配置 ──
    const STAGE_CONFIGS = [
      { id:1,  name:'Earth Orbit',        nameCN:'地球轨道',     targetDist:213,  hasBoost:false, boostFreq:0,    hasIce:false, iceFreq:0,    hasWind:false, gapMul:1.0 },
      { id:2,  name:'Lunar Transit',      nameCN:'月球中转站',   targetDist:356,  hasBoost:true,  boostFreq:0.12, hasIce:false, iceFreq:0,    hasWind:false, gapMul:1.0 },
      { id:3,  name:'Mars Canyon',        nameCN:'火星峡谷',     targetDist:478,  hasBoost:true,  boostFreq:0.20, hasIce:false, iceFreq:0,    hasWind:false, gapMul:0.90 },
      { id:4,  name:'Jupiter Ice Ring',   nameCN:'木星冰环',     targetDist:591,  hasBoost:true,  boostFreq:0.08, hasIce:true,  iceFreq:0.18, hasWind:false, gapMul:1.0 },
      { id:5,  name:'Saturn Storm',       nameCN:'土星风暴',     targetDist:722,  hasBoost:true,  boostFreq:0.12, hasIce:false, iceFreq:0,    hasWind:true,  gapMul:1.0 },
      { id:6,  name:'Uranus Polar',       nameCN:'天王星极地',   targetDist:845,  hasBoost:true,  boostFreq:0.15, hasIce:true,  iceFreq:0.12, hasWind:false, gapMul:0.90 },
      { id:7,  name:'Neptune Abyss',      nameCN:'海王星深渊',   targetDist:983,  hasBoost:true,  boostFreq:0.18, hasIce:true,  iceFreq:0.15, hasWind:true,  gapMul:0.90 },
      { id:8,  name:'Pluto Dark Zone',    nameCN:'冥王星暗域',   targetDist:1134, hasBoost:true,  boostFreq:0.22, hasIce:true,  iceFreq:0.18, hasWind:true,  gapMul:0.85 },
      { id:9,  name:'Black Hole Horizon', nameCN:'黑洞视界',     targetDist:1283, hasBoost:true,  boostFreq:0.25, hasIce:true,  iceFreq:0.20, hasWind:true,  gapMul:0.85 },
      { id:10, name:'Beyond Singularity', nameCN:'奇点彼岸',     targetDist:1506, hasBoost:true,  boostFreq:0.28, hasIce:true,  iceFreq:0.22, hasWind:true,  gapMul:0.80 },
    ];

    // ── 闯关模式进度管理 ──
    const STAGE_PROGRESS_KEY = 'bounceGameStageProgress';
    let _stageProgress = (function() {
      try {
        var raw = localStorage.getItem(STAGE_PROGRESS_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch(e) { return null; }
    })();
    if (!_stageProgress || typeof _stageProgress.unlocked !== 'number') {
      _stageProgress = { unlocked: STAGE_CONFIGS.length, stars: {} };
    }
    // 测试阶段强制全解锁（覆盖旧 localStorage）
    _stageProgress.unlocked = STAGE_CONFIGS.length;
    function saveStageProgress() {
      localStorage.setItem(STAGE_PROGRESS_KEY, JSON.stringify(_stageProgress));
    }
    function isStageUnlocked(stageId) { return stageId <= _stageProgress.unlocked; }
    function getStageStars(stageId) { return _stageProgress.stars[String(stageId)] || 0; }
    function setStageStars(stageId, starCount) {
      var key = String(stageId);
      var current = _stageProgress.stars[key] || 0;
      if (starCount > current) { _stageProgress.stars[key] = starCount; }
      // 通关自动解锁下一关
      if (starCount >= 1 && stageId >= _stageProgress.unlocked && stageId < STAGE_CONFIGS.length) {
        _stageProgress.unlocked = stageId + 1;
      }
      saveStageProgress();
    }
    function getTotalStageStars() {
      var total = 0;
      for (var k in _stageProgress.stars) { total += _stageProgress.stars[k]; }
      return total;
    }

    // ── 冰霜段参数（type5）──
    const ICE_W = 2.5;                // 冰霜段宽度
    const ICE_D = 24.0;               // 长深度：24 米，滑行时间约 3 秒
    const ICE_SLIDE_SPEED = 8.0;      // 滑行前进速度（Z方向）
    const ICE_SLIDE_ACCEL = 5.0;      // 横向推力加速度 (m/s²)，足够强
    const ICE_ACCEL_INTERVAL = 0.25;  // 推力方向切换间隔：0.25s
    const ICE_FRICTION = 0.6;         // 冰面摩擦系数（很低，速度持续）
    const ICE_COLOR = new THREE.Color(0.10, 0.62, 0.95);  // 更饱和透亮的冰蓝
    const ICE_EMISSIVE = new THREE.Color(0.04, 0.30, 0.50);
    const ICE_HIGHLIGHT = new THREE.Color(0.50, 0.88, 1.0);
    const ICE_FROST_COUNT = 30;       // 霜花粒子数量
    const ICE_CRYSTAL_COUNT = 44;     // 每侧棱柱数量：22 根 × 2 侧 = 44

    // ═══════════════════════════════════════════════════════
    //  侧风段（Crosswind）—— 叠加在现有轨道上的大气效果
    // ═══════════════════════════════════════════════════════
    const WIND_ZONE_LEN_MIN = 50;     // 风区最小长度 (m)
    const WIND_ZONE_LEN_MAX = 80;     // 风区最大长度 (m)
    const WIND_ZONE_GAP_MIN = 200;    // 风区间最小间隔
    const WIND_ZONE_GAP_MAX = 400;    // 风区间最大间隔
    const WIND_FIRST_ZONE_AT = 120;   // 首个风区出现距离 (m)
    const WIND_ACCEL = 12.0;          // 基础风力加速度 (m/s²)
    const WIND_STRENGTH_MIN = 0.4;    // 最小风力系数
    const WIND_STRENGTH_MAX = 1.2;    // 最大风力系数
    const WIND_LINE_FACTOR = 12;      // 线条数 = strength × this


    // ═══════════════════════════════════════════════════════
    //  冰面程序化 Shader（GLSL 噪声冰裂纹 + 菲涅尔发光）
    // ═══════════════════════════════════════════════════════

    // 共用 3D 噪声函数（vertex + fragment 都不需要，只 fragment 用）
    const ICE_VERT = `
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vLocalPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vLocalPos = position;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `;

    const ICE_FRAG = `
      precision highp float;
      uniform float uTime;
      uniform vec3 uBaseColor;
      uniform vec3 uEmissive;
      uniform float uEmissiveIntensity;
      uniform float uFresnelPow;
      uniform float uCrackScale;
      uniform float uBubbleScale;
      uniform vec3 uCameraPos;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vLocalPos;

      // ── 3D hash & value noise ──
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise3D(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(mix(hash(i),               hash(i + vec3(1,0,0)), f.x),
              mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
          mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
              mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
          f.z);
      }

      // ── FBM（分形布朗运动）—— 多层噪声叠加，细节更丰富 ──
      float fbm(vec3 p) {
        float f = 0.0;
        f += 0.5000 * noise3D(p); p *= 2.02;
        f += 0.2500 * noise3D(p); p *= 2.03;
        f += 0.1250 * noise3D(p); p *= 2.01;
        f += 0.0625 * noise3D(p);
        return f;
      }

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(uCameraPos - vWorldPos);

        // ── Fresnel（核心：控制冰的体积感）──
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), uFresnelPow);
        float rim = pow(1.0 - max(dot(N, V), 0.0), 2.0);

        // ── 冰裂纹（FBM 多层细节 + 时间微移）──
        vec3 crackCoord = vWorldPos * uCrackScale + vec3(0.0, uTime * 0.02, uTime * 0.015);
        float crack = fbm(crackCoord);

        // ── 内部气泡（高频噪声 + smoothstep 取高值区域 → 明亮光点）──
        float b1 = noise3D(vWorldPos * uBubbleScale + vec3(uTime * 0.03, 0.0, uTime * 0.02));
        float b2 = noise3D(vWorldPos * uBubbleScale * 1.7 + vec3(0.0, uTime * 0.02, uTime * 0.04));
        float bubbles = smoothstep(0.55, 0.85, b1) * 0.4
                       + smoothstep(0.60, 0.90, b2) * 0.25;

        // ── 次表面散射（SSS）模拟：光从一侧射入另一侧透出 ──
        vec3 lightDir = normalize(vec3(-0.5, 1.0, 0.8));
        float sssWrap = max(dot(N, lightDir) * 0.5 + 0.5, 0.0);
        float sss = pow(sssWrap, 2.0) * 0.5;

        // ── Blinn-Phong 漫反射 + 高光 ──
        float diff = max(dot(N, lightDir), 0.0);
        vec3 H = normalize(lightDir + V);
        float spec = pow(max(dot(N, H), 0.0), 80.0);

        // ── 颜色组合：体积冰材质 ──
        vec3 deepIce    = vec3(0.03, 0.15, 0.32);   // 冰体深处：深蓝
        vec3 surfaceIce = uBaseColor;                  // 冰面表层
        vec3 brightIce  = vec3(0.18, 0.72, 1.0);     // 冰体透光：亮冰青

        // fresnel 决定"看进去多深" → 体积感
        vec3 baseColor = mix(deepIce, surfaceIce, 1.0 - fresnel);
        baseColor = mix(baseColor, brightIce, fresnel);

        // 裂纹高亮（光线沿裂缝折射）
        baseColor += crack * vec3(0.30, 0.75, 1.0) * 0.22;
        // 气泡发光点（内部散射小光源）
        baseColor += bubbles * vec3(0.4, 0.88, 1.0);
        // 次表面散射 → 整体偏青色透光
        baseColor += sss * vec3(0.15, 0.55, 0.75);
        // Fresnel 边缘光（冰棱角高亮）
        baseColor += fresnel * vec3(0.25, 0.90, 1.0) * 1.3;
        // Rim light（大范围柔光）
        baseColor += rim * vec3(0.20, 0.65, 1.0) * 0.6;
        // 漫反射调制
        baseColor *= 0.45 + diff * 0.75;
        // 镜面高光
        baseColor += vec3(0.92, 0.96, 1.0) * spec * 1.0;
        // 自发光底色
        baseColor += uEmissive * uEmissiveIntensity;

        // 底面稍暗
        float bottomFade = smoothstep(-0.3, 0.4, N.y);
        baseColor *= 0.55 + 0.45 * bottomFade;

        gl_FragColor = vec4(baseColor, 0.93);
      }
    `;

    /**
     * 创建冰面 ShaderMaterial
     * @param {object} opts - 覆盖默认值
     * @returns {THREE.ShaderMaterial}
     */
    function createIceShaderMat(opts) {
      const o = Object.assign({
        baseColor:    new THREE.Color(0.10, 0.62, 0.95),
        emissive:     new THREE.Color(0.04, 0.30, 0.50),
        emissiveInt:  0.35,
        fresnelPow:   4.0,
        crackScale:   12.0,
        bubbleScale:  25.0,
      }, opts);

      return new THREE.ShaderMaterial({
        uniforms: {
          uTime:            { value: 0 },
          uBaseColor:       { value: o.baseColor },
          uEmissive:        { value: o.emissive },
          uEmissiveIntensity: { value: o.emissiveInt },
          uFresnelPow:      { value: o.fresnelPow },
          uCrackScale:      { value: o.crackScale },
          uBubbleScale:     { value: o.bubbleScale },
          uCameraPos:       { value: new THREE.Vector3() },
        },
        vertexShader:   ICE_VERT,
        fragmentShader: ICE_FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: true,
      });
    }

    // 活跃冰面 shader 材质列表（每帧更新 uTime / uCameraPos）
    const activeIceMats = [];

    // ── type5：冰霜段（窄长冰面，球滑行不弹跳）──
    function createIcePlatform(startZ) {
      // 主体冰面 —— 程序化 shader 冰面
      const geo = new THREE.BoxGeometry(ICE_W, PLAT_H, ICE_D);
      const mat = createIceShaderMat({
        baseColor:   ICE_COLOR.clone(),
        emissive:    ICE_EMISSIVE.clone(),
        emissiveInt: 0.35,
        fresnelPow:  4.0,
        crackScale:  12.0,
        bubbleScale: 25.0,
      });
      activeIceMats.push(mat);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, PLAT_Y, startZ + ICE_D / 2);
      mesh.receiveShadow = true;
      scene.add(mesh);

      // 冰面边框：淡蓝色发光线
      const edgesGeo = new THREE.EdgesGeometry(geo);
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0x4addff, transparent: true, opacity: 0.7,
      });
      const edgesLine = new THREE.LineSegments(edgesGeo, edgesMat);
      mesh.add(edgesLine);





      // ── 冰棱柱（从轨道边缘斜插出去）──
      const crystals = [];
      const crystalBaseMat = createIceShaderMat({
        baseColor:   ICE_COLOR.clone(),
        emissive:    ICE_EMISSIVE.clone(),
        emissiveInt: 0.50,       // 棱柱更亮
        fresnelPow:  3.0,        // 菲涅尔更强
        crackScale:  18.0,       // 更细的裂纹
        bubbleScale: 30.0,
      });
      activeIceMats.push(crystalBaseMat);
      const hw = ICE_W / 2;
      const zMin = startZ + 0.3;
      const zMax = startZ + ICE_D - 0.3;
      const PER_SIDE = ICE_CRYSTAL_COUNT / 2; // 每侧 22 根

      // 两侧各连续铺 PER_SIDE 根
      [-1, 1].forEach(side => {
        for (let i = 0; i < PER_SIDE; i++) {
          // 沿 Z 均匀分布 + 随机偏移，保证连续不断
          const frac = (i + Math.random()) / PER_SIDE;
          const cz = zMin + (zMax - zMin) * frac;

          // 高度：0.5~2.2，更高更壮观
          const h = 0.5 + Math.random() * 1.7;
          // 底面半径：0.10~0.30，明显粗壮
          const rBase = 0.10 + Math.random() * 0.20;
          // 顶端半径：底座的 0.1~0.75 倍（尖塔到粗柱都有）
          const rTop = rBase * (0.1 + Math.random() * 0.65);

          // 边数 5~8，形状多样
          const segments = 5 + Math.floor(Math.random() * 4);
          const crystalGeo = new THREE.CylinderGeometry(rTop, rBase, h, segments);
          const crystal = new THREE.Mesh(crystalGeo, crystalBaseMat);

          // 位置：底座根部埋进轨道侧面（负 offset = 嵌入轨道），棱柱"从轨道长出"
          const embedX = -rBase * 0.5 + Math.random() * 0.15; // 根部嵌入轨道侧面
          const baseX = side * (hw - embedX);
          const baseY = PLAT_Y + PLAT_H / 2 - 0.05;          // 略高于轨道上表面
          crystal.position.set(baseX, baseY + h * 0.5, cz);

          // 倾斜：多轴随机，主要向外斜插
          // Z 轴：向外倾斜 15°~50°（比之前更大，更有斜插感）
          crystal.rotation.z = side * (15 + Math.random() * 35) * (Math.PI / 180);
          // X 轴（前后倾倒）：±0°~20°
          crystal.rotation.x = (Math.random() - 0.5) * 40 * (Math.PI / 180);
          // Y 轴自转
          crystal.rotation.y = Math.random() * Math.PI * 2;

          crystal.userData.phase = Math.random() * Math.PI * 2;
          crystal.userData.speed = 0.5 + Math.random() * 1.5;

          scene.add(crystal);
          crystals.push(crystal);
        }
      });

      // 霜花粒子（小光点漂浮在冰面上方）
      const frostParticles = [];
      const frostColors = [
        new THREE.Color(0.5, 0.88, 1.0),
        new THREE.Color(0.35, 0.78, 0.95),
        new THREE.Color(0.25, 0.70, 0.90),
      ];
      for (let i = 0; i < ICE_FROST_COUNT; i++) {
        const fGeo = new THREE.SphereGeometry(0.03 + Math.random() * 0.05, 5, 5);
        const fMat = new THREE.MeshBasicMaterial({
          color: frostColors[Math.floor(Math.random() * frostColors.length)],
          transparent: true, opacity: 0.5 + Math.random() * 0.4,
        });
        const fMesh = new THREE.Mesh(fGeo, fMat);
        fMesh.position.set(
          (Math.random() - 0.5) * ICE_W * 0.85,
          PLAT_Y + PLAT_H / 2 + 0.08 + Math.random() * 0.35,
          startZ + Math.random() * ICE_D
        );
        fMesh.userData.baseY = fMesh.position.y;
        fMesh.userData.floatSpeed = 0.4 + Math.random() * 1.6;
        fMesh.userData.floatPhase = Math.random() * Math.PI * 2;
        scene.add(fMesh);
        frostParticles.push(fMesh);
      }

      // 动画参数
      mesh.userData.iceGlow = true;
      mesh.userData.glowPhase = Math.random() * Math.PI * 2;

      return {
        type: 5,
        parts: [{ mesh, colorKey: null, edges: [edgesLine] }],
        crystals,
        frostParticles,
        iceMat: mat,              // 主体 shader 材质（动画更新用）
        crystalMat: crystalBaseMat, // 棱柱 shader 材质
        totalZ: iceTotalZ(),
        landZ: startZ + ICE_D * 0.1,  // 落点在前端 10%，让球有 ~22m 可滑
        color: ICE_COLOR.clone(),
        colorKey: null,
        partColorKeys: [null],
        startZ,
      };
    }

    // 更新霜花粒子漂浮动画（每帧调用）
    function updateFrostParticles(t) {
      groups.forEach(g => {
        if (g.type !== 5 || !g.frostParticles) return;
        g.frostParticles.forEach(f => {
          f.position.y = f.userData.baseY + Math.sin(t * f.userData.floatSpeed + f.userData.floatPhase) * 0.12;
        });
      });
    }

    // ═══════════════════════════════════════════════════════
    //  平台管理：滚动生成
    //  颜色连通性保证规则（核心）：
    //    从长直轨道 A 到长直轨道 B 之间的所有 type 3 两块方形，
    //    必须包含长直轨道 A 的颜色。
    //
    //    实现方式：每个 type 3 在生成时记录它所属段的颜色（segColorKey）。
    //    段颜色在 appendGroup 内部维护：生成长直轨道时更新段颜色，
    //    后续 type 3 使用该段颜色。
    //    这样即使 ensureGroupsAhead 提前生成远处的平台，
    //    段颜色也是按空间顺序正确传播的。
    // ═══════════════════════════════════════════════════════
    const MIN_GROUPS = 15;
    const TRAIL_KEEP = 40;
    const groups = [];
    let windZones = [];
    let windNextZoneAt = WIND_FIRST_ZONE_AT;

    let activeColorKey = 'blue'; // 段安全色，由 appendGroup 内部更新

    // ── 渐进难度状态变量（无尽模式）──
    let nextPathCheckpoint = 900;
    let pathChoiceActive = false;
    let currentPathStyle = 1;
    let currentPhase = 0;
    let phaseIceCount = 0;
    let phaseWindCount = 0;
    let totalBoostGenerated = 0;
    let lastBoostZ = -999;
    let lastIceEndZ = -999;
    let lastWindEndZ = -999;

    // ── 确定性预规划：每个 900m 段预先确定冰/风的确切位置 ──
    let plannedIcePositions = [];   // sorted ascending Z
    let plannedWindPositions = [];  // sorted ascending Z

    // ── 渐进难度：累计距离 → 阶段编号（0-6）──
    function getCurrentPhase(z) {
      if (z < 600)  return 0;
      if (z < 1200) return 1;
      if (z < 1800) return 2;
      if (z < 2400) return 3;
      if (z < 3000) return 4;
      if (z < 3600) return 5;
      return 6;
    }

    // ── 渐进难度：阶段 → 规则 ──
    function getPhaseRules(phase) {
      // boostCap: 累计加速轨道上限 (999=无限)
      // allowIce/wind: 是否允许该元素出现
      // maxIce/maxWind: 每 900m 段内上限
      // iceBuf/windBuf: 距离上一个加速轨道的最小间隔
      switch (phase) {
        case 0: // P0:  0- 600m  新手引导：仅 3 个加速轨道
          return { boostCap: 3, allowIce: false, maxIce: 0, iceBuf: 0, allowWind: false, maxWind: 0, windBuf: 0 };
        case 1: // P1:  600-1200m 引入单个冰霜段
          return { boostCap: 999, allowIce: true, maxIce: 1, iceBuf: 100, allowWind: false, maxWind: 0, windBuf: 0 };
        case 2: // P2: 1200-1800m 引入单个侧风段
          return { boostCap: 999, allowIce: true, maxIce: 1, iceBuf: 150, allowWind: true, maxWind: 1, windBuf: 150 };
        case 3: // P3: 1800-2400m 多个冰霜段
          return { boostCap: 999, allowIce: true, maxIce: 3, iceBuf: 150, allowWind: true, maxWind: 1, windBuf: 150 };
        case 4: // P4: 2400-3000m 多个侧风段
          return { boostCap: 999, allowIce: true, maxIce: 3, iceBuf: 150, allowWind: true, maxWind: 3, windBuf: 150 };
        case 5: // P5: 3000-3600m 冰+风组合出现
          return { boostCap: 999, allowIce: true, maxIce: 3, iceBuf: 150, allowWind: true, maxWind: 3, windBuf: 150 };
        case 6: // P6: 3600m+    全随机混合（无缓冲区限制）
          return { boostCap: 999, allowIce: true, maxIce: 999, iceBuf: 0, allowWind: true, maxWind: 999, windBuf: 0 };
        default:
          return { boostCap: 3, allowIce: false, maxIce: 0, iceBuf: 0, allowWind: false, maxWind: 0, windBuf: 0 };
      }
    }
    // ── 确定性预规划：每个 900m 段开始时，预先计算冰/风的确切 Z 位置 ──
    function planSegmentSpecials(segmentStartZ) {
      plannedIcePositions = [];
      plannedWindPositions = [];
      if (gameMode !== 'endless') return;
      const segmentEndZ = segmentStartZ + 900;

      // 收集段内的相位边界（600, 1200, 1800...）
      const boundaries = [];
      for (let b = 600; b <= segmentEndZ; b += 600) {
        if (b > segmentStartZ && b < segmentEndZ) boundaries.push(b);
      }

      // 按子区间分别规划（每个子区间内相位一致，配额按长度比例分配）
      let subStart = segmentStartZ;
      const subEnds = [...boundaries, segmentEndZ];
      for (const subEnd of subEnds) {
        const subRules = getPhaseRules(getCurrentPhase(subStart + 1));
        const subLen = subEnd - subStart;

        // 规划冰霜段（配额按子区间长度 / 900 比例）
        if (subRules.allowIce && subRules.maxIce > 0) {
          const subCount = Math.max(1, Math.round(subRules.maxIce * subLen / 900));
          const availStart = Math.max(subStart + Math.max(subRules.iceBuf, 40), segmentStartZ + 40);
          const availEnd = Math.min(subEnd - ICE_D - 10, segmentEndZ - ICE_D - 10);
          if (availEnd > availStart && subCount > 0) {
            const range = availEnd - availStart;
            for (let i = 0; i < subCount; i++) {
              const baseZ = availStart + (range * (i + 0.5) / subCount);
              const jitter = (range / subCount) * 0.25;
              const z = baseZ + (Math.random() - 0.5) * jitter * 2;
              plannedIcePositions.push(Math.max(availStart, Math.min(availEnd, z)));
            }
          }
        }

        // 规划侧风段
        if (subRules.allowWind && subRules.maxWind > 0) {
          const subCount = Math.max(1, Math.round(subRules.maxWind * subLen / 900));
          const availStart = Math.max(subStart + Math.max(subRules.windBuf, 40), segmentStartZ + 40);
          const availEnd = Math.min(subEnd - 50, segmentEndZ - 50);
          if (availEnd > availStart && subCount > 0) {
            const range = availEnd - availStart;
            for (let i = 0; i < subCount; i++) {
              const baseZ = availStart + (range * (i + 0.5) / subCount);
              const jitter = (range / subCount) * 0.25;
              const z = baseZ + (Math.random() - 0.5) * jitter * 2;
              plannedWindPositions.push(Math.max(availStart, Math.min(availEnd, z)));
            }
          }
        }

        subStart = subEnd;
      }

      plannedIcePositions.sort((a, b) => a - b);
      plannedWindPositions.sort((a, b) => a - b);
    }

    function appendGroup() {
      let z = 0;
      if (groups.length > 0) {
        const last = groups[groups.length - 1];
        z = last.startZ + last.totalZ;
      }

      const r = Math.random();
      let group;
      const lg = groups.length > 0 ? groups[groups.length - 1] : null;

      if (gameMode === 'stages') {
        // ── 闯关模式：关卡配置驱动 ──
        const sc = _currentStage || {};
        const boostProb = sc.hasBoost ? sc.boostFreq : 0;
        const iceProb = sc.hasIce ? sc.iceFreq : 0;
        const canBoost = boostProb > 0 && lg && lg.type !== 4 && lg.type !== 5 && r < boostProb;
        const canIce = !canBoost && iceProb > 0 && lg && lg.type !== 4 && lg.type !== 5 && r < iceProb;
        if (canBoost) {
          group = createBoostPlatform(z);
        } else if (canIce) {
          group = createIcePlatform(z);
        } else if (r < 0.33) {
          group = createLongPlatform(z);
          activeColorKey = group.colorKey;
        } else if (r < 0.66) {
          group = createTriplePlatform(z);
        } else {
          group = createDoublePlatform(z, activeColorKey);
        }
      } else {
        // ── 无尽模式：渐进难度 + 路径风格 ──
        const rules = getPhaseRules(getCurrentPhase(z));
        const distFromBoost = z - lastBoostZ;

        // 加速轨道：受 boostCap 限制
        const boostOk = lg && lg.type !== 4 && lg.type !== 5
                        && totalBoostGenerated < rules.boostCap
                        && r < 0.12;

        // 冰霜段：概率触发 + 确定性预规划兜底
        let iceOk = false;
        if (rules.allowIce && !boostOk && lg && lg.type !== 4 && lg.type !== 5
            && distFromBoost >= rules.iceBuf && phaseIceCount < rules.maxIce) {
          // 概率触发（自然随机）
          if (r < 0.18) iceOk = true;
          // 确定性兜底：当前 Z 已越过计划位置，强制生成
          if (!iceOk) {
            while (plannedIcePositions.length > 0 && z >= plannedIcePositions[0]) {
              if (distFromBoost >= rules.iceBuf && phaseIceCount < rules.maxIce) {
                iceOk = true;
                plannedIcePositions.shift();
                break;
              } else if (distFromBoost < rules.iceBuf) {
                // 加速轨道挡住了计划位置，推迟
                plannedIcePositions[0] = lastBoostZ + rules.iceBuf + 15;
                break;
              } else {
                plannedIcePositions.shift(); // quota 满了，丢弃计划
              }
            }
          }
        }

        if (boostOk) {
          group = createBoostPlatform(z);
          totalBoostGenerated++;
          lastBoostZ = z;
        } else if (iceOk) {
          group = createIcePlatform(z);
          phaseIceCount++;
          lastIceEndZ = z + ICE_D;
        } else {
          // 普通轨道：路径风格影响比例（0=宽广多长直, 1=均衡, 2=精炼多方块）
          const longThresh = currentPathStyle === 0 ? 0.55 : (currentPathStyle === 2 ? 0.15 : 0.33);
          const tripleThresh = longThresh + (currentPathStyle === 0 ? 0.25 : (currentPathStyle === 2 ? 0.45 : 0.33));
          if (r < longThresh) {
            group = createLongPlatform(z);
            activeColorKey = group.colorKey;
          } else if (r < tripleThresh) {
            group = createTriplePlatform(z);
          } else {
            group = createDoublePlatform(z, activeColorKey);
          }
        }
      }

      group.startZ = z;
      groups.push(group);

      // 闯关模式：应用间距乘数（gapMul < 1.0 → 平台更紧凑 → 难度更高）
      if (_currentStage && _currentStage.gapMul && _currentStage.gapMul !== 1.0) {
        group.totalZ = group.totalZ * _currentStage.gapMul;
      }
    }

    // ═══════════════════════════════════════════════════════
    //  侧风段 — 风线视觉系统
    // ═══════════════════════════════════════════════════════
    function createWindLines(startZ, zoneLen, direction, lineCount) {
      const group = new THREE.Group();
      const segs = 20;
      for (let i = 0; i < lineCount; i++) {
        const z = startZ + (i / Math.max(1, lineCount - 1)) * zoneLen + (Math.random() - 0.5) * 3;
        const yBase = -1.2 + Math.random() * 3.8;
        const xStart = direction * (8 + Math.random() * 7);
        const xEnd = direction * (-4 + Math.random() * -5);
        const positions = [];
        for (let j = 0; j <= segs; j++) {
          const t = j / segs;
          const x = xStart + (xEnd - xStart) * t;
          const y = yBase + Math.sin(t * Math.PI * 2.5 + i * 0.7) * 1.2;
          const waveZ = z + Math.cos(t * Math.PI * 1.8 + i * 0.5) * 0.8;
          positions.push(x, y, waveZ);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        const alpha = 0.50 + Math.random() * 0.35;
        const mat = new THREE.LineBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: alpha,
          depthWrite: false
        });
        const line = new THREE.Line(geo, mat);
        line.userData = {
          baseY: yBase, baseZ: z,
          phase: Math.random() * Math.PI * 2,
          driftSpeed: 1.5 + Math.random() * 5.0,  // 每条线漂移速度不同
          driftOffset: 0
        };
        group.add(line);
      }
      scene.add(group);
      return group;
    }

    function generateWindZone(atZ) {
      // ── 无尽模式：阶段规则阀门（P0 禁止、上限检查、缓冲区检查）──
      if (gameMode === 'endless') {
        const rules = getPhaseRules(getCurrentPhase(atZ));
        if (!rules.allowWind || phaseWindCount >= rules.maxWind) {
          windNextZoneAt = atZ + 60 + Math.random() * 120;
          return;
        }
        if (atZ - lastBoostZ < rules.windBuf) {
          windNextZoneAt = lastBoostZ + rules.windBuf + 40 + Math.random() * 120;
          return;
        }
      }

      const zoneLen = WIND_ZONE_LEN_MIN + Math.random() * (WIND_ZONE_LEN_MAX - WIND_ZONE_LEN_MIN);
      const direction = Math.random() < 0.5 ? -1 : 1;
      const strength = WIND_STRENGTH_MIN + Math.random() * (WIND_STRENGTH_MAX - WIND_STRENGTH_MIN);
      const lineCount = Math.round(strength * WIND_LINE_FACTOR);
      const zone = {
        startZ: atZ,
        endZ: atZ + zoneLen,
        direction, strength, lineCount,
        lines: createWindLines(atZ, zoneLen, direction, lineCount)
      };
      windZones.push(zone);
      // 确保下一个风区起点在球前方足够远处
      windNextZoneAt = zone.endZ + WIND_ZONE_GAP_MIN + Math.random() * (WIND_ZONE_GAP_MAX - WIND_ZONE_GAP_MIN);
      if (windNextZoneAt <= ballZ + 20) {
        windNextZoneAt = ballZ + 20 + WIND_ZONE_GAP_MIN + Math.random() * (WIND_ZONE_GAP_MAX - WIND_ZONE_GAP_MIN);
      }
      // 记录风区结束位置 + 侧风计数
      lastWindEndZ = zone.endZ;
      phaseWindCount++;
    }

    // ═══════════════════════════════════════════════════════
    //  雷电段 — 厚发光 ribbon 几何体 + 闪电生成
    // ═══════════════════════════════════════════════════════

    // 沿路径点生成可变宽度的三角形条带（ribbon）

    function removeOldGroups() {
      // 从头部删除球后方太远的平台（始终保留至少 MIN_GROUPS 个）
      let removedCount = 0;
      while (groups.length > MIN_GROUPS && groups[0] && groups[0].startZ + groups[0].totalZ < ballZ - TRAIL_KEEP) {
        const grp = groups.shift();
        grp.parts.forEach(p => {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          if (p.arrowOverlay) {
            scene.remove(p.arrowOverlay);
            p.arrowOverlay.geometry.dispose();
            p.arrowOverlay.material.dispose();
          }
          if (p.arrowGlow) {
            scene.remove(p.arrowGlow);
            p.arrowGlow.geometry.dispose();
            p.arrowGlow.material.dispose();
          }
          p.edges.forEach(e => {
            scene.remove(e); e.geometry.dispose(); e.material.dispose();
          });
        });
        // type5 冰霜段：清理额外资源
        if (grp.crystals) {
          grp.crystals.forEach(c => {
            scene.remove(c); c.geometry.dispose();
            // 不 dispose material —— crystals 共享 grp.crystalMat，统一在后面处理
          });
        }
        if (grp.frostParticles) {
          grp.frostParticles.forEach(f => { scene.remove(f); f.geometry.dispose(); f.material.dispose(); });
        }
        // 从活跃冰材质列表移除并 dispose
        if (grp.iceMat) {
          const idx1 = activeIceMats.indexOf(grp.iceMat);
          if (idx1 !== -1) activeIceMats.splice(idx1, 1);
          grp.iceMat.dispose();
        }
        if (grp.crystalMat) {
          const idx2 = activeIceMats.indexOf(grp.crystalMat);
          if (idx2 !== -1) activeIceMats.splice(idx2, 1);
          grp.crystalMat.dispose();
        }
        removedCount++;
      }
      // shift 导致数组索引前移，同步 currentGroupIdx
      if (removedCount > 0) {
        currentGroupIdx = Math.max(0, currentGroupIdx - removedCount);
      }

      // 清理已过期的侧风区（球后方太远的风区）
      while (windZones.length > 0 && windZones[0].endZ < ballZ - TRAIL_KEEP) {
        const zone = windZones.shift();
        if (zone.lines) {
          scene.remove(zone.lines);
          zone.lines.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) child.material.dispose();
          });
        }
      }

    }

    function ensureGroupsAhead() {
      // 三分路选择期间暂停生成
      if (pathChoiceActive) return;
      // 确保前方始终有 MIN_GROUPS + 5 个平台，留余量让 removeOldGroups 能工作
      const target = MIN_GROUPS + 5;
      while (groups.length < target) {
        appendGroup();
      }
    }

    function initGroups() {
      // 清空
      groups.forEach(grp => {
        grp.parts.forEach(p => {
          scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          p.mesh.material.dispose();
          if (p.arrowOverlay) {
            scene.remove(p.arrowOverlay);
            p.arrowOverlay.geometry.dispose();
            p.arrowOverlay.material.dispose();
          }
          if (p.arrowGlow) {
            scene.remove(p.arrowGlow);
            p.arrowGlow.geometry.dispose();
            p.arrowGlow.material.dispose();
          }
          p.edges.forEach(e => {
            scene.remove(e); e.geometry.dispose(); e.material.dispose();
          });
        });
        // type5 冰霜段：清理额外资源
        if (grp.crystals) {
          grp.crystals.forEach(c => {
            scene.remove(c); c.geometry.dispose();
          });
        }
        if (grp.frostParticles) {
          grp.frostParticles.forEach(f => { scene.remove(f); f.geometry.dispose(); f.material.dispose(); });
        }
        // 从活跃冰材质列表移除并 dispose
        if (grp.iceMat) {
          const idx1 = activeIceMats.indexOf(grp.iceMat);
          if (idx1 !== -1) activeIceMats.splice(idx1, 1);
          grp.iceMat.dispose();
        }
        if (grp.crystalMat) {
          const idx2 = activeIceMats.indexOf(grp.crystalMat);
          if (idx2 !== -1) activeIceMats.splice(idx2, 1);
          grp.crystalMat.dispose();
        }
      });
      groups.length = 0;
      activeColorKey = 'blue';

      // 清空侧风区
      windZones.forEach(z => {
        if (z.lines) {
          scene.remove(z.lines);
          z.lines.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
          });
        }
      });
      windZones = [];
      windNextZoneAt = WIND_FIRST_ZONE_AT;

      // ── 重置渐进难度状态（无尽模式）──
      nextPathCheckpoint = 900;
      pathChoiceActive = false;
      currentPathStyle = 1;
      currentPhase = 0;
      phaseIceCount = 0;
      phaseWindCount = 0;
      totalBoostGenerated = 0;
      lastBoostZ = -999;
      lastIceEndZ = -999;
      lastWindEndZ = -999;

      // ── 确定性地预规划本段冰/风位置 ──
      planSegmentSpecials(0);

      // 第一组强制长直轨道
      const first = createLongPlatform(0);
      first.startZ = 0;
      groups.push(first);
      activeColorKey = first.colorKey;

      // 后续随机生成
      while (groups.length < MIN_GROUPS) {
        try {
          appendGroup();
        } catch(e) {
          console.error('[GAME] appendGroup #' + groups.length + ' FAILED:', e.message, e.stack);
          break; // 出错就停，不再继续尝试
        }
      }
    }
    // ═══════════════════════════════════════════════════════
    //  球体
    // ═══════════════════════════════════════════════════════
    const sphereGeo = new THREE.SphereGeometry(1, 96, 96);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.5, 0.7, 1.0),
      specular: new THREE.Color(0.6, 0.6, 0.6),
      shininess: 80,
      transparent: true,
      opacity: 1.0,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.castShadow = true;
    scene.add(sphere);

    sphere.add(new THREE.Mesh(
      new THREE.SphereGeometry(1.002, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0x88ccff, wireframe: true, transparent: true, opacity: 0.05 })
    ));

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.45, 0.012, 16, 120),
      new THREE.MeshBasicMaterial({ color: 0x44aaff, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);

    // ── 护盾光环 ──
    const shieldRingGeo = new THREE.TorusGeometry(1.55, 0.035, 16, 64);
    const shieldRingMat = new THREE.MeshBasicMaterial({
      color: 0x50a0ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const shieldRing = new THREE.Mesh(shieldRingGeo, shieldRingMat);
    shieldRing.rotation.x = Math.PI / 2;
    shieldRing.renderOrder = 999;
    scene.add(shieldRing);

    const shadowCircle = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthWrite: false })
    );
    shadowCircle.rotation.x = -Math.PI / 2;
    shadowCircle.position.y = PLAT_Y + 0.01;
    scene.add(shadowCircle);

    // ═══════════════════════════════════════════════════════
    //  灯光
    // ═══════════════════════════════════════════════════════
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    scene.add(mainLight);
    scene.add(mainLight.target);

    const fillLight = new THREE.PointLight(0x4466ff, 2.5, 20);
    scene.add(fillLight);
    const backLight = new THREE.PointLight(0xff8844, 1.8, 16);
    scene.add(backLight);
    scene.add(new THREE.AmbientLight(0x223366, 0.8));

    // ═══════════════════════════════════════════════════════
    //  运动参数
    // ═══════════════════════════════════════════════════════
    const BALL_RADIUS     = 1;
    const BOUNCE_FLOOR    = PLAT_Y + BALL_RADIUS;
    const BOUNCE_HEIGHT   = 3.5;
    const BASE_JUMP_DURATION = 0.95;   // 基础跳跃周期（增大→滞空感更强）
    const BOOST_GRAVITY_MULT = 2.5;    // 加速轨道：等效重力倍数
    // 重力 ∝ 1/T²，g×2.5 → T = BASE/sqrt(2.5)
    const BOOST_JUMP_DURATION = BASE_JUMP_DURATION / Math.sqrt(BOOST_GRAVITY_MULT);
    const BOOST_DURATION  = 8;         // 加速持续秒数
    const BOOST_DECAY_DURATION = 1.5;  // 加速结束后平滑衰减时间
    const MOUSE_SENSITIVITY = 0.04;

    // 加速状态（浮点强度：0=正常速度, 1=全速加速, 衰减期平滑过渡）
    let boostIntensity = 0;
    let boostTimer = 0;
    let boostDecaying = false;

    // ── 冰霜段滑行状态 ──
    let iceSliding = false;           // 是否正在冰面上滑行
    let iceSlideZ = 0;                // 滑行开始时的 Z 坐标
    let iceSlideX = 0;                // 滑行中的 X 坐标
    let iceGroupRef = null;           // 当前滑行的冰霜段 group 引用
    let iceSlideAccelDir = 0;         // 当前横向推力方向（-1/0/+1）
    let iceAccelTimer = 0;            // 推力方向切换计时器
    let iceSlideVelX = 0;             // 冰面横向速度（惯性累积）

    // ── 护盾系统参数 ──
    const SHIELD_MAX = 100;
    const SHIELD_REGEN_AMOUNT = 15;
    const SAFE_LAND_THRESHOLD = 3;

    window.addEventListener('resize', () => {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
    });

    // ═══════════════════════════════════════════════════════
    //  涟漪系统（一整片发光方形扩散波纹 + 边缘粒子）
    // ═══════════════════════════════════════════════════════
    const RIPPLE_COUNT = 3;
    const RIPPLE_PARTICLE_PER_EDGE = 6;
    const ripples = [];

    // 涟漪 plane shader — 羽化发光扩散
    const rippleVert = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const rippleFrag = `
      uniform float uOpacity;
      uniform float uTime;
      uniform vec3  uColor;
      varying vec2 vUv;
      void main() {
        // 从中心向边缘羽化：方形，四边渐变
        vec2 d = abs(vUv - 0.5) * 2.0;              // 0 at center, 1 at edge
        float edgeFade = 1.0 - smoothstep(0.25, 1.0, max(d.x, d.y));
        // 边缘高亮描边
        float edge = smoothstep(0.88, 0.96, max(d.x, d.y));
        float glow = edge * 0.6 + edgeFade * 0.5;
        // 轻微呼吸闪烁
        glow *= 0.85 + 0.15 * sin(uTime * 12.0);
        gl_FragColor = vec4(uColor * 1.4, glow * uOpacity);
      }
    `;

    function makeRipple() {
      const geo = new THREE.PlaneGeometry(1, 1);
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uOpacity: { value: 0 },
          uTime:    { value: 0 },
          uColor:   { value: new THREE.Color(1, 1, 1) },
        },
        vertexShader:   rippleVert,
        fragmentShader: rippleFrag,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        side:        THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2; // 平放在 XZ 平面
      mesh.visible = false;
      scene.add(mesh);

      // 边缘粒子
      const particles = [];
      for (let i = 0; i < RIPPLE_PARTICLE_PER_EDGE * 4; i++) {
        const pGeo = new THREE.IcosahedronGeometry(0.045 + Math.random() * 0.035, 0);
        const pMat = new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0,
          depthWrite: false, blending: THREE.AdditiveBlending,
        });
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.visible = false;
        scene.add(pMesh);
        particles.push({
          mesh: pMesh, geo: pGeo, mat: pMat,
          vel: new THREE.Vector3(),
          life: 0,
        });
      }

      return {
        mesh, geo, mat, particles,
        active: false, timer: 0, duration: 0.8,
        baseW: 1, baseD: 1,
      };
    }

    for (let i = 0; i < RIPPLE_COUNT; i++) {
      ripples.push(makeRipple());
    }

    function triggerRipple(cx, cz, color, platW, platD) {
      const delays = [0, 0.15, 0.30];
      // 扩散目标尺寸（从方块大小扩大到 3 倍左右）
      const expandScale = 3.0;
      const targetW = platW * expandScale;
      const targetD = platD * expandScale;

      ripples.forEach((r, i) => {
        r.active   = true;
        r.timer    = -delays[i];
        r.baseW    = platW;
        r.baseD    = platD;

        // 重建 plane geometry 匹配最终扩散尺寸
        r.geo.dispose();
        r.geo = new THREE.PlaneGeometry(targetW, targetD);
        r.mesh.geometry = r.geo;

        // 起始时缩到方块原始大小，然后 scale 到 1（即目标大小）
        const initScaleX = platW / targetW;
        const initScaleZ = platD / targetD;
        r.mesh.scale.set(initScaleX, initScaleZ, 1);

        // 位置：放在方块底面以下
        r.mesh.position.set(cx, PLAT_Y - PLAT_H / 2 - 0.03, cz);

        r.mat.uniforms.uOpacity.value = 0;
        r.mat.uniforms.uColor.value.copy(color);
        r.mat.uniforms.uTime.value = 0;
        r.mesh.visible = true;

        // 边缘粒子初始化
        r.particles.forEach(p => { p.mesh.visible = false; });
      });

      // 为第一个涟漪生成边缘粒子（延迟为0的那个）
      spawnEdgeParticles(ripples[0], cx, cz, color, platW, platD);
    }

    function spawnEdgeParticles(ripple, cx, cz, color, w, d) {
      const hw = w / 2, hd = d / 2;
      const count = ripple.particles.length;
      const perEdge = count / 4;
      let idx = 0;

      // 四条边：前、后、左、右
      const edgeDef = [
        (t) => [cx + (t - 0.5) * w, cz - hd,  0, -1],   // 前边
        (t) => [cx + (t - 0.5) * w, cz + hd,  0,  1],   // 后边
        (t) => [cx - hw, cz + (t - 0.5) * d, -1,  0],   // 左边
        (t) => [cx + hw, cz + (t - 0.5) * d,  1,  0],   // 右边
      ];

      edgeDef.forEach((fn, ei) => {
        for (let j = 0; j < perEdge; j++) {
          const t = (j + 0.5) / perEdge;
          const [px, pz, dx, dz] = fn(t);
          const p = ripple.particles[idx++];
          const speed = 2.5 + Math.random() * 3.5;
          p.mesh.position.set(px, PLAT_Y - PLAT_H / 2 - 0.03, pz);
          p.vel.set(
            dx * speed + (Math.random() - 0.5) * 0.8,
            (Math.random() - 0.3) * 1.5,
            dz * speed + (Math.random() - 0.5) * 0.8
          );
          p.life = 1;
          p.mat.color.copy(color);
          p.mat.opacity = 0.9;
          p.mesh.visible = true;
          p.mesh.scale.setScalar(0.6 + Math.random() * 0.8);
        }
      });
    }

    function updateRipples(dt) {
      const time = clock.elapsedTime;
      ripples.forEach(r => {
        if (!r.active) return;
        r.timer += dt;
        if (r.timer < 0) return;

        const p = Math.min(r.timer / r.duration, 1);
        const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic

        // scale 从方块原始大小扩散到目标大小
        const scaleX = (r.baseW / (r.baseW * 3)) + ease * (1 - r.baseW / (r.baseW * 3));
        const scaleZ = (r.baseD / (r.baseD * 3)) + ease * (1 - r.baseD / (r.baseD * 3));
        r.mesh.scale.set(scaleX, scaleZ, 1);

        // opacity：快速升 -> 缓慢降
        const fadeP = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
        r.mat.uniforms.uOpacity.value = fadeP * 0.85;
        r.mat.uniforms.uTime.value = time;

        // 边缘粒子更新
        r.particles.forEach(pt => {
          if (!pt.mesh.visible) return;
          pt.vel.y -= 6 * dt;
          pt.mesh.position.addScaledVector(pt.vel, dt);
          pt.life -= dt / r.duration;
          pt.mat.opacity = Math.max(0, pt.life) * 0.7;
          pt.mesh.scale.multiplyScalar(0.97);
          if (pt.life <= 0) {
            pt.mesh.visible = false;
          }
        });

        if (p >= 1) {
          r.active = false;
          r.mesh.visible = false;
          r.mat.uniforms.uOpacity.value = 0;
          r.particles.forEach(pt => { pt.mesh.visible = false; });
        }
      });
    }

    // ── 落地缓冲（下陷弹起）参数 ──
    let landBounceTimer    = 0;
    let landBounceActive   = false;
    const LAND_BOUNCE_DUR  = 0.35; // 缓冲动画时长（秒）

    // ═══════════════════════════════════════════════════════
    //  黑洞系统（漩涡盘面 + 吸入粒子 + 事件视界）
    // ═══════════════════════════════════════════════════════
    const BLACKHOLE_RADIUS = 4.0;
    const WIN_SCORE = 25;
    let blackhole = null;        // 黑洞对象引用
    let blackholeActive = false;
    let blackholeSpawned = false;
    let victoryTriggered = false;

    function createBlackhole(z) {
      const group = new THREE.Group();
      // 黑洞竖立在 XY 平面，中心对准球跳跃高度
      group.position.set(0, PLAT_Y + BALL_RADIUS + BOUNCE_HEIGHT * 0.5, z);

      // 1) 事件视界（黑色圆盘，竖立面向球）
      const eventHorizon = new THREE.Mesh(
        new THREE.CircleGeometry(BLACKHOLE_RADIUS * 0.45, 64),
        new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide })
      );
      eventHorizon.rotation.y = Math.PI; // 面向 -Z（面向球来的方向）
      eventHorizon.position.z = 0;
      group.add(eventHorizon);

      // 2) 漩涡吸积盘（shader 材质，竖立面向球）
      const diskVert = `
        varying vec2 vUv;
        varying float vAngle;
        varying float vDist;
        void main() {
          vUv = uv;
          vec2 centered = uv - 0.5;
          vAngle = atan(centered.y, centered.x);
          vDist = length(centered) * 2.0;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;
      const diskFrag = `
        uniform float uTime;
        varying vec2 vUv;
        varying float vAngle;
        varying float vDist;
        void main() {
          // 漩涡：螺旋臂
          float spiral = sin(vAngle * 3.0 + vDist * 8.0 - uTime * 4.0) * 0.5 + 0.5;
          // 径向渐变：中心暗、边缘亮
          float radial = smoothstep(0.0, 0.3, vDist) * smoothstep(1.0, 0.5, vDist);
          // 颜色：紫→蓝→橙
          vec3 col = mix(vec3(0.65, 0.3, 1.0), vec3(0.2, 0.4, 1.0), spiral);
          col = mix(col, vec3(1.0, 0.5, 0.1), smoothstep(0.6, 0.95, vDist) * 0.7);
          float alpha = radial * (0.6 + 0.4 * spiral);
          // 中心黑洞遮罩
          alpha *= smoothstep(0.2, 0.35, vDist);
          gl_FragColor = vec4(col * 1.6, alpha);
        }
      `;
      const diskMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: diskVert,
        fragmentShader: diskFrag,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      diskMat.toneMapped = false;
      const disk = new THREE.Mesh(new THREE.PlaneGeometry(BLACKHOLE_RADIUS * 2.2, BLACKHOLE_RADIUS * 2.2), diskMat);
      disk.rotation.y = Math.PI; // 面向球
      group.add(disk);

      // 3) 外圈光环（竖立在 XY 平面，法线朝 Z 面向球）
      const ringGeo = new THREE.TorusGeometry(BLACKHOLE_RADIUS * 0.9, 0.08, 16, 100);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x9966ff,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
      });
      ringMat.toneMapped = false;
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      // TorusGeometry 默认在 XY 平面，法线沿 Z，正好面向球，不需要旋转
      group.add(ringMesh);

      // 4) 吸入粒子
      const vortexParticles = [];
      const VORTEX_COUNT = 80;
      for (let i = 0; i < VORTEX_COUNT; i++) {
        const size = 0.03 + Math.random() * 0.06;
        const pGeo = new THREE.SphereGeometry(size, 8, 8);
        const pMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.7 + Math.random() * 0.2, 0.8, 0.7),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
        });
        pMat.toneMapped = false;
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.visible = false;
        group.add(pMesh);
        vortexParticles.push({
          mesh: pMesh, geo: pGeo, mat: pMat,
          angle: Math.random() * Math.PI * 2,
          radius: BLACKHOLE_RADIUS * (0.5 + Math.random() * 1.2),
          y: Math.random() * 2 - 0.5,
          speed: 0.8 + Math.random() * 2.0,
          inwardSpeed: 0.3 + Math.random() * 0.5,
        });
      }

      // 5) 光晕（竖立面向球）
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x6633cc,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
      });
      glowMat.toneMapped = false;
      const glow = new THREE.Mesh(new THREE.CircleGeometry(BLACKHOLE_RADIUS * 1.5, 64), glowMat);
      glow.rotation.y = Math.PI; // 面向球
      group.add(glow);

      scene.add(group);

      return {
        group, eventHorizon, disk, diskMat, ringMesh, ringMat,
        vortexParticles, glow, glowMat,
        timer: 0, fadeInDuration: 1.5,
      };
    }

    function updateBlackhole(dt) {
      if (!blackhole) return;
      blackhole.timer += dt;
      const t = blackhole.timer;

      // 淡入
      const fadeIn = Math.min(t / blackhole.fadeInDuration, 1);

      // 旋转漩涡
      blackhole.diskMat.uniforms.uTime.value = t;
      blackhole.disk.material.opacity = fadeIn;
      blackhole.ringMesh.rotation.z = t * 0.5; // 在 XY 平面内旋转

      // 光晕呼吸
      blackhole.glowMat.opacity = 0.15 + 0.08 * Math.sin(t * 2) * fadeIn;

      // 吸入粒子
      if (fadeIn > 0.3) {
        blackhole.vortexParticles.forEach(p => {
          p.mesh.visible = true;
          p.angle += p.speed * dt;
          p.radius -= p.inwardSpeed * dt;
          // 到达中心后重置到外围
          if (p.radius < 0.1) {
            p.radius = BLACKHOLE_RADIUS * (0.8 + Math.random() * 1.2);
            p.angle = Math.random() * Math.PI * 2;
            p.y = Math.random() * 2 - 0.5;
          }
          // 粒子在 XY 平面围绕中心旋转
          const px = Math.cos(p.angle) * p.radius;
          const py = Math.sin(p.angle) * p.radius;
          p.mesh.position.set(px, py, 0);
          p.mat.opacity = fadeIn * Math.min(1, p.radius / (BLACKHOLE_RADIUS * 0.5));
          p.mesh.scale.setScalar(0.5 + 0.5 * (p.radius / BLACKHOLE_RADIUS));
        });
      }
    }

    function removeBlackhole() {
      if (!blackhole) return;
      scene.remove(blackhole.group);
      blackhole.disk.geometry.dispose();
      blackhole.diskMat.dispose();
      blackhole.eventHorizon.geometry.dispose();
      blackhole.eventHorizon.material.dispose();
      blackhole.ringMesh.geometry.dispose();
      blackhole.ringMat.dispose();
      blackhole.glow.geometry.dispose();
      blackhole.glowMat.dispose();
      blackhole.vortexParticles.forEach(p => {
        p.geo.dispose();
        p.mat.dispose();
      });
      blackhole = null;
      blackholeActive = false;
      blackholeSpawned = false;
    }

    // ── 胜利动画（球被吸入）──
    let victoryAnimActive = false;
    let victoryAnimTimer = 0;
    const VICTORY_ANIM_DUR = 2.0;

    function triggerVictoryAnim() {
      victoryAnimActive = true;
      victoryAnimTimer = 0;
      ring.visible = false;
      shadowCircle.visible = false;
      // 黑洞加速旋转，光环全亮
      if (blackhole) {
        blackhole.ringMat.opacity = 1;
        // 增大吸入粒子的速度
        blackhole.vortexParticles.forEach(p => {
          p.inwardSpeed *= 2;
          p.speed *= 1.5;
        });
      }
    }

    function updateVictoryAnim(dt) {
      if (!victoryAnimActive || !blackhole) return;
      victoryAnimTimer += dt;
      const p = Math.min(victoryAnimTimer / VICTORY_ANIM_DUR, 1);
      // 加速吸入曲线：先慢后快
      const ease = p < 0.3 ? p * 0.5 : 0.15 + (p - 0.3) * (p - 0.3) * 2.5;
      const pullEase = Math.min(ease * 1.5, 1);

      // 球飞向黑洞中心
      const targetX = blackhole.group.position.x;
      const targetY = blackhole.group.position.y;
      const targetZ = blackhole.group.position.z;
      sphere.position.x += (targetX - sphere.position.x) * pullEase * 0.12;
      sphere.position.y += (targetY - sphere.position.y) * pullEase * 0.08;
      sphere.position.z += (targetZ - sphere.position.z) * pullEase * 0.06;
      // 旋转加速 + 缩小
      sphere.rotation.x += dt * (5 + p * 40);
      sphere.rotation.z += dt * (3 + p * 25);
      const shrink = Math.max(0.01, 1 - pullEase * 1.2);
      sphere.scale.setScalar(shrink);
      sphereMat.opacity = Math.max(0, 1 - pullEase);

      // 黑洞加速旋转
      if (blackhole.diskMat) {
        blackhole.diskMat.uniforms.uTime.value += dt * (1 + p * 3);
      }

      if (shrink <= 0.05 || p >= 1) {
        victoryAnimActive = false;
        sphere.visible = false;
        // 闯关模式：计算星级 + 保存进度 + 更新消息
        const vExitBtn = document.getElementById('victory-exit-btn');
        const vNextBtn = document.getElementById('victory-btn');
        const vMsg = document.getElementById('victory-msg');
        const vStars = document.getElementById('go-stars-earned');
        if (gameMode === 'stages' && _currentStage) {
          // 星级计算：基于完美着陆比例
          var totalLand = Math.max(1, perfectCount + greatCount);
          var perfRatio = perfectCount / totalLand;
          var stageStars = 0;
          if (perfRatio >= 0.70) stageStars = 3;
          else if (perfRatio >= 0.40) stageStars = 2;
          else stageStars = 1;
          // 如果距离目标太远（没到黑洞就死了），降星
          var finalDist = Math.round(sphere.position.z);
          if (finalDist < _currentStage.targetDist * 0.8) stageStars = Math.max(1, stageStars - 1);
          setStageStars(_currentStage.id, stageStars);
          // 更新消息
          vMsg.textContent = '第' + _currentStage.id + '关 · ' + _currentStage.nameCN + ' 通关！';
          vMsg.style.marginBottom = '0.5em';
          vStars.textContent = '★'.repeat(stageStars) + '★'.repeat(3 - stageStars).replace(/★/g, '<span style="opacity:0.2">★</span>');
          vStars.style.display = '';
          vStars.style.fontSize = '1.6rem';
          vExitBtn.style.display = '';
          // 下一关按钮
          var nextId = _currentStage.id + 1;
          if (nextId <= STAGE_CONFIGS.length && nextId <= _stageProgress.unlocked) {
            vNextBtn.textContent = '下一关 →';
            vNextBtn.style.display = '';
          } else {
            vNextBtn.textContent = '返回关卡选择';
            vNextBtn.style.display = '';
          }
          updateModeStarsUI();
        } else {
          vMsg.textContent = '成功穿越黑洞，你赢了！';
          vMsg.style.marginBottom = '';
          vStars.style.display = 'none';
          vExitBtn.style.display = 'none';
          vNextBtn.textContent = '再开一局 ↺';
          vNextBtn.style.display = '';
        }
        document.getElementById('victory').classList.add('show');
      }
    }

    // ═══════════════════════════════════════════════════════
    //  粒子碎裂系统
    // ═══════════════════════════════════════════════════════
    const PARTICLE_COUNT = 60;
    const particleGeos   = [];
    const particleMeshes = [];
    const particleVels   = [];
    let   burstActive    = false;
    let   burstTimer     = 0;
    const BURST_DURATION = 1.0;

    // ══════════════════════════════════════════════════════════
    // BoostParticleSystem — 三层霓虹粒子特效
    // Layer1: 速度光束线  Layer2: 核心发光粒子  Layer3: 环境光尘
    // ══════════════════════════════════════════════════════════
    class BoostParticleSystem {
      constructor(sceneRef, cameraRef) {
        this._scene  = sceneRef;
        this._camera = cameraRef;
        this._active   = false;
        this._elapsed  = 0;      // boost 已运行时长
        this._duration = 8;      // 对齐 BOOST_DURATION
        this._spawnAcc = [0, 0, 0];
        this._triggerPos = new THREE.Vector3();
        this._baseColor  = new THREE.Color();

        // ── 三层粒子容量 ──
        this._N1 = 60;   // 光束线
        this._N2 = 200;  // 核心粒子
        this._N3 = 150;  // 光尘
        const N1 = this._N1, N2 = this._N2, N3 = this._N3;

        // ── 共用 shader（vertexColors 模式） ──
        const vertSrc = `
          attribute float aSize;
          attribute float aAlpha;
          varying vec3  vColor;
          varying float vAlpha;
          varying float vStretch; // >0 表示光束层，用于椭圆拉伸
          attribute vec3  aColor;
          attribute float aStretch;
          void main() {
            vColor   = aColor;
            vAlpha   = aAlpha;
            vStretch = aStretch;
            vec4 mv  = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * (550.0 / -mv.z);
            gl_Position  = projectionMatrix * mv;
          }
        `;

        // 光束层：纵向拉伸椭圆
        const fragBeam = `
          varying vec3  vColor;
          varying float vAlpha;
          varying float vStretch;
          void main() {
            vec2 uv  = gl_PointCoord - 0.5;
            // 纵向压缩，形成细长椭圆
            float stretch = max(vStretch, 1.0);
            uv.y *= 1.0 / stretch;
            float d = length(uv) * 2.0;
            if (d > 1.0) discard;
            float core = exp(-d * d * 3.0);
            float halo = exp(-d * d * 0.8) * 0.4;
            gl_FragColor = vec4(vColor, vAlpha * (core + halo));
          }
        `;

        // 核心粒子：柔光圆点
        const fragCore = `
          varying vec3  vColor;
          varying float vAlpha;
          varying float vStretch;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;
            float core = exp(-d * d * 2.5);
            float halo = exp(-d * d * 0.7) * 0.5;
            gl_FragColor = vec4(vColor, vAlpha * (core + halo));
          }
        `;

        // 光尘：极小极柔
        const fragDust = `
          varying vec3  vColor;
          varying float vAlpha;
          varying float vStretch;
          void main() {
            float d = length(gl_PointCoord - 0.5) * 2.0;
            if (d > 1.0) discard;
            float glow = exp(-d * d * 1.5);
            gl_FragColor = vec4(vColor, vAlpha * glow);
          }
        `;

        this._layers = [];
        const layerDefs = [
          { n: N1, frag: fragBeam, label: 'beam' },
          { n: N2, frag: fragCore, label: 'core' },
          { n: N3, frag: fragDust, label: 'dust' },
        ];
        layerDefs.forEach(({ n, frag, label }) => {
          const geo  = new THREE.BufferGeometry();
          const pos     = new Float32Array(n * 3);
          const col     = new Float32Array(n * 3);
          const size    = new Float32Array(n);
          const alpha   = new Float32Array(n);
          const stretch = new Float32Array(n);
          geo.setAttribute('position', new THREE.BufferAttribute(pos,     3));
          geo.setAttribute('aColor',   new THREE.BufferAttribute(col,     3));
          geo.setAttribute('aSize',    new THREE.BufferAttribute(size,    1));
          geo.setAttribute('aAlpha',   new THREE.BufferAttribute(alpha,   1));
          geo.setAttribute('aStretch', new THREE.BufferAttribute(stretch, 1));

          const mat = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite:  false,
            blending:    THREE.AdditiveBlending,
            vertexShader:   vertSrc,
            fragmentShader: frag,
          });

          const pts = new THREE.Points(geo, mat);
          pts.frustumCulled = false;
          pts.visible = false;
          pts.renderOrder = 998;
          sceneRef.add(pts);

          // 粒子状态（对象池，纯 Float32Array）
          const velX   = new Float32Array(n);
          const velY   = new Float32Array(n);
          const velZ   = new Float32Array(n);
          const life   = new Float32Array(n);  // 剩余生命
          const maxLife= new Float32Array(n);  // 初始生命（用于淡出比）
          let   active = 0;

          this._layers.push({ geo, pos, col, size, alpha, stretch,
                               velX, velY, velZ, life, maxLife,
                               active, pts, label, n });
        });
      }

      // ── 触发 ──
      trigger(sphereColor, triggerPosition) {
        this._active  = true;
        this._elapsed = 0;
        this._triggerPos.copy(triggerPosition);
        this._baseColor.copy(sphereColor);
        this._spawnAcc = [0, 0, 0];
        this._layers.forEach(L => {
          L.active = 0;
          L.alpha.fill(0);
          L.size.fill(0);
          L.geo.attributes.aAlpha.needsUpdate = true;
          L.geo.attributes.aSize.needsUpdate  = true;
          L.pts.visible = true;
        });
      }

      // ── 关闭 ──
      _hide() {
        this._active = false;
        this._layers.forEach(L => { L.pts.visible = false; });
      }

      // ── 生成一个光束粒子 ──
      _spawnBeam(L, refPos, color) {
        if (L.active >= L.n) return;
        const i = L.active++;
        const b3 = i * 3;
        // 从球上方随机 X 宽，几乎正上方冲下
        L.pos[b3]     = refPos.x + (Math.random() - 0.5) * 16;
        L.pos[b3 + 1] = refPos.y + 4 + Math.random() * 8;
        L.pos[b3 + 2] = refPos.z + (Math.random() - 0.5) * 4 + 1.5; // 球后方

        L.col[b3]     = color.r; L.col[b3+1] = color.g; L.col[b3+2] = color.b;
        L.velX[i] = (Math.random() - 0.5) * 0.3;
        L.velY[i] = -(8 + Math.random() * 10);   // 高速下冲
        L.velZ[i] = (Math.random() - 0.5) * 0.2;
        const ml = 0.3 + Math.random() * 0.9;
        L.maxLife[i] = L.life[i] = ml;
        L.size[i]    = 0.25 + Math.random() * 0.35;
        L.alpha[i]   = 0.7 + Math.random() * 0.25;
        L.stretch[i] = 3.0 + Math.random() * 4.0; // 纵向拉伸倍数
      }

      // ── 生成一个核心粒子 ──
      _spawnCore(L, refPos, color) {
        if (L.active >= L.n) return;
        const i = L.active++;
        const b3 = i * 3;
        L.pos[b3]     = refPos.x + (Math.random() - 0.5) * 14;
        L.pos[b3 + 1] = refPos.y + 1 + Math.random() * 9;
        L.pos[b3 + 2] = refPos.z + (Math.random() - 0.5) * 5 + 1.5;

        // 主色 + 10% 白
        const c = color.clone().lerp(new THREE.Color(1,1,1), 0.1);
        L.col[b3]     = c.r; L.col[b3+1] = c.g; L.col[b3+2] = c.b;

        const spd = 1.5 + Math.random() * 3.0;
        const ax  = (Math.random() - 0.5) * 2;
        const ay  = -0.5 - Math.random();            // 轻微向下漂
        const az  = (Math.random() - 0.5) * 0.5;
        const len = Math.sqrt(ax*ax + ay*ay + az*az) || 1;
        L.velX[i] = ax / len * spd;
        L.velY[i] = ay / len * spd;
        L.velZ[i] = az / len * spd;
        const ml = 0.8 + Math.random() * 1.7;
        L.maxLife[i] = L.life[i] = ml;
        L.size[i]    = 0.12 + Math.random() * 0.14;
        L.alpha[i]   = 0.6 + Math.random() * 0.3;
        L.stretch[i] = 1.0;
      }

      // ── 生成一个光尘粒子 ──
      _spawnDust(L, refPos, color) {
        if (L.active >= L.n) return;
        const i = L.active++;
        const b3 = i * 3;
        L.pos[b3]     = refPos.x + (Math.random() - 0.5) * 18;
        L.pos[b3 + 1] = refPos.y + (Math.random() - 0.5) * 10 + 2;
        L.pos[b3 + 2] = refPos.z + (Math.random() - 0.5) * 6 + 1.5;

        // 降饱和
        const hsl = {}; color.getHSL(hsl);
        const c = new THREE.Color().setHSL(hsl.h, hsl.s * 0.4, hsl.l * 0.8);
        L.col[b3]     = c.r; L.col[b3+1] = c.g; L.col[b3+2] = c.b;

        L.velX[i] = (Math.random() - 0.5) * 0.15;
        L.velY[i] = (Math.random() - 0.5) * 0.1 - 0.05;
        L.velZ[i] = (Math.random() - 0.5) * 0.1;
        const ml = 2 + Math.random() * 3;
        L.maxLife[i] = L.life[i] = ml;
        L.size[i]    = 0.06 + Math.random() * 0.08;
        L.alpha[i]   = 0.2 + Math.random() * 0.2;
        L.stretch[i] = 1.0;
      }

      // ── 每帧更新 ──
      update(dt) {
        if (!this._active) return;

        // 加速强度由外部管理，归零时关闭
        if (boostIntensity <= 0) { this._hide(); return; }

        this._elapsed += dt;
        const timeLeft = this._duration - this._elapsed;
        const globalFade = timeLeft < 1.0 ? Math.max(0, timeLeft) : 1.0; // 最后1秒线性淡出

        const ref = sphere.position;
        const col = sphereMat.color; // 实时跟随球当前颜色

        // 每帧预计算各层派生颜色
        const coreCol = new THREE.Color().copy(col).lerp(new THREE.Color(1,1,1), 0.1);
        const _dHSL = {}; col.getHSL(_dHSL);
        const dustCol = new THREE.Color().setHSL(_dHSL.h, _dHSL.s * 0.4, _dHSL.l * 0.8);
        const layerCol = [col, coreCol, dustCol]; // 按层索引取色

        this._spawnAcc[0] += dt;
        this._spawnAcc[1] += dt;
        this._spawnAcc[2] += dt;

        // Layer1 光束：间隔 0.04s 生成 2 条
        while (this._spawnAcc[0] >= 0.04) {
          this._spawnAcc[0] -= 0.04;
          const L = this._layers[0];
          if (L.active < L.n) { this._spawnBeam(L, ref, col); this._spawnBeam(L, ref, col); }
        }
        // Layer2 核心：间隔 0.012s 生成 2 个
        while (this._spawnAcc[1] >= 0.012) {
          this._spawnAcc[1] -= 0.012;
          const L = this._layers[1];
          if (L.active < L.n) { this._spawnCore(L, ref, col); this._spawnCore(L, ref, col); }
        }
        // Layer3 光尘：间隔 0.025s 生成 1 个
        while (this._spawnAcc[2] >= 0.025) {
          this._spawnAcc[2] -= 0.025;
          const L = this._layers[2];
          if (L.active < L.n) this._spawnDust(L, ref, col);
        }

        // 更新各层
        this._layers.forEach((L, li) => {
          let newActive = 0;
          for (let i = 0; i < L.active; i++) {
            L.life[i] -= dt;
            if (L.life[i] <= 0) { L.size[i] = 0; L.alpha[i] = 0; continue; }

            const b3 = i * 3;
            // 移动，核心粒子0.5s后减速
            let drag = 1.0;
            if (li === 1 && L.maxLife[i] - L.life[i] > 0.5) drag = 0.92;
            L.velX[i] *= drag; L.velY[i] *= drag; L.velZ[i] *= drag;
            L.pos[b3]     += L.velX[i] * dt;
            L.pos[b3 + 1] += L.velY[i] * dt;
            L.pos[b3 + 2] += L.velZ[i] * dt;

            // 粒子出界剔除（落到地板以下）
            if (L.pos[b3 + 1] < PLAT_Y - 2) { L.size[i] = 0; L.alpha[i] = 0; continue; }

            // 生命淡出 × 全局淡出
            const lifeFade = Math.min(1.0, L.life[i] / (L.maxLife[i] * 0.3));
            const baseAlpha = li === 0 ? (0.7 + Math.random() * 0.2)
                            : li === 1 ? 0.65
                            :            0.28;
            L.alpha[i] = baseAlpha * lifeFade * globalFade;

            // 实时同步球当前颜色
            const cc = layerCol[li];
            L.col[b3] = cc.r; L.col[b3+1] = cc.g; L.col[b3+2] = cc.b;

            // 压缩活跃粒子
            if (newActive !== i) {
              const n3 = newActive * 3;
              L.pos[n3]     = L.pos[b3];
              L.pos[n3 + 1] = L.pos[b3 + 1];
              L.pos[n3 + 2] = L.pos[b3 + 2];
              L.col[n3]     = L.col[b3];
              L.col[n3 + 1] = L.col[b3 + 1];
              L.col[n3 + 2] = L.col[b3 + 2];
              L.alpha[newActive]   = L.alpha[i];
              L.size[newActive]    = L.size[i];
              L.stretch[newActive] = L.stretch[i];
              L.velX[newActive]    = L.velX[i];
              L.velY[newActive]    = L.velY[i];
              L.velZ[newActive]    = L.velZ[i];
              L.life[newActive]    = L.life[i];
              L.maxLife[newActive] = L.maxLife[i];
            }
            newActive++;
          }
          // 尾部清零
          for (let i = newActive; i < L.active; i++) {
            L.size[i] = 0; L.alpha[i] = 0;
          }
          L.active = newActive;

          L.geo.attributes.position.needsUpdate = true;
          L.geo.attributes.aColor.needsUpdate   = true;
          L.geo.attributes.aAlpha.needsUpdate   = true;
          L.geo.attributes.aSize.needsUpdate    = true;
          L.geo.attributes.aStretch.needsUpdate = true;
          L.geo.setDrawRange(0, Math.max(L.active, 1));
        });
      }

      dispose() {
        this._layers.forEach(L => {
          L.geo.dispose();
          L.pts.material.dispose();
          this._scene.remove(L.pts);
        });
      }
    }

    // ── 实例化 ──
    const boostFX = new BoostParticleSystem(scene, camera);
    let boostScatterActive = false;

    function triggerBoostScatter() {
      boostScatterActive = true;
      boostFX.trigger(sphereMat.color, sphere.position);
    }

    function hideBoostParticles() {
      boostScatterActive = false;
      boostFX._hide();
    }

    function updateBoostScatter(dt) {
      boostFX.update(dt);
      // 同步 active 标志
      if (boostScatterActive && boostIntensity <= 0) boostScatterActive = false;
    }

    // ── 自由落体 Game Over 状态 ──
    let missFallActive = false;
    let missFallVelY   = 0;
    let missFallTimer  = 0;
    const MISS_FALL_DURATION = 1.2;

    function triggerMissFall() {
      playMissFallSound();
      missFallActive = true;
      missFallVelY   = 0;
      missFallTimer  = 0;
      sphere.visible = true;
      ring.visible   = false;
      shadowCircle.visible = false;
      document.getElementById('gameover-msg').textContent = '啊哦，球未落到轨道上~';
    }

    function updateMissFall(dt) {
      if (!missFallActive) return;
      missFallTimer += dt;
      missFallVelY -= 25 * dt;
      sphere.position.y += missFallVelY * dt;
      // 球缩小淡出
      const fade = Math.max(0, 1 - missFallTimer / MISS_FALL_DURATION);
      sphereMat.opacity = fade;
      sphere.scale.setScalar(fade);
      sphere.rotation.x += dt * 8;
      sphere.rotation.z += dt * 5;

      if (missFallTimer >= MISS_FALL_DURATION) {
        missFallActive = false;
        sphere.visible = false;
        showGameOver();
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const size = 0.08 + Math.random() * 0.22;
      const geo  = new THREE.IcosahedronGeometry(size, 0);
      const mat  = new THREE.MeshPhysicalMaterial({
        roughness: 0.3, metalness: 0.2,
        clearcoat: 1.0, transparent: true, opacity: 1,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      particleGeos.push(geo);
      particleMeshes.push(mesh);
      particleVels.push(new THREE.Vector3());
    }

    function triggerBurst(pos, color) {
      playShatterSound();
      burstActive = true;
      burstTimer  = 0;
      sphere.visible = false;
      ring.visible   = false;
      shadowCircle.visible = false;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const m = particleMeshes[i];
        m.position.copy(pos);
        m.visible = true;
        m.material.color.copy(color);
        m.material.opacity = 1;
        m.material.emissive = color.clone().multiplyScalar(0.4);

        const theta = Math.random() * Math.PI * 2;
        const phi   = Math.acos(2 * Math.random() - 1);
        const speed = 3 + Math.random() * 8;
        particleVels[i].set(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed * 0.8 + 3,
          Math.cos(phi) * speed * 0.5
        );
        m.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0);
      }
    }

    function updateBurst(dt) {
      if (!burstActive) return;
      burstTimer += dt;
      const progress = burstTimer / BURST_DURATION;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const m = particleMeshes[i];
        if (!m.visible) continue;

        particleVels[i].y -= 18 * dt;
        m.position.addScaledVector(particleVels[i], dt);

        m.rotation.x += particleVels[i].length() * dt * 0.8;
        m.rotation.z += particleVels[i].length() * dt * 0.5;

        m.material.opacity = Math.max(0, 1 - progress * 1.2);
        if (m.material.opacity <= 0) m.visible = false;
      }

      if (burstTimer >= BURST_DURATION) {
        burstActive = false;
        showGameOver();
      }
    }

    // ═══════════════════════════════════════════════════════
    //  游戏状态
    // ═══════════════════════════════════════════════════════
    let gameOver = false;
    let gameStarted = false; // 游戏是否已开始（倒计时结束）
    let isPaused = false;    // 暂停状态（三分路选择、UI 弹窗等）

    // ── 死亡颜色记忆（球死了什么色，复活就是什么色）──
    let lastDeathColor = new THREE.Color(0.5, 0.7, 1.0);
    let lastDeathColorKey = 'blue';
    function saveBallDeathColor() {
      lastDeathColor.copy(sphereMat.color);
      lastDeathColorKey = currentBallColorKey;
    }

    // ── 护盾系统状态 ──
    let shield = SHIELD_MAX;
    let safeLandCount = 0;
    let isShieldBroken = false;
    let wasHitThisJump = false;
    let shieldBreakActive = false;
    let shieldBreakTimer = 0;
    const SHIELD_BREAK_DELAY = 0.5;
    let shieldWarningTimer = 0;
    let shieldRegenFlashTimer = 0;

    // ── 星级系统（无尽模式） ──
    let totalStars = parseInt(localStorage.getItem('bounceGameStars') || '0', 10);
    let sessionStars = 0; // 本局累计星
    const STAR_PER_DIST = 300; // 每 300m 获得 1 星
    let lastStarDist = 0; // 上次计星的距离

    function saveStars() {
      localStorage.setItem('bounceGameStars', String(totalStars));
    }
    function addSessionStar() {
      sessionStars++;
      totalStars++;
      saveStars();
    }
    function updateStarsUI() {
      document.getElementById('dist-stars-count').textContent = sessionStars;
    }
    function updateModeStarsUI() {
      document.getElementById('mode-stars').textContent = '★ ' + totalStars;
    }

    // ── 连击鼓励 UI ──
    let comboCount = 0;
    let perfectCount = 0;
    let greatCount = 0;
    let comboHideTimer = null;
    const comboContainer = document.getElementById('combo-container');
    const comboTextEl    = document.getElementById('combo-text');
    const comboCountEl   = document.getElementById('combo-count');
    const perfectUIEl    = document.getElementById('perfect-count');
    const greatUIEl      = document.getElementById('great-count');

    function updateScoreUI() {
      perfectUIEl.textContent = perfectCount;
      greatUIEl.textContent = greatCount;
    }

    function showCombo(text, count, glowColor) {
      comboTextEl.textContent = text;
      comboCountEl.textContent = 'x' + count;
      comboContainer.style.setProperty('--combo-glow', glowColor);
      comboContainer.classList.add('show');
      comboTextEl.style.animation = 'none';
      comboTextEl.offsetHeight;
      comboTextEl.style.animation = 'pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both';
      comboCountEl.style.animation = 'none';
      comboCountEl.offsetHeight;
      comboCountEl.style.animation = 'pop-in 0.3s 0.05s cubic-bezier(0.34, 1.56, 0.64, 1) both';
      if (comboHideTimer) clearTimeout(comboHideTimer);
      comboHideTimer = setTimeout(() => { comboContainer.classList.remove('show'); }, 1500);
    }

    function hideCombo() {
      comboContainer.classList.remove('show');
      if (comboHideTimer) { clearTimeout(comboHideTimer); comboHideTimer = null; }
    }

    // 加速提示
    let boostHintTimer = null;
    function showBoostHint() {
      const el = document.getElementById('boost-hint');
      el.classList.add('show');
      if (boostHintTimer) clearTimeout(boostHintTimer);
      boostHintTimer = setTimeout(() => { el.classList.remove('show'); }, 1200);
    }

    // ═══════════════════════════════════════════════════════
    //  鼠标控制
    // ═══════════════════════════════════════════════════════
    let mouseNX = 0;
    document.addEventListener('mousemove', (e) => {
      mouseNX = -(e.clientX / innerWidth - 0.5) * 2;
    });
    document.addEventListener('touchmove', (e) => {
      mouseNX = -(e.touches[0].clientX / innerWidth - 0.5) * 2;
    }, { passive: true });

    // ═══════════════════════════════════════════════════════
    //  动画辅助
    // ═══════════════════════════════════════════════════════
    const _v3 = new THREE.Vector3();

    function findGroupAt(z) {
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        if (z >= g.startZ && z < g.startZ + g.totalZ) return { index: i, group: g };
      }
      return null;
    }

    // ── 查询球在指定 Z 位置受到的侧风力 ──
    function getWindForceAt(z) {
      for (const zone of windZones) {
        if (z >= zone.startZ && z <= zone.endZ) {
          return zone.direction * zone.strength * WIND_ACCEL;
        }
      }
      return 0;
    }

    // 选择下一个跳跃目标组（按 Z 顺序向后找）
    function pickNextGroup(fromIdx) {
      for (let i = fromIdx + 1; i < groups.length; i++) {
        if (groups[i].landZ > ballZ) return { index: i, group: groups[i] };
      }
      // 不应该到这里，但防御一下
      return { index: Math.min(fromIdx + 1, groups.length - 1), group: groups[Math.min(fromIdx + 1, groups.length - 1)] };
    }

    // ── 判断球落到方形轨道时是否颜色匹配 ──
    function checkLandColorMatch(group, ballColorKey) {
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
    }

    // ═══════════════════════════════════════════════════════
    //  初始化跳跃
    // ═══════════════════════════════════════════════════════
    const clock = new THREE.Clock();
    let ballZ = 0;
    let ballX = 0;
    let jumpTimer = 0;
    let jumpFromZ = 0;
    let jumpToZ   = 0;
    let currentGroupIdx = 0;
    let currentBallColorKey = 'blue';

    function initJump() {
      // 页面加载时 groups 还未初始化（restartGame 才初始化），静默跳过
      if (groups.length === 0) { return; }
      const first = groups[0]; // 第一组一定是长直轨道
      if (!first || first.colorKey === undefined || first.colorKey === null) {
        console.warn('[GAME] initJump skipped: first group has no colorKey');
        return;
      }
      // 球站在第一个长直轨道上，获取其颜色
      currentBallColorKey = first.colorKey;
      sphereMat.color.copy(first.color);
      // activeColorKey 已经由 initGroups 的 appendGroup 内部正确设置

      jumpFromZ = first.landZ;
      ballZ     = jumpFromZ;
      const next = pickNextGroup(0);
      jumpToZ   = next.group.landZ;
    }
    initJump();

    // ═══════════════════════════════════════════════════════
    //  引导流程：欢迎 → 模式选择 → 开始 → 倒计时
    // ═══════════════════════════════════════════════════════

    // ── 粒子背景系统 ──
    function initParticles(canvasId, color1, color2, count) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return null;
      const ctx = canvas.getContext('2d');
      let w, h, particles = [], raf;

      function resize() {
        w = canvas.width = canvas.parentElement.clientWidth;
        h = canvas.height = canvas.parentElement.clientHeight;
      }
      resize();
      window.addEventListener('resize', resize);

      const colors = [color1, color2];
      for (let i = 0; i < (count || 60); i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          r: Math.random() * 2 + 0.5,
          alpha: Math.random() * 0.5 + 0.1,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }

      function draw() {
        ctx.clearRect(0, 0, w, h);
        particles.forEach(p => {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
          if (p.y < 0) p.y = h;
          if (p.y > h) p.y = 0;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color.replace('1)', p.alpha + ')');
          ctx.fill();
        });
        // 连线
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
              ctx.beginPath();
              ctx.moveTo(particles[i].x, particles[i].y);
              ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(130,180,255,${0.06 * (1 - dist / 120)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
        raf = requestAnimationFrame(draw);
      }
      draw();

      return {
        stop: function() {
          cancelAnimationFrame(raf);
          window.removeEventListener('resize', resize);
        }
      };
    }

    // 欢迎页粒子
    const welcomeParticles = initParticles('welcome-particles', 'rgba(255,106,176,1)', 'rgba(85,153,255,1)', 70);
    // 模式选择页粒子
    let modeParticles = null;

    // ── 欢迎页浮动装饰球 ──
    (function createWelcomeBalls() {
      const container = document.getElementById('welcome-balls');
      const colors = [
        'radial-gradient(circle at 35% 30%, #ffccd0, #ff6ab0 40%, #cc3366)',
        'radial-gradient(circle at 35% 30%, #c8e0ff, #5599ff 40%, #3366cc)',
        'radial-gradient(circle at 35% 30%, #fff8cc, #ffe066 40%, #ccaa22)',
        'radial-gradient(circle at 35% 30%, #dcc8ff, #a855f7 40%, #7733bb)',
        'radial-gradient(circle at 35% 30%, #c8ffe0, #44cc88 40%, #228855)',
        'radial-gradient(circle at 35% 30%, #ffd8c8, #ff8844 40%, #cc5522)',
      ];
      for (let i = 0; i < 18; i++) {
        const ball = document.createElement('div');
        ball.className = 'welcome-ball';
        const size = Math.random() * 24 + 8;
        ball.style.width = size + 'px';
        ball.style.height = size + 'px';
        ball.style.left = Math.random() * 100 + '%';
        ball.style.background = colors[Math.floor(Math.random() * colors.length)];
        ball.style.boxShadow = `0 0 ${size}px ${colors[Math.floor(Math.random() * colors.length)].match(/#[0-9a-f]+/i)?.[0] || '#5588ff'}40`;
        ball.style.animationDuration = (Math.random() * 6 + 5) + 's';
        ball.style.animationDelay = (Math.random() * 5) + 's';
        container.appendChild(ball);
      }
    })();

    // ── 游戏内 UI 显隐控制 ──
    function showGameUI() {
      document.getElementById('info').classList.add('visible');
      document.getElementById('score-board').classList.add('visible');
      document.getElementById('distance-board').classList.add('visible');
      showShieldBar();
      updateShieldUI();
      // 无尽模式隐藏目标距离，显示星级；闯关模式反之
      if (gameMode === 'endless') {
        document.getElementById('dist-target-row').style.display = 'none';
        document.getElementById('dist-stars-row').style.display = '';
      } else {
        document.getElementById('dist-target-row').style.display = '';
        document.getElementById('dist-stars-row').style.display = 'none';
      }
    }
    function hideGameUI() {
      document.getElementById('info').classList.remove('visible');
      document.getElementById('score-board').classList.remove('visible');
      document.getElementById('distance-board').classList.remove('visible');
      hideShieldBar();
    }

    // ── 页面切换管理（统一用 switchPage，取消未完成的过渡）──
    let _pendingSwitchTimer = null;
    function switchPage(fromId, toId, cb) {
      // 取消前一个未完成的切换
      if (_pendingSwitchTimer) { clearTimeout(_pendingSwitchTimer); _pendingSwitchTimer = null; }
      const from = document.getElementById(fromId);
      const to   = document.getElementById(toId);
      if (!from || !to) return;
      from.classList.remove('active');
      from.classList.add('fade-out');
      _pendingSwitchTimer = setTimeout(() => {
        _pendingSwitchTimer = null;
        from.style.display = 'none';
        from.classList.remove('fade-out');
        to.style.display = 'flex';
        to.classList.remove('fade-out');
        to.classList.add('active');
        if (cb) cb();
      }, 500);
    }

    // ② 模式选择页：点击任一模式进入开始界面
    updateModeStarsUI(); // 初始化星级显示

    document.getElementById('mode-endless').addEventListener('click', () => {
      playUIModeSelect();
      gameMode = 'endless';
      _currentStage = null;
      enterStartScreen();
    });
    document.getElementById('mode-stages').addEventListener('click', () => {
      playUIModeSelect();
      gameMode = 'stages';
      enterStageSelect();
    });

    // ── 关卡选择页 ──
    function buildStageCards() {
      const grid = document.getElementById('stage-cards-grid');
      if (!grid) return;
      grid.innerHTML = '';
      STAGE_CONFIGS.forEach(sc => {
        const unlocked = isStageUnlocked(sc.id);
        const earnedStars = getStageStars(sc.id);
        const card = document.createElement('div');
        card.className = 'stage-card';
        if (!unlocked) card.classList.add('locked');
        if (earnedStars >= 3) card.classList.add('completed-3');
        else if (earnedStars >= 1) card.classList.add('completed');
        const icons = [];
        if (sc.hasBoost) icons.push('🚀');
        if (sc.hasIce)   icons.push('❄️');
        if (sc.hasWind)  icons.push('💨');
        // 星级显示
        var starsHTML = '';
        if (!unlocked) {
          starsHTML = '<div class="card-lock">🔒</div>';
        } else if (earnedStars > 0) {
          starsHTML = '<div class="card-stars-earned">' + '★'.repeat(earnedStars) + '<span class="stars-dim">' + '★'.repeat(3 - earnedStars) + '</span></div>';
        }
        card.innerHTML =
          '<div class="card-number">' + (unlocked ? sc.id : '🔒') + '</div>' +
          '<div class="card-name-en">' + sc.name + '</div>' +
          '<div class="card-name-cn">' + sc.nameCN + '</div>' +
          '<div class="card-meta">' +
            '<span class="card-dist">🎯 ' + sc.targetDist + 'm</span>' +
            '<span class="card-icons">' + (icons.join(' ') || '🟢') + '</span>' +
          '</div>' +
          starsHTML;
        if (unlocked) {
          card.addEventListener('click', () => {
            playUIClick();
            _currentStage = sc;
            enterStartScreen(sc);
          });
        }
        grid.appendChild(card);
      });
    }

    function enterStageSelect() {
      modeParticles && modeParticles.stop();
      switchPage('mode-page', 'stage-select-page', () => {
        buildStageCards();
        // 重新初始化关卡选择粒子
        modeParticles = initParticles('stage-select-particles', 'rgba(255,200,60,1)', 'rgba(85,153,255,1)', 40);
      });
    }

    function exitToStageSelect() {
      hideGameUI();
      renderer.domElement.style.display = 'none';
      document.getElementById('gameover').classList.remove('show');
      document.getElementById('victory').classList.remove('show');
      victoryTriggered = false;
      // 清理
      removeBlackhole();
      gameOver = false;
      gameStarted = false;
      isPaused = false;
      boostIntensity = 0;
      boostDecaying = false;
      boostTimer = 0;
      iceSliding = false;
      iceGroupRef = null;
      burstActive = false;
      missFallActive = false;
      sphere.visible = true;
      sphere.scale.set(1, 1, 1);
      sphereMat.opacity = 1;
      ring.visible = true;
      shadowCircle.visible = true;
      shield = SHIELD_MAX;
      isShieldBroken = false;
      shieldBreakActive = false;
      shieldRing.visible = false;
      shieldRingMat.opacity = 0;

      // 直接显示关卡选择页（不走 switchPage，因为 start-screen 不一定可见）
      var sp = document.getElementById('stage-select-page');
      sp.style.display = 'flex';
      sp.classList.remove('fade-out');
      sp.classList.add('active');
      buildStageCards();
    }

    // 关卡选择页返回按钮
    document.getElementById('stage-select-back').addEventListener('click', () => {
      playUIBack();
      switchPage('stage-select-page', 'mode-page', () => {
        modeParticles = initParticles('mode-particles', 'rgba(168,85,247,1)', 'rgba(255,106,176,1)', 50);
      });
    });

    function enterStartScreen(stage) {
      modeParticles && modeParticles.stop();
      // 根据当前在哪页，决定从哪切过来
      var fromId = (gameMode === 'stages') ? 'stage-select-page' : 'mode-page';
      switchPage(fromId, 'start-screen', function() {
        // 更新模式徽章
        var badge = document.getElementById('start-mode-badge');
        var stageNameEl = document.getElementById('start-stage-name');
        var exitBtn = document.getElementById('exit-stage-btn');
        if (gameMode === 'endless') {
          badge.textContent = '∞ 无尽模式';
          badge.className = 'start-mode-badge endless-badge';
          stageNameEl.textContent = '';
          stageNameEl.style.display = 'none';
          exitBtn.style.display = 'none';
        } else {
          var sc = stage || _currentStage;
          badge.textContent = '★ 闯关模式';
          badge.className = 'start-mode-badge stages-badge';
          if (sc) {
            stageNameEl.textContent = '第' + sc.id + '关 · ' + sc.nameCN;
            stageNameEl.style.display = '';
          } else {
            stageNameEl.textContent = '';
            stageNameEl.style.display = 'none';
          }
          exitBtn.style.display = '';
        }
        document.getElementById('start-screen').classList.remove('hidden');
      });
    }

    function startCountdown(callback) {
      const overlay = document.getElementById('countdown');
      const numEl   = document.getElementById('countdown-num');
      overlay.classList.add('show');

      const sequence = ['3', '2', '1', 'GO'];
      let idx = 0;

      function showNext() {
        if (idx >= sequence.length) {
          overlay.classList.remove('show');
          callback();
          return;
        }
        const val = sequence[idx];
        numEl.textContent = val;
        numEl.className = val === 'GO' ? 'go' : '';
        numEl.style.animation = 'none';
        numEl.offsetHeight;
        numEl.style.animation = 'count-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both';
        // 倒计时音效：3→step1, 2→step2, 1→step3, GO→playUIGo
        if (val === 'GO') { playUIGo(); }
        else { playUICountdown(idx + 1); }
        idx++;
        setTimeout(showNext, 750);
      }
      showNext();
    }

    document.getElementById('start-btn').addEventListener('click', () => {
      playUIStartGame();
      try {
        restartGame();
      } catch(e) {
        console.error('[GAME] restartGame crashed:', e.message, e.stack);
        showFatalError('游戏初始化失败: ' + e.message + '\n请刷新页面重试');
        return;
      }
      gameStarted = false;
      renderer.domElement.style.display = 'block'; // 确保画布可见（exit 函数可能隐藏过）
      // 倒计时期间不隐藏画布 — 半透明背景透出轨道和球的画面
      const screen = document.getElementById('start-screen');
      screen.classList.add('hidden');
      setTimeout(() => {
        screen.style.display = 'none';
        startCountdown(() => {
          showGameUI();
          gameStarted = true;
        });
      }, 500);
    });

    // 开始界面退出按钮 → 返回关卡选择
    document.getElementById('exit-stage-btn').addEventListener('click', () => {
      playUIBack();
      const ss = document.getElementById('start-screen');
      ss.classList.add('hidden');
      setTimeout(() => {
        ss.style.display = 'none';
        exitToStageSelect();
      }, 300);
    });

    // 显示 start-screen 的辅助函数（重启时复用）
    function showStartScreen() {
      hideGameUI();
      const startScreen = document.getElementById('start-screen');
      const badge = document.getElementById('start-mode-badge');
      const stageNameEl = document.getElementById('start-stage-name');
      const exitBtn = document.getElementById('exit-stage-btn');
      if (gameMode === 'endless') {
        badge.textContent = '∞ 无尽模式';
        badge.className = 'start-mode-badge endless-badge';
        if (stageNameEl) { stageNameEl.textContent = ''; stageNameEl.style.display = 'none'; }
        if (exitBtn) { exitBtn.style.display = 'none'; }
      } else {
        badge.textContent = '★ 闯关模式';
        badge.className = 'start-mode-badge stages-badge';
        if (_currentStage && stageNameEl) {
          stageNameEl.textContent = '第' + _currentStage.id + '关 · ' + _currentStage.nameCN;
          stageNameEl.style.display = '';
        } else if (stageNameEl) {
          stageNameEl.textContent = '';
          stageNameEl.style.display = 'none';
        }
        if (exitBtn) { exitBtn.style.display = ''; }
      }
      startScreen.style.display = 'flex';
      const els = [startScreen.querySelector('h1'), startScreen.querySelector('.start-subtitle'), startScreen.querySelector('button'), startScreen.querySelector('.start-mode-badge')];
      if (stageNameEl) els.push(stageNameEl);
      if (exitBtn) els.push(exitBtn);
      els.forEach(el => { if (el) el.style.animation = 'none'; });
      startScreen.offsetHeight;
      els.forEach(el => { if (el) el.style.animation = ''; });
      startScreen.classList.remove('hidden');
    }

    // ═══════════════════════════════════════════════════════
    //  音效系统（AudioContext 合成音）
    // ═══════════════════════════════════════════════════════
    let _audioCtx = null;
    function getAudioCtx() {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (_audioCtx.state === 'suspended') _audioCtx.resume();
      return _audioCtx;
    }

    // ── 全局音量控制 ──
    let _masterGain = null;
    let _bgmGain = null;
    let _sfxGain = null;
    let _bgmPlaying = false;
    let _bgmNodes = null;

    function ensureMasterGain() {
      const ctx = getAudioCtx();
      if (!_masterGain) {
        _masterGain = ctx.createGain();
        _masterGain.gain.value = 0.9;
        _masterGain.connect(ctx.destination);
      }
      if (!_bgmGain) {
        _bgmGain = ctx.createGain();
        _bgmGain.gain.value = 0.35;
        _bgmGain.connect(_masterGain);
      }
      if (!_sfxGain) {
        _sfxGain = ctx.createGain();
        _sfxGain.gain.value = 1.0;
        _sfxGain.connect(_masterGain);
      }
    }

    function playShieldHitSound() {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(_sfxGain);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.18);
      } catch(e) {}
    }

    function playShieldWarningSound() {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(_sfxGain);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(90, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } catch(e) {}
    }

    function playShieldRegenSound() {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        // 主音：上行清脆"叮"
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(600, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.15);
        gain1.gain.setValueAtTime(0.3, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc1.connect(gain1); gain1.connect(_sfxGain);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.35);
        // 泛音：高频清脆"叮铃"
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1800, ctx.currentTime + 0.05);
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc2.connect(gain2); gain2.connect(_sfxGain);
        osc2.start(ctx.currentTime + 0.05);
        osc2.stop(ctx.currentTime + 0.4);
      } catch(e) {}
    }

    // ── 碎裂音效（冰凌碎裂——细碎高频"叮叮"） ──
    function playShatterSound() {
      try {
        const ctx = getAudioCtx();
        const now = ctx.currentTime;

        // 初始"咔"——极短极尖锐的玻璃断裂声
        const crack = ctx.createOscillator();
        const crackG = ctx.createGain();
        crack.type = 'sine';
        crack.frequency.setValueAtTime(8000, now);
        crack.frequency.exponentialRampToValueAtTime(3000, now + 0.015);
        crackG.gain.setValueAtTime(0.6, now);
        crackG.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
        crack.connect(crackG); crackG.connect(ctx.destination);
        crack.start(now); crack.stop(now + 0.025);

        // 细碎弹跳"叮叮"——高频正弦短脉冲，间隔递增模拟碎片越弹越慢
        const tinks = [
          { t: 0.03,  f: 5200, v: 0.35, d: 0.04 },
          { t: 0.06,  f: 6800, v: 0.30, d: 0.03 },
          { t: 0.09,  f: 4400, v: 0.28, d: 0.04 },
          { t: 0.13,  f: 7500, v: 0.22, d: 0.025 },
          { t: 0.18,  f: 5800, v: 0.18, d: 0.035 },
          { t: 0.24,  f: 8200, v: 0.14, d: 0.02 },
          { t: 0.31,  f: 4800, v: 0.11, d: 0.03 },
          { t: 0.38,  f: 6500, v: 0.08, d: 0.025 },
          { t: 0.46,  f: 3900, v: 0.06, d: 0.04 },
          { t: 0.55,  f: 7200, v: 0.04, d: 0.02 },
        ];
        tinks.forEach(tk => {
          const t = now + tk.t + (Math.random() - 0.5) * 0.01;
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(tk.f + (Math.random() - 0.5) * 800, t);
          g.gain.setValueAtTime(tk.v, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + tk.d);
          osc.connect(g); g.connect(ctx.destination);
          osc.start(t); osc.stop(t + tk.d + 0.005);
        });
      } catch(e) {}
    }

    // ── 自由落体"咻——"音效 ──
    function playMissFallSound() {
      try {
        const ctx = getAudioCtx();
        const dur = 1.0;
        // 噪声缓冲区
        const bufLen = ctx.sampleRate * dur;
        const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        // 带通滤波 + 频率从高到低扫描（模拟远离的多普勒效果）
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.setValueAtTime(4000, ctx.currentTime);
        bp.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + dur);
        bp.Q.setValueAtTime(1, ctx.currentTime);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        noise.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
        noise.start(ctx.currentTime);
        noise.stop(ctx.currentTime + dur);
        // 叠加下行音调（增加"掉落"感）
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + dur);
        g.gain.setValueAtTime(0.15, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + dur);
      } catch(e) {}
    }

    // ── 落地音效（清脆"嗒"） ──
    function playLandSound() {
      try {
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      } catch(e) {}
    }

    // ── UI 交互音效 ──

    // 通用点击（轻快"叮"）
    function playUIClick() {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(_sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } catch(e) {}
    }

    // 模式选择确认（更饱满的双音叮）
    function playUIModeSelect() {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        [880, 1320].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.15);
          osc.connect(gain); gain.connect(_sfxGain);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.15);
        });
      } catch(e) {}
    }

    // 开始游戏（三音上行 C-E-G）
    function playUIStartGame() {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
          osc.connect(gain); gain.connect(_sfxGain);
          osc.start(ctx.currentTime + i * 0.12);
          osc.stop(ctx.currentTime + i * 0.12 + 0.25);
        });
      } catch(e) {}
    }

    // 复活确认（温暖和弦 C-G-C'）
    function playUIRevive() {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        [523, 784, 1047].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.06 + 0.4);
          osc.connect(gain); gain.connect(_sfxGain);
          osc.start(ctx.currentTime + i * 0.06);
          osc.stop(ctx.currentTime + i * 0.06 + 0.4);
        });
      } catch(e) {}
    }

    // 退出/返回（低沉下行）
    function playUIBack() {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain); gain.connect(_sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } catch(e) {}
    }

    // 倒计时 3-2-1（逐级升高嘀）
    function playUICountdown(step) {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440 + (step - 1) * 110, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain); gain.connect(_sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } catch(e) {}
    }

    // 倒计时 GO（短促明亮高音）
    function playUIGo() {
      try {
        ensureMasterGain();
        const ctx = getAudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1047, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain); gain.connect(_sfxGain);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } catch(e) {}
    }

    // ═══════════════════════════════════════════════════════
    //  护盾系统核心逻辑
    // ═══════════════════════════════════════════════════════

    function updateShieldUI() {
      // 3格分段：0-33 / 34-66 / 67-100
      const cells = [
        document.getElementById('shield-cell-2'), // 右（高段）
        document.getElementById('shield-cell-1'), // 中
        document.getElementById('shield-cell-0'), // 左（低段，最后消失）
      ];
      const thresholds = [67, 34, 1]; // 每格对应的最低 shield 值
      const maxPerCell = 33; // 每格最大值

      cells.forEach((cell, i) => {
        const lo = thresholds[i];
        const hi = i === 0 ? 100 : lo + 32;
        const fill = cell.querySelector('.shield-cell-fill');

        cell.classList.remove('low', 'empty', 'regen-flash');

        if (shield < lo) {
          // 该格为空
          cell.classList.add('empty');
        } else {
          // 计算该格填充百分比
          const cellShield = Math.min(shield, hi) - lo + 1;
          const pct = Math.min(100, (cellShield / maxPerCell) * 100);
          fill.style.width = pct + '%';

          // 低护盾警告（最后一格不满时）
          if (shield < 34) {
            cell.classList.add('low');
          }
        }
      });
    }

    function showShieldBar() {
      document.getElementById('shield-bar').classList.add('visible');
    }
    function hideShieldBar() {
      document.getElementById('shield-bar').classList.remove('visible');
    }

    function shieldTakeDamage(amount) {
      if (isShieldBroken || shieldBreakActive) return;

      shield = Math.max(0, shield - amount);
      playShieldHitSound();
      updateShieldUI();

      // 护盾条震动
      const bar = document.getElementById('shield-bar');
      bar.classList.remove('hit');
      bar.offsetHeight; // reflow
      bar.classList.add('hit');

      // 光环闪红
      shieldRingMat.color.setHex(0xff3333);
      shieldRingMat.opacity = 0.9;
      shieldRegenFlashTimer = 0.15; // 短暂闪红后恢复

      if (shield <= 0) {
        triggerShieldBreak();
      }
    }

    function shieldRegen() {
      if (isShieldBroken || shieldBreakActive) return;

      shield = Math.min(SHIELD_MAX, shield + SHIELD_REGEN_AMOUNT);
      playShieldRegenSound();
      updateShieldUI();

      // 回充闪光
      const cells = document.querySelectorAll('.shield-cell');
      cells.forEach(c => {
        c.classList.remove('regen-flash');
        c.offsetHeight;
        c.classList.add('regen-flash');
      });

      // 光环短暂亮起
      shieldRegenFlashTimer = 0.4;
    }

    function triggerShieldBreak() {
      isShieldBroken = true;
      shieldBreakActive = true;
      shieldBreakTimer = 0;
      ring.visible = false;
      shadowCircle.visible = false;
      shieldRing.visible = false;
      document.getElementById('gameover-msg').textContent = '护盾碎裂，游戏结束！';
      playShieldHitSound();
    }

    function updateShieldBreak(dt) {
      if (!shieldBreakActive) return;
      shieldBreakTimer += dt;

      // 球缩小旋转
      const progress = Math.min(shieldBreakTimer / SHIELD_BREAK_DELAY, 1);
      const s = Math.max(0.01, 1 - progress);
      sphere.scale.setScalar(s);
      sphereMat.opacity = 1 - progress;
      sphere.rotation.x += dt * 12;
      sphere.rotation.z += dt * 9;

      if (shieldBreakTimer >= SHIELD_BREAK_DELAY) {
        shieldBreakActive = false;
        triggerBurst(sphere.position.clone(), new THREE.Color(0x50a0ff));
        saveBallDeathColor();
        gameOver = true;
        hideShieldBar();
        hideCombo();
      }
    }

    function updateShieldRingVisual(t) {
      if (isShieldBroken || shieldBreakActive) {
        shieldRing.visible = false;
        return;
      }

      shieldRing.visible = true;
      shieldRing.position.copy(sphere.position);
      shieldRing.rotation.z = -t * 0.3;
      shieldRing.rotation.y = Math.sin(t * 0.4) * 0.2;

      if (shieldRegenFlashTimer > 0) {
        // 回充闪光中 - 白色光环（不覆盖，用 else if 确保互斥）
        shieldRingMat.color.setHex(0xffffff);
        shieldRingMat.opacity = 0.9;
      } else if (shield < 34) {
        // 低护盾：红色脉冲
        const pulse = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 6));
        shieldRingMat.color.setHex(0xff3333);
        shieldRingMat.opacity = pulse;
      } else if (shield < 67) {
        // 中等：暗蓝
        shieldRingMat.color.setHex(0x3388cc);
        shieldRingMat.opacity = 0.4;
      } else {
        // 满盾：明亮蓝白
        shieldRingMat.color.setHex(0x66bbff);
        shieldRingMat.opacity = 0.6;
      }
    }

    function updateShieldEffects(dt) {
      // 回充闪光衰减
      if (shieldRegenFlashTimer > 0) {
        shieldRegenFlashTimer -= dt;
        if (shieldRegenFlashTimer <= 0) {
          shieldRegenFlashTimer = 0;
        }
      }

      // 低护盾警告音（每2秒）
      if (shield > 0 && shield < 34 && !isShieldBroken && !shieldBreakActive) {
        shieldWarningTimer += dt;
        if (shieldWarningTimer >= 2.0) {
          shieldWarningTimer = 0;
          playShieldWarningSound();
        }
      } else {
        shieldWarningTimer = 0;
      }
    }

    // ═══════════════════════════════════════════════════════
    //  Game Over / Victory 处理
    // ═══════════════════════════════════════════════════════


    // ═══════════════════════════════════════════════════════
    //  Game Over / Victory 处理
    // ═══════════════════════════════════════════════════════

    // 显示 Game Over 覆盖层时，更新内容
    function showGameOver() {
      // 闯关模式：显示进度 + "再来一次" + "退出本关"
      if (gameMode === 'stages') {
        var finalDist = Math.round(ballZ);
        var targetDist = _currentStage ? _currentStage.targetDist : 100;
        var pct = Math.min(100, Math.round(finalDist / targetDist * 100));
        document.getElementById('go-stars-earned').textContent = '进度 ' + pct + '% (' + finalDist + 'm / ' + targetDist + 'm)';
        document.getElementById('go-stars-earned').style.fontSize = '1rem';
        document.getElementById('exit-endless-btn').textContent = '再来一次 ↺';
        document.getElementById('exit-endless-btn').classList.add('restart-mode');
        document.getElementById('exit-endless-btn').classList.remove('exit-btn');
        document.getElementById('exit-endless-btn').style.background = 'linear-gradient(135deg, #ff6ab0, #ffe066, #5599ff)';
        document.getElementById('exit-endless-btn').style.color = '#0a0a1a';
        document.getElementById('exit-endless-btn').style.boxShadow = '0 0 30px rgba(255,106,176,0.6), 0 0 60px rgba(85,153,255,0.3)';
        document.getElementById('ad-revive-btn').style.display = 'none';
        document.getElementById('star-revive-btn').style.display = '';
        document.getElementById('star-revive-btn').textContent = '退出本关';
        document.getElementById('star-revive-btn').classList.remove('star-btn');
        document.getElementById('star-revive-btn').style.background = 'linear-gradient(135deg, #8844aa, #aa66cc)';
        document.getElementById('star-revive-btn').style.color = '#fff';
        document.getElementById('star-revive-btn').style.boxShadow = '0 0 20px rgba(136,68,170,0.3)';
        document.getElementById('star-revive-btn').classList.remove('disabled');
        document.getElementById('gameover').classList.add('show');
        return;
      }
      // 无尽模式：更新内容并显示
      document.getElementById('go-stars-earned').textContent = '★ ' + sessionStars;
      document.getElementById('go-stars-earned').style.fontSize = '';
      document.getElementById('exit-endless-btn').textContent = '退出无尽模式';
      document.getElementById('exit-endless-btn').classList.remove('restart-mode');
      document.getElementById('exit-endless-btn').classList.add('exit-btn');
      document.getElementById('exit-endless-btn').style.background = '';
      document.getElementById('exit-endless-btn').style.color = '';
      document.getElementById('exit-endless-btn').style.boxShadow = '';
      document.getElementById('ad-revive-btn').style.display = '';
      document.getElementById('star-revive-btn').style.display = '';
      const starBtn = document.getElementById('star-revive-btn');
      if (sessionStars <= 0) {
        starBtn.style.display = 'none';
      } else {
        starBtn.style.display = '';
        starBtn.classList.remove('disabled');
        const cost = Math.max(1, Math.floor(sessionStars * 0.5));
        starBtn.textContent = '使用 ' + cost + ' ★ 复活';
        starBtn.classList.add('star-btn');
        starBtn.style.background = '';
        starBtn.style.color = '';
        starBtn.style.boxShadow = '';
      }
      document.getElementById('gameover').classList.add('show');
    }

    // 复活后恢复球
    function revivePlayer() {
      gameOver = false;
      gameStarted = false;
      // 重置加速状态
      boostIntensity = 0;
      boostDecaying = false;
      boostTimer = 0;
      sphereMat.emissiveIntensity = 0;
      // 重置冰霜段状态
      iceSliding = false;
      iceGroupRef = null;
      iceSlideAccelDir = 0;
      iceAccelTimer = 0;
      iceSlideVelX = 0;
      // 重置下坠动画（复活时清除，避免球还在下坠中）
      missFallActive = false;
      missFallTimer  = 0;
      missFallVelY   = 0;
      sphere.visible = true;
      ring.visible = true;
      shadowCircle.visible = true;
      sphere.scale.set(1, 1, 1);
      sphereMat.opacity = 1;
      // 恢复死亡时的颜色（球死什么色，复活什么色）
      sphereMat.color.copy(lastDeathColor);
      currentBallColorKey = lastDeathColorKey;
      // 复活时护盾恢复满值
      shield = SHIELD_MAX;
      safeLandCount = 0;
      isShieldBroken = false;
      wasHitThisJump = false;
      shieldBreakActive = false;
      shieldBreakTimer = 0;
      shieldWarningTimer = 0;
      shieldRegenFlashTimer = 0;
      shieldRingMat.opacity = 0;
      shieldRing.visible = false;

      // 把球放回安全位置（在哪跌倒在哪复活）
      let landed = findGroupAt(jumpToZ);
      if (!landed) {
        // 找不到就向后扫第一个可用 group
        for (let i = 0; i < groups.length; i++) {
          landed = { index: i, group: groups[i] }; break;
        }
      }
      if (landed) {
        const g = landed.group;
        if (g.type === 5) {
          // 冰霜段复活：落在跌倒的精确位置，继续滑行
          ballX = 0;
          ballZ = jumpToZ;          // 跌倒时记录的 ballZ
          iceSliding = true;
          iceGroupRef = g;
          iceSlideAccelDir = 0;
          iceAccelTimer = 0;
          iceSlideVelX = 0;
          jumpFromZ = jumpToZ;
          currentGroupIdx = landed.index;
          // jumpToZ 在冰面滑动中不使用，滑完冰面后自然过渡
        } else if (g.type === 1 || g.type === 4) {
          // 长直/加速轨道：居中
          ballX = 0;
          ballZ = g.landZ;
          jumpFromZ = g.landZ;
          const next = pickNextGroup(landed.index);
          jumpToZ = next.group.landZ;
          currentGroupIdx = landed.index;
        } else {
          // 方形轨道：使用死亡时保存的颜色，匹配对应方块位置
          let matchPart = g.parts[0];
          for (let pi = 0; pi < g.parts.length; pi++) {
            if (g.partColorKeys[pi] === lastDeathColorKey) {
              matchPart = g.parts[pi];
              break;
            }
          }
          ballX = matchPart.mesh.position.x;
          ballZ = g.landZ;
          jumpFromZ = g.landZ;
          const next = pickNextGroup(landed.index);
          jumpToZ = next.group.landZ;
          currentGroupIdx = landed.index;
        }
      }
      sphere.position.set(ballX, BOUNCE_FLOOR, ballZ);
      jumpTimer = 0;
    }

    // 退出无尽模式 → 回到模式选择页
    function exitToEndless() {
      hideGameUI();
      renderer.domElement.style.display = 'none'; // 隐藏游戏画布
      document.getElementById('gameover').classList.remove('show');
      updateModeStarsUI();
      // 重新显示模式选择页
      const modePage = document.getElementById('mode-page');
      modePage.style.display = 'flex';
      modePage.classList.remove('fade-out');
      modePage.classList.add('active');
      modeParticles = initParticles('mode-particles', 'rgba(168,85,247,1)', 'rgba(255,106,176,1)', 50);
    }

    // 观看广告复活
    function playAdThenRevive() {
      const overlay = document.getElementById('ad-overlay');
      const video = document.getElementById('ad-video');
      const timerEl = document.getElementById('ad-timer');
      const skipBtn = document.getElementById('ad-skip');
      overlay.classList.add('show');
      video.currentTime = 0;
      video.play().catch(() => {});

      let remaining = 10;
      timerEl.textContent = remaining + 's';
      skipBtn.classList.remove('enabled');

      const timer = setInterval(() => {
        remaining--;
        timerEl.textContent = remaining + 's';
        if (remaining <= 0) {
          clearInterval(timer);
          timerEl.textContent = '可跳过';
          skipBtn.classList.add('enabled');
        }
      }, 1000);

      function finishAd() {
        clearInterval(timer);
        video.pause();
        overlay.classList.remove('show');
        document.getElementById('gameover').classList.remove('show');
        revivePlayer();
        startCountdown(() => { showGameUI(); gameStarted = true; });
      }

      skipBtn.onclick = finishAd;
      video.onended = finishAd;
    }

    // 星复活
    function starRevive() {
      if (sessionStars <= 0) return;
      const cost = Math.max(1, Math.floor(sessionStars * 0.5));
      sessionStars -= cost;
      totalStars -= cost;
      saveStars();
      updateStarsUI();
      document.getElementById('gameover').classList.remove('show');
      revivePlayer();
      startCountdown(() => { showGameUI(); gameStarted = true; });
    }

    // ── 按钮事件 ──
    // 退出按钮（无尽模式退回选择，闯关模式重启）
    document.getElementById('exit-endless-btn').addEventListener('click', () => {
      playUIBack();
      if (gameMode === 'endless') {
        exitToEndless();
      } else {
        document.getElementById('gameover').classList.remove('show');
        renderer.domElement.style.display = 'none';
        try { restartGame(); } catch(e) { console.error('[GAME] restartGame crashed:', e); showFatalError('游戏重启失败: ' + e.message); return; }
        gameStarted = false;
        showStartScreen();
      }
    });

    // 观看广告复活
    document.getElementById('ad-revive-btn').addEventListener('click', () => {
      playUIRevive();
      playAdThenRevive();
    });

    // 使用星复活（闯关模式复用为"退出本关"）
    document.getElementById('star-revive-btn').addEventListener('click', () => {
      if (gameMode === 'stages') {
        playUIBack();
        document.getElementById('gameover').classList.remove('show');
        exitToStageSelect();
      } else {
        playUIRevive();
        starRevive();
      }
    });

    // Victory 按钮
    document.getElementById('victory-btn').addEventListener('click', () => {
      document.getElementById('victory').classList.remove('show');
      renderer.domElement.style.display = 'none';
      if (gameMode === 'stages' && _currentStage) {
        // 闯关模式：如果有下一关且已解锁 → 进入下一关
        var nextId = _currentStage.id + 1;
        if (nextId <= STAGE_CONFIGS.length && isStageUnlocked(nextId)) {
          _currentStage = STAGE_CONFIGS[nextId - 1];
          try { restartGame(); } catch(e) { console.error('[GAME] restartGame crashed:', e); showFatalError('游戏重启失败: ' + e.message); return; }
          gameStarted = false;
          showStartScreen();
        } else {
          exitToStageSelect();
        }
      } else {
        try { restartGame(); } catch(e) { console.error('[GAME] restartGame crashed:', e); showFatalError('游戏重启失败: ' + e.message); return; }
        gameStarted = false;
        showStartScreen();
      }
    });

    // Victory 退出按钮（闯关模式专属）
    document.getElementById('victory-exit-btn').addEventListener('click', () => {
      playUIBack();
      document.getElementById('victory').classList.remove('show');
      exitToStageSelect();
    });

    // ── 覆写 showGameOver 调用：在无尽的 Game Over 显示时使用新逻辑 ──
    // 原来的 updateMissFall 和 updateBurst 末尾调用 document.getElementById('gameover').classList.add('show')
    // 改为调用 showGameOver()

    function restartGame() {
      initGroups();

      // fallback: 如果 initGroups 完全失败，强制创建基础平台
      if (groups.length === 0) {
        console.warn('[GAME] restartGame: initGroups produced 0 groups, creating fallback');
        const fallback = createLongPlatform(0);
        fallback.startZ = 0;
        groups.push(fallback);
        activeColorKey = fallback.colorKey;
        while (groups.length < MIN_GROUPS) {
          const z = groups[groups.length - 1].startZ + groups[groups.length - 1].totalZ;
          const g = createLongPlatform(z);
          g.startZ = z;
          groups.push(g);
        }
      }

      // 重置粒子
      particleMeshes.forEach(m => { m.visible = false; });
      burstActive = false;
      burstTimer  = 0;
      hideBoostParticles();
      missFallActive = false;
      missFallTimer  = 0;
      missFallVelY   = 0;

      // 重置护盾
      shield = SHIELD_MAX;
      safeLandCount = 0;
      isShieldBroken = false;
      wasHitThisJump = false;
      shieldBreakActive = false;
      shieldBreakTimer = 0;
      shieldWarningTimer = 0;
      shieldRegenFlashTimer = 0;
      shieldRingMat.opacity = 0;
      shieldRing.visible = false;

      // 重置黑洞
      removeBlackhole();
      blackholeSpawned = false;
      blackholeActive = false;
      victoryTriggered = false;
      victoryAnimActive = false;
      victoryAnimTimer = 0;

      // 重置涟漪
      ripples.forEach(r => {
        r.active = false;
        r.mesh.visible = false;
        r.mat.uniforms.uOpacity.value = 0;
        r.particles.forEach(p => { p.mesh.visible = false; });
      });
      landBounceActive = false;
      landBounceTimer  = 0;

      // 重置球
      sphere.visible = true;
      ring.visible   = true;
      shadowCircle.visible = true;
      sphere.scale.set(1, 1, 1);
      sphereMat.color.set(0.5, 0.7, 1.0);
      sphereMat.opacity = 1;

      // 重置状态
      gameOver = false;
      ballZ = 0;
      ballX = 0;
      jumpTimer = 0;
      mouseNX = 0;
      comboCount = 0;
      perfectCount = 0;
      greatCount = 0;
      updateScoreUI();
      hideCombo();

      // 重置距离 UI
      document.getElementById('dist-current').innerHTML = '0<span class="dist-unit">m</span>';
      const targetEl = document.getElementById('dist-target-val');
      targetEl.textContent = '???m';
      targetEl.classList.remove('revealed', 'completed');

      // 重置本局星级
      sessionStars = 0;
      lastStarDist = 0;
      updateStarsUI();

      // 重置加速状态
      boostIntensity = 0;
      boostDecaying = false;
      boostTimer = 0;
      sphereMat.emissiveIntensity = 0;

      // 重置冰霜段状态
      iceSliding = false;
      iceGroupRef = null;
      iceSlideAccelDir = 0;
      iceAccelTimer = 0;
      iceSlideVelX = 0;

      // 重置侧风段状态
      windZones.forEach(z => {
        if (z.lines) {
          scene.remove(z.lines);
          z.lines.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
          });
        }
      });
      windZones = [];
      windNextZoneAt = WIND_FIRST_ZONE_AT;

      // ── 重置渐进难度状态（无尽模式）──
      nextPathCheckpoint = 900;
      pathChoiceActive = false;
      currentPathStyle = 1;
      currentPhase = 0;
      phaseIceCount = 0;
      phaseWindCount = 0;
      totalBoostGenerated = 0;
      lastBoostZ = -999;
      lastIceEndZ = -999;
      lastWindEndZ = -999;


      const first = groups[0];
      // 球站在第一个长直轨道上，获取其颜色
      currentBallColorKey = first.colorKey;
      sphereMat.color.copy(first.color);
      // activeColorKey 已经由 initGroups 的 appendGroup 内部正确设置

      jumpFromZ = first.landZ;
      ballZ     = jumpFromZ;
      ballX     = 0;
      // ★ 同步球体 mesh 位置，确保倒计时画面能看到球在正确位置
      sphere.position.set(ballX, BOUNCE_FLOOR, ballZ);
      const next = pickNextGroup(0);
      jumpToZ   = next.group.landZ;
      currentGroupIdx = 0;

      camera.position.set(0, 4, -10);

      // 闯关模式：在 targetDist 精确位置生成黑洞
      if (gameMode === 'stages' && _currentStage) {
        blackhole = createBlackhole(_currentStage.targetDist);
        blackholeSpawned = true;
        blackholeActive = true;
        // 更新距离面板目标值
        const targetEl2 = document.getElementById('dist-target-val');
        targetEl2.textContent = _currentStage.targetDist + 'm';
        targetEl.classList.add('revealed');
        targetEl.classList.remove('completed');
      }
    }

    // ═══════════════════════════════════════════════════════
    //  动画主循环
    // ═══════════════════════════════════════════════════════
    function animate() {
      requestAnimationFrame(animate);
      try {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t  = clock.elapsedTime;

      // ── 更新冰面 shader uniforms（始终运行）──
      for (let i = 0; i < activeIceMats.length; i++) {
        activeIceMats[i].uniforms.uTime.value = t;
        activeIceMats[i].uniforms.uCameraPos.value.copy(camera.position);
      }

      // ── 粒子更新（始终运行，即使 gameOver）
      updateBurst(dt);
      updateBoostScatter(dt);
      updateRipples(dt);
      updateMissFall(dt);
      updateBlackhole(dt);
      updateVictoryAnim(dt);
      updateShieldBreak(dt);

      if (gameOver || shieldBreakActive) {
        return;
      }
      if (!gameStarted) {
        // 倒计时/等待期间仍渲染场景，确保半透明遮罩下可见轨道和球
        // ★ 同步球体位置（restartGame 可能更新了 ballZ/ballX）
        sphere.position.set(ballX, BOUNCE_FLOOR, ballZ);
        const camT = new THREE.Vector3(ballX, CAM_OFFSET.y, ballZ + CAM_OFFSET.z);
        camera.position.lerp(camT, 0.06);
        camera.lookAt(ballX, 0.0, ballZ);
        renderer.render(scene, camera);
        return;
      }

      // ── 暂停状态：冻结所有游戏逻辑，仅保留场景渲染 ──
      if (isPaused) {
        renderer.render(scene, camera);
        return;
      }

      // 加速强度管理：全速期 → 衰减期 → 归零
      if (boostIntensity > 0) {
        if (boostDecaying) {
          boostIntensity -= dt / BOOST_DECAY_DURATION;
          if (boostIntensity <= 0) {
            boostIntensity = 0;
            boostDecaying = false;
            boostTimer = 0;
          }
        } else {
          boostTimer += dt;
          if (boostTimer >= BOOST_DURATION) {
            boostDecaying = true;
          }
        }
      }
      const curJumpDur = BASE_JUMP_DURATION + (BOOST_JUMP_DURATION - BASE_JUMP_DURATION) * boostIntensity;


      // ── 冰霜段滑行模式（type5）：球贴地滑行，不弹跳 ──
      if (iceSliding) {
        // Z 方向匀速前进
        ballZ += ICE_SLIDE_SPEED * dt;

        // 随机横向推力：每隔 ICE_ACCEL_INTERVAL 秒切换方向
        iceAccelTimer += dt;
        if (iceAccelTimer >= ICE_ACCEL_INTERVAL) {
          iceAccelTimer = 0;
          const rand = Math.random();
          iceSlideAccelDir = rand < 0.08 ? 0 : (rand < 0.54 ? -1 : 1);
        }
        // 速度驱动：加速度累积到速度，摩擦力缓缓衰减
        if (iceSlideAccelDir !== 0) {
          iceSlideVelX += iceSlideAccelDir * ICE_SLIDE_ACCEL * dt;
        }
        // 低摩擦：速度不会立刻归零，惯性能累积
        iceSlideVelX *= Math.max(0, 1 - ICE_FRICTION * dt);
        ballX += iceSlideVelX * dt;

        // 侧风叠加到冰面滑行（冰面上风力稍弱）
        const windForce = getWindForceAt(ballZ);
        if (windForce !== 0) {
          iceSlideVelX += windForce * 0.7 * dt;
        }

        // 玩家鼠标控制：始终根据鼠标位置施加纠正力
        // 鼠标在中央（targetX≈0）时会把速度往 0 拉，减弱但不消除惯性；
        // 鼠标偏向某侧时对抗随机漂移，给玩家足够但不过分的控制感。
        {
          const targetX = mouseNX * MOUSE_SENSITIVITY * innerWidth * 0.5;
          const correction = (targetX - ballX) * 1.5;  // 持续拉力系数（弱，只辅助不主导）
          iceSlideVelX += correction * dt;
        }

        // 球贴地面，微小上下浮动
        const ballY = BOUNCE_FLOOR + Math.sin(t * 3) * 0.03;
        sphere.position.set(ballX, ballY, ballZ);

        // 球在冰面上持续旋转（滚动效果）
        sphere.rotation.x = -ballZ;

        // 变形：轻微扁平
        sphere.scale.set(1.05, 0.95, 1.05);

        // 光环跟随
        ring.position.copy(sphere.position);
        ring.rotation.z = t * 0.4;
        ring.rotation.y = Math.sin(t * 0.5) * 0.3;

        // 护盾视觉
        updateShieldRingVisual(t);
        updateShieldEffects(dt);

        // 阴影
        shadowCircle.position.set(0, PLAT_Y + 0.01, ballZ);
        shadowCircle.material.opacity = 0.45;
        shadowCircle.scale.setScalar(1.0);

        // 灯光跟随
        mainLight.position.set(ballZ + 5, 8, ballZ + 6);
        mainLight.target.position.set(ballZ, 0, ballZ);
        mainLight.target.updateMatrixWorld();
        fillLight.position.set(ballZ - 4, 2, ballZ - 3);
        backLight.position.set(ballZ + 3, -2, ballZ - 4);

        // 相机跟随
        _v3.copy(sphere.position).add(CAM_OFFSET);
        camera.position.lerp(_v3, 0.06);
        camera.lookAt(sphere.position);

        // 更新距离和星级
        const distEl = document.getElementById('dist-current');
        const distVal = Math.max(0, Math.round(ballZ));
        distEl.innerHTML = distVal + '<span class="dist-unit">m</span>';
        if (gameMode === 'endless') {
          const currentStarFloor = Math.floor(distVal / STAR_PER_DIST);
          const lastStarFloor = Math.floor(lastStarDist / STAR_PER_DIST);
          if (currentStarFloor > lastStarFloor) {
            const newStars = currentStarFloor - lastStarFloor;
            for (let i = 0; i < newStars; i++) addSessionStar();
          }
          lastStarDist = distVal;
          updateStarsUI();
        }
        // ── 三分路检查点（仅无尽模式）──
        checkPathCheckpoint(distVal);

        // 检查是否滑出冰面
        if (iceGroupRef) {
          const iceEndZ = iceGroupRef.startZ + ICE_D;
          const halfW = ICE_W / 2;
          // X 超出冰面宽度 → 掉落
          if (Math.abs(ballX) > halfW) {
            iceSliding = false;
            iceGroupRef = null;
            jumpToZ = ballZ; // 记录跌倒位置，复活时落回此处
            saveBallDeathColor();
            gameOver = true;
            hideCombo();
            triggerMissFall();
            renderer.render(scene, camera);
            return;
          }
          // Z 滑过冰面末端 → 结束滑行，恢复弹跳
          if (ballZ >= iceEndZ) {
            iceSliding = false;
            iceGroupRef = null;
            // 结束滑行后，找到当前所在 group 并设为下一次跳跃起点
            const landed = findGroupAt(ballZ);
            if (landed) {
              currentGroupIdx = landed.index;
            }
            jumpFromZ = ballZ;
            jumpTimer = 0;
            const next = pickNextGroup(currentGroupIdx);
            jumpToZ = next.group.landZ;
            currentGroupIdx = next.index;
          }
        }

        updateFrostParticles(t);
        ensureGroupsAhead();
        removeOldGroups();

        // 侧风生成 + 风线动画（冰面滑行也要处理）
        // ── 确定性预规划：优先强制生成计划内的风区 ──
        if (gameMode === 'endless' && plannedWindPositions.length > 0 && ballZ > plannedWindPositions[0]) {
          const planZ = plannedWindPositions.shift();
          const wRules = getPhaseRules(getCurrentPhase(planZ));
          if (ballZ - lastBoostZ >= wRules.windBuf && phaseWindCount < wRules.maxWind) {
            generateWindZone(planZ);
          } else if (ballZ - lastBoostZ < wRules.windBuf) {
            plannedWindPositions.unshift(lastBoostZ + wRules.windBuf + 15);
          }
        }
        if ((gameMode === 'endless' || (_currentStage && _currentStage.hasWind)) && ballZ > windNextZoneAt) {
          generateWindZone(Math.max(windNextZoneAt, ballZ + 10));
        }
        for (const zone of windZones) {
          if (!zone.lines) continue;
          const lines = zone.lines.children;
          const driftDir = -zone.direction;  // 左风→右漂, 右风→左漂
          for (let i = 0; i < lines.length; i++) {
            const ud = lines[i].userData;
            // 垂直摆动
            lines[i].position.y = Math.sin(t * 1.5 + ud.phase) * 0.3;
            // 水平漂移：风往哪吹，线往反方向飘
            ud.driftOffset += driftDir * ud.driftSpeed * dt;
            lines[i].position.x = ud.driftOffset;
            // 漂出屏幕后从对面重新进入
            if (Math.abs(ud.driftOffset) > 14) {
              ud.driftOffset = -driftDir * (8 + Math.random() * 4);
            }
          }
        }

        renderer.render(scene, camera);
        return; // 滑行模式不执行正常弹跳逻辑
      }

      jumpTimer += dt;
      const localPhase = Math.min(jumpTimer / curJumpDur, 1);

      ballZ = jumpFromZ + (jumpToZ - jumpFromZ) * localPhase;

      const targetX = mouseNX * MOUSE_SENSITIVITY * innerWidth * 0.5;

      // 侧风：先施加风力，再降低鼠标操控强度
      const windForce = getWindForceAt(ballZ);
      const windActive = windForce !== 0;
      if (windActive) {
        ballX += windForce * dt;
      }
      // 有风时鼠标 lerp 减弱，让风真正能吹偏球
      const lerpFactor = windActive ? 0.05 : 0.1;
      ballX += (targetX - ballX) * lerpFactor;

      const ballY_base = BOUNCE_FLOOR + BOUNCE_HEIGHT * 4 * localPhase * (1 - localPhase);

      // 落地缓冲：球触地后的下陷弹起偏移
      let landOffsetY = 0;
      let landSquashExtra = 1;
      if (landBounceActive) {
        landBounceTimer += dt;
        const lp = Math.min(landBounceTimer / LAND_BOUNCE_DUR, 1);
        // 先下压后弹起，使用衰减振荡
        const sink = Math.sin(lp * Math.PI) * (1 - lp);
        landOffsetY = -0.28 * sink;                 // 最大下陷约 0.28 单位
        landSquashExtra = 1 - 0.18 * Math.sin(lp * Math.PI) * (1 - lp); // Y 轴额外压扁
        if (lp >= 1) landBounceActive = false;
      }

      const ballY = ballY_base + landOffsetY;
      sphere.position.set(ballX, ballY, ballZ);

      // ── 更新行进距离 ──
      const distEl = document.getElementById('dist-current');
      const distVal = Math.max(0, Math.round(ballZ));
      distEl.innerHTML = distVal + '<span class="dist-unit">m</span>';

      // ── 三分路检查点（仅无尽模式）──
      checkPathCheckpoint(distVal);

      // ── 星级计算（仅无尽模式）──
      if (gameMode === 'endless') {
        const currentStarFloor = Math.floor(distVal / STAR_PER_DIST);
        const lastStarFloor = Math.floor(lastStarDist / STAR_PER_DIST);
        if (currentStarFloor > lastStarFloor) {
          const newStars = currentStarFloor - lastStarFloor;
          for (let i = 0; i < newStars; i++) addSessionStar();
        }
        lastStarDist = distVal;
        updateStarsUI();
      }

      const groundRatio = Math.pow(1 - 4 * localPhase * (1 - localPhase), 2);
      const squash = (1 - 0.15 * groundRatio) * landSquashExtra;
      sphere.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      sphere.rotation.x = -ballZ;

      ring.position.copy(sphere.position);
      ring.rotation.z = t * 0.4;
      ring.rotation.y = Math.sin(t * 0.5) * 0.3;

      // 护盾光环视觉
      updateShieldRingVisual(t);
      updateShieldEffects(dt);

      // 每次跳跃开始时重置受击标记
      if (jumpTimer < dt * 2) {
        wasHitThisJump = false;
      }

      shadowCircle.position.set(0, PLAT_Y + 0.01, ballZ);
      shadowCircle.material.opacity = groundRatio * 0.5;
      shadowCircle.scale.setScalar(0.5 + groundRatio * 0.8);

      mainLight.position.set(ballZ + 5, 8, ballZ + 6);
      mainLight.target.position.set(ballZ, 0, ballZ);
      mainLight.target.updateMatrixWorld();
      fillLight.position.set(ballZ - 4, 2, ballZ - 3);
      backLight.position.set(ballZ + 3, -2, ballZ - 4);

      _v3.copy(sphere.position).add(CAM_OFFSET);
      camera.position.lerp(_v3, 0.06);
      camera.lookAt(sphere.position);

      // ── 黑洞引力场：球经过附近时轻微偏移 ──
      if (blackholeActive && blackhole && !victoryTriggered) {
        const bhPos = blackhole.group.position;
        const bhDistZ = bhPos.z - sphere.position.z;
        // 前方 20 单位内开始受到微弱引力
        if (bhDistZ > 0 && bhDistZ < 20) {
          const strength = Math.max(0, 1 - bhDistZ / 20) * 0.3;
          ballX += (bhPos.x - ballX) * strength * dt * 2;
        }
      }

      // ── 落地判定
      if (localPhase >= 1) {
        jumpTimer = 0;
        jumpFromZ = jumpToZ;

        // ── 落地缓冲动画
        landBounceActive = true;
        landBounceTimer  = 0;
        playLandSound();

        const landed = findGroupAt(jumpToZ);
        if (landed) {
          const g = landed.group;

          // ── 落点 X 范围检测 ──
          let onTrack = false;
          if (g.type === 1 || g.type === 4) {
            onTrack = Math.abs(ballX) <= LONG_W / 2;
          } else if (g.type === 5) {
            onTrack = Math.abs(ballX) <= ICE_W / 2;
          } else {
            g.parts.forEach(p => {
              if (Math.abs(ballX - p.mesh.position.x) <= SQ_W / 2) onTrack = true;
            });
          }
          if (!onTrack) {
            saveBallDeathColor();
            gameOver = true;
            hideCombo();
            // 自由落体 Game Over
            triggerMissFall();
            return;
          }

          // ── type5 冰霜段：进入滑行模式 ──
          if (g.type === 5) {
            iceSliding = true;
            iceSlideZ = ballZ;
            iceSlideX = ballX;
            iceGroupRef = g;
            iceSlideAccelDir = 0;
            iceAccelTimer = 0;
            iceSlideVelX = 0;
            currentGroupIdx = landed.index;
            // 冰霜段不变色不计分，只触发一个冰面涟漪
            triggerRipple(0, g.landZ, ICE_COLOR.clone(), ICE_W, ICE_D);
            return;
          }

          // ── type4 加速轨道处理（白色涟漪，触发加速，不变色不计分）──
          if (g.type === 4) {
            triggerRipple(0, g.landZ, new THREE.Color(0xffffff), LONG_W, LONG_D);
            triggerBoostScatter();
            boostIntensity = 1;
            boostDecaying = false;
            boostTimer = 0;
            showBoostHint();
            currentGroupIdx = landed.index;
          } else {

          // ── 触发与平台同形的方形涟漪（颜色用轨道本身的颜色）──
          if (g.type === 1) {
            // 长直轨道
            triggerRipple(0, g.landZ, g.color.clone(), LONG_W, LONG_D);
          } else {
            // 方形轨道（type2/3）：找最近的那块
            let closestPart = g.parts[0];
            let closestDist = Infinity;
            g.parts.forEach(p => {
              const d = Math.abs(ballX - p.mesh.position.x);
              if (d < closestDist) { closestDist = d; closestPart = p; }
            });
            triggerRipple(
              closestPart.mesh.position.x,
              g.landZ,
              closestPart.mesh.material.color.clone(),
              SQ_W, SQ_D
            );
          }

          // ── 颜色碰撞检测（仅方形轨道）
          if (g.type === 2 || g.type === 3) {
            const safe = checkLandColorMatch(g, currentBallColorKey);
            if (!safe) {
              saveBallDeathColor();
              gameOver = true;
              document.getElementById('gameover-msg').textContent = '颜色不匹配，球碎了！';
              triggerBurst(sphere.position.clone(), sphereMat.color.clone());
              hideCombo();
              return;
            }
          }

          // ── 安全着陆计数（连续安全着陆3次回充护盾） ──
          if (wasHitThisJump) {
            // 本跳被陨石击中，不算安全着陆
            safeLandCount = 0;
          } else {
            safeLandCount++;
            if (safeLandCount >= SAFE_LAND_THRESHOLD) {
              shieldRegen();
              safeLandCount = 0;
            }
          }

          // ── 连击鼓励（基于落点精度）──
          const glowCSS = '#' + sphereMat.color.getHexString();
          let offsetX = 0;
          if (g.type === 1) {
            // 长直轨道：中心 x=0
            offsetX = Math.abs(ballX);
          } else {
            // 方形轨道：以最近方块中心为原点
            offsetX = Infinity;
            g.parts.forEach(p => {
              const d = Math.abs(ballX - p.mesh.position.x);
              if (d < offsetX) offsetX = d;
            });
          }

          // 轨道半宽
          const halfW = g.type === 1 ? LONG_W / 2 : SQ_W / 2;
          // 长直轨道：80% 半宽内 PERFECT，80%~100% GREAT
          // 方形轨道：50% 半宽内 PERFECT，50%~100% GREAT
          const perfectZone = g.type === 1 ? halfW * 0.8 : halfW * 0.5;
          let rating = null;
          if (offsetX <= perfectZone) {
            rating = 'PERFECT';
            perfectCount++;
          } else if (offsetX <= halfW) {
            rating = 'GREAT';
            greatCount++;
          }
          // 超出半宽不弹鼓励（但仍安全着陆，除非 onTrack 已经判定出界）

          if (rating) {
            comboCount++;
            const isVisible = comboContainer.classList.contains('show');
            if (!isVisible) {
              showCombo(rating, comboCount, glowCSS);
            } else {
              comboTextEl.textContent = rating;
              comboCountEl.textContent = 'x' + comboCount;
              comboContainer.style.setProperty('--combo-glow', glowCSS);
              // 文字弹出动画
              comboTextEl.style.animation = 'none';
              comboTextEl.offsetHeight;
              comboTextEl.style.animation = 'pop-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both';
              if (comboHideTimer) clearTimeout(comboHideTimer);
              comboHideTimer = setTimeout(() => { comboContainer.classList.remove('show'); }, 1500);
            }
            updateScoreUI();
          }

          // ── 达到25次：在前方生成黑洞（仅限旧的"非无尽"逻辑，stages 已在 restartGame 预置） ──
          // stages 模式的黑洞在 restartGame() 中已按 targetDist 精确放置，此处不再动态生成
          if (gameMode !== 'endless' && gameMode !== 'stages' && !blackholeSpawned && (perfectCount + greatCount) >= WIN_SCORE) {
            blackholeSpawned = true;
            blackholeActive = true;
            // 黑洞放在当前球前方 2 个 group 的位置（视线正前方）
            const bhZ = ballZ + (GROUP_GAP_BASE + GROUP_GAP_VAR / 2 + LONG_D) * 2;
            blackhole = createBlackhole(bhZ);
            // 显示目标距离
            const targetDist = Math.round(bhZ);
            const targetEl = document.getElementById('dist-target-val');
            targetEl.textContent = targetDist + 'm';
            targetEl.classList.add('revealed');
          }

          // ── 黑洞跳入检测（球到达黑洞 Z 附近时触发）──
          if (blackholeActive && blackhole && !victoryTriggered) {
            const bhPos = blackhole.group.position;
            const dz = Math.abs(sphere.position.z - bhPos.z);
            // 球跳到黑洞 Z 范围内（±半个跳跃距离）且 X 偏移不太远
            if (dz < LONG_D * 1.2 && Math.abs(sphere.position.x - bhPos.x) < BLACKHOLE_RADIUS * 1.2) {
              victoryTriggered = true;
              gameOver = true;
              triggerVictoryAnim();
              // 两值显示一样（完成态）
              const targetEl = document.getElementById('dist-target-val');
              const currentDist = Math.round(sphere.position.z);
              targetEl.textContent = currentDist + 'm';
              targetEl.classList.remove('revealed');
              targetEl.classList.add('completed');
            }
          }

          // ── 长直轨道 → 球变色
          if (g.type === 1 && g.color) {
            sphereMat.color.copy(g.color);
            currentBallColorKey = g.colorKey;
            // 注意：不更新 activeColorKey！
            // activeColorKey 完全由 appendGroup 内部按空间顺序维护。
            // appendGroup 是按 Z 从小到大连续生成的，它内部的长直轨道
            // 会正确更新 activeColorKey，保证后续 type 3 包含段安全色。
            // 如果落地处也更新 activeColorKey，会和 appendGroup 的内部
            // 状态冲突，导致后续追加的 type 3 用错颜色。
          }

          currentGroupIdx = landed.index;
          } // end else (non-type4)
        }

        const next = pickNextGroup(currentGroupIdx);
        jumpToZ = next.group.landZ;
        currentGroupIdx = next.index;
      }

      // ── 滚动管理：每帧维护平台数量 ──
      // 确保前方有足够平台（不只落地时，每帧都检查）
      ensureGroupsAhead();
      // 删除球后方太远的平台（释放资源）
      removeOldGroups();

      // ── 侧风段：确定性预规划优先 ──
      if (gameMode === 'endless' && plannedWindPositions.length > 0 && ballZ > plannedWindPositions[0]) {
        const planZ = plannedWindPositions.shift();
        const wRules = getPhaseRules(getCurrentPhase(planZ));
        if (ballZ - lastBoostZ >= wRules.windBuf && phaseWindCount < wRules.maxWind) {
          generateWindZone(planZ);
        } else if (ballZ - lastBoostZ < wRules.windBuf) {
          plannedWindPositions.unshift(lastBoostZ + wRules.windBuf + 15);
        }
      }
      if ((gameMode === 'endless' || (_currentStage && _currentStage.hasWind)) && ballZ > windNextZoneAt) {
        generateWindZone(Math.max(windNextZoneAt, ballZ + 10));
      }

      // ── type4 轨道呼吸发光 ──
      const glowTime = performance.now() / 1000;
      groups.forEach(g => {
        if (g.type === 4 && g.parts[0]) {
          const mat = g.parts[0].mesh.material;
          const phase = g.parts[0].mesh.userData.glowPhase || 0;
          mat.emissiveIntensity = 0.5 + 0.5 * Math.sin(glowTime * 2.5 + phase);
        }
        // type5 冰霜段呼吸发光（冰面 + 棱柱同步）
        if (g.type === 5 && g.parts[0]) {
          const mat = g.parts[0].mesh.material;
          const phase = g.parts[0].mesh.userData.glowPhase || 0;
          const iceGlow = 0.22 + 0.12 * Math.sin(glowTime * 1.8 + phase);
          mat.emissiveIntensity = iceGlow;
          // 冰棱柱同步发光
          if (g.crystals) {
            g.crystals.forEach(c => {
              c.material.emissiveIntensity = iceGlow * (0.9 + 0.3 * Math.sin(glowTime * c.userData.speed + c.userData.phase));
            });
          }
        }
      });

      // 霜花粒子动画（非滑行模式也要更新可见范围内的冰霜段）
      updateFrostParticles(t);

      // ── 加速时球体发光（强度随 boostIntensity 平滑变化） ──
      if (boostIntensity > 0) {
        const boostGlow = (0.15 + 0.1 * Math.sin(glowTime * 8)) * boostIntensity;
        sphereMat.emissiveIntensity = boostGlow;
        sphereMat.emissive.copy(sphereMat.color);
      } else {
        sphereMat.emissiveIntensity = 0;
      }

      // ── 风线漂移动画 ──
      for (const zone of windZones) {
        if (!zone.lines) continue;
        const lines = zone.lines.children;
        const driftDir = -zone.direction;  // 左风→右漂, 右风→左漂
        for (let i = 0; i < lines.length; i++) {
          const ud = lines[i].userData;
          // 垂直摆动
          lines[i].position.y = Math.sin(glowTime * 1.5 + ud.phase) * 0.3;
          // 水平漂移
          ud.driftOffset += driftDir * ud.driftSpeed * dt;
          lines[i].position.x = ud.driftOffset;
          // 漂出屏幕后从对面重新进入
          if (Math.abs(ud.driftOffset) > 14) {
            ud.driftOffset = -driftDir * (8 + Math.random() * 4);
          }
        }
      }

  } catch(e) {
    console.error('GAME ERROR:', e);
  } finally {
    renderer.render(scene, camera);
  }
}
    animate();
    console.log('[GAME] Init complete. animate() started. start-btn handler registered.');

    // ══════════════════════════════════════════════════════
    //  三分路系统 — 检查点 + 选择逻辑
    // ══════════════════════════════════════════════════════
    function checkPathCheckpoint(distVal) {
      if (gameMode !== 'endless' || pathChoiceActive) return;
      if (distVal >= nextPathCheckpoint) {
        pathChoiceActive = true;
        isPaused = true;  // 暂停游戏
        showPathChoice();
      }
    }

    function showPathChoice() {
      const overlay = document.getElementById('path-choice-overlay');
      overlay.classList.add('show');
    }

    function hidePathChoice() {
      const overlay = document.getElementById('path-choice-overlay');
      overlay.classList.remove('show');
    }

    function selectPath(style) {
      currentPathStyle = style;
      pathChoiceActive = false;
      hidePathChoice();
      // isPaused 保持 true — 等倒计时结束再由回调恢复
      // 设置下一个检查点
      nextPathCheckpoint = nextPathCheckpoint + 900;
      // 重置本段相位计数（每个900m段独立计算）
      const phaseBase = getCurrentPhase(ballZ);
      currentPhase = phaseBase;
      phaseIceCount = 0;
      phaseWindCount = 0;
      // ── 确定性地预规划本段冰/风位置 ──
      planSegmentSpecials(ballZ);
      // ★ 不销毁现有颜色链！已有组天然连通，只需切换 path style，
      //   新路径风格会在后续 appendGroup()（gameplay 触发）中自然生效。
      //   之前的 refreshGroupsAfterPath() 破坏了颜色链 → 必死。
      // 选完路后给缓冲倒计时，防止反应不过来
      startCountdown(() => { isPaused = false; });
    }

    function disposeGroup(grp) {
      grp.parts.forEach(p => {
        scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        if (p.arrowOverlay) { scene.remove(p.arrowOverlay); p.arrowOverlay.geometry.dispose(); p.arrowOverlay.material.dispose(); }
        if (p.arrowGlow) { scene.remove(p.arrowGlow); p.arrowGlow.geometry.dispose(); p.arrowGlow.material.dispose(); }
        p.edges.forEach(e => { scene.remove(e); e.geometry.dispose(); e.material.dispose(); });
      });
      if (grp.crystals) { grp.crystals.forEach(c => { scene.remove(c); c.geometry.dispose(); }); }
      if (grp.frostParticles) { grp.frostParticles.forEach(f => { scene.remove(f); f.geometry.dispose(); f.material.dispose(); }); }
      if (grp.iceMat) {
        const idx = activeIceMats.indexOf(grp.iceMat);
        if (idx !== -1) activeIceMats.splice(idx, 1);
        grp.iceMat.dispose();
      }
      if (grp.crystalMat) {
        const idx = activeIceMats.indexOf(grp.crystalMat);
        if (idx !== -1) activeIceMats.splice(idx, 1);
        grp.crystalMat.dispose();
      }
    }

    function refreshGroupsAfterPath() {
      // 保留当前组及下2个组（球可能正在跳往），清除更前方的预生成组
      const keepCount = Math.min(currentGroupIdx + 3, groups.length);
      while (groups.length > keepCount) {
        const grp = groups.pop();
        disposeGroup(grp);
      }
      // ★ 扫描保留的组，找到最后一个长直轨道，用它更新 activeColorKey
      // 球在穿过保留组时会经过这些长直轨道并变色，到达新生成组时的颜色
      // 等于最后一个长直轨道的颜色。如果保留组中没有长直轨道，则保持当前值。
      for (let i = keepCount - 1; i >= currentGroupIdx; i--) {
        const g = groups[i];
        if (g && g.type === 1 && g.colorKey) {
          activeColorKey = g.colorKey;
          break;
        }
      }
      // 强制重新生成前方平台
      ensureGroupsAhead();
    }

    // 绑定三分路卡片点击事件
    document.querySelectorAll('.path-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const style = parseInt(btn.getAttribute('data-style'), 10);
        selectPath(style);
      });
    });
