const fs   = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle,
        LevelFormat, PageNumber, Header, Footer, ImageRun,
        TableOfContents, PositionalTab, PositionalTabAlignment,
        PositionalTabLeader } = require('docx');

/* ───────── 颜色 & 常量 ───────── */
const C = {
  navy:   '1F3864',
  blue:   '2E75B6',
  lblue:  'BDD7EE',
  lblue2: 'D5E8F0',
  white:  'FFFFFF',
  black:  '000000',
  gray:   '555555',
  red:    'C00000',
};
const DXA = (inches) => Math.round(inches * 1440);
const CONTENT_W = DXA(8.5) - DXA(1) * 2;           // 9.36″ → 134784 tw
const COL2 = Math.round(CONTENT_W * 0.5);
const COL3 = Math.round(CONTENT_W * 0.3333);
const COL4 = Math.round(CONTENT_W * 0.25);
const border = { style: BorderStyle.SINGLE, size: 3, color: C.blue };
const borderL = { top: border, bottom: border, left: border, right: border };

/* ───────── 复用组件 ───────── */
const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, font: '黑体', size: 32, bold: true, color: C.navy })]
});
const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, font: '黑体', size: 28, bold: true, color: C.blue })]
});
const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, font: '黑体', size: 24, bold: true, color: C.black })]
});
const P  = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, font: '宋体', size: 24, ...opts })],
  spacing: { before: 60, after: 60, line: 360 }
});
const Pjust = (text) => new Paragraph({
  children: [new TextRun({ text, font: '宋体', size: 24 })],
  alignment: AlignmentType.JUSTIFY,
  spacing: { before: 60, after: 60, line: 360 }
});
const Bullet = (text) => new Paragraph({
  children: [new TextRun({ text, font: '宋体', size: 24 })],
  bullet: { level: 0 },
  spacing: { before: 40, after: 40, line: 320 }
});
const InlineCode = (text) => new TextRun({ text, font: 'Consolas', size: 20, color: C.blue });

/* ───────── 表格辅助 ───────── */
const cell = (text, opts = {}) => new TableCell({
  children: [typeof text === 'string'
    ? new Paragraph({ children: [new TextRun({ text, font: '宋体', size: 22, ...(opts.run||{}) })] })
    : text],
  width:  { size: opts.w || COL2, type: WidthType.DXA },
  shading: opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined,
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  verticalAlign: 'center',
  ...(opts.mergeTop ? { rowSpan: opts.mergeTop } : {}),
  ...(opts.mergeLeft ? { columnSpan: opts.mergeLeft } : {}),
});

/* ════════════════════════════════════════
   第 1 章  研究目的与意义
   ════════════════════════════════════════ */
const ch1 = [
  H1('一、研究目的与意义'),
  Pjust('随着Web技术的飞速发展，基于浏览器的实时3D图形渲染已经成为计算机图形学的重要研究方向。' +
    '相比于传统的原生图形应用，Web 3D具有跨平台、无需安装、即时分享等优势，' +
    '在游戏、教育、产品展示等领域展现出广阔的应用前景。'),
  Pjust('本课题以 Three.js（基于 WebGL 的 JavaScript 3D 图形库）为核心技术，' +
    '设计并实现了一款具有完整游戏性的 3D 弹跳球闯关游戏。项目涵盖计算机图形学核心知识点：' +
    '3D 场景构建、透视摄像机与观察矩阵、几何图元生成、纹理映射、着色器编程（GLSL）、' +
    '粒子系统、动画与交互等。同时在此基础上进行了创新设计，加入了闯关模式、道具系统、' +
    '程序化背景等特色功能，使项目兼具学术学习价值与娱乐性。'),
  H2('1.1  研究目的'),
  Bullet('掌握 Three.js / WebGL 的核心渲染流程，理解 3D 图形管线的实际运用；'),
  Bullet('设计并实现一个包含完整游戏逻辑的 3D 交互应用，涵盖场景管理、物理模拟、碰撞检测等模块；'),
  Bullet('探索 GLSL 着色器在游戏特效（冰面 Shader、粒子效果）中的实际应用；'),
  Bullet('研究基于浏览器的 3D 游戏性能优化方法（几何体复用、视锥剔除、资源释放等）。'),
  H2('1.2  研究意义'),
  Pjust('本项目的完成表明：利用纯 Web 技术即可实现高质量 3D 游戏，无需任何插件或本地安装。' +
    '这对推动计算机图形学教学的信息化、可视化具有积极意义。同时，项目中使用的闯关进度存储（localStorage）、' +
    'GLB 模型加载、着色器材质等实践内容，可为同类课程设计提供参考。'),
];

/* ════════════════════════════════════════
   第 2 章  开发环境与软件工具
   ════════════════════════════════════════ */
const ch2 = [
  H1('二、开发环境与软件工具'),
  H2('2.1  开发软件与编程语言'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL3, COL3 * 2],
    rows: [
      new TableRow({ children: [
        cell('开发工具', { w: COL3, fill: C.lblue2, run: { bold: true } }),
        cell('用途说明', { w: COL3 * 2, fill: C.lblue2, run: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell('VS Code',      { w: COL3 }),
        cell('代码编辑与调试（安装 ESLint、Prettier 插件）', { w: COL3 * 2 }),
      ]}),
      new TableRow({ children: [
        cell('Google Chrome', { w: COL3 }),
        cell('游戏运行与调试，利用 DevTools 进行性能分析（FPS、内存）', { w: COL3 * 2 }),
      ]}),
      new TableRow({ children: [
        cell('Python 3.13',   { w: COL3 }),
        cell('启动本地 HTTP 服务器（_serve.py），端口 9090', { w: COL3 * 2 }),
      ]}),
      new TableRow({ children: [
        cell('Node.js 22',    { w: COL3 }),
        cell('安装和管理 npm 包（docx 等）', { w: COL3 * 2 }),
      ]}),
      new TableRow({ children: [
        cell('Git',           { w: COL3 }),
        cell('版本控制，记录每次功能迭代与 Bug 修复', { w: COL3 * 2 }),
      ]}),
    ]
  }),
  H2('2.2  核心技术库'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL3, Math.round(CONTENT_W * 0.22), Math.round(CONTENT_W * 0.45)],
    rows: [
      new TableRow({ children: [
        cell('库名',     { w: COL3, fill: C.lblue2, run: { bold: true } }),
        cell('版本',     { w: Math.round(CONTENT_W*0.22), fill: C.lblue2, run: { bold: true } }),
        cell('用途',     { w: Math.round(CONTENT_W*0.45), fill: C.lblue2, run: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell('Three.js',          { w: COL3 }),
        cell('r128',              { w: Math.round(CONTENT_W*0.22) }),
        cell('3D 渲染引擎：场景、摄像机、几何体、材质、灯光、加载器', { w: Math.round(CONTENT_W*0.45) }),
      ]}),
      new TableRow({ children: [
        cell('three/examples/jsm/loaders/GLTFLoader', { w: COL3 }),
        cell('r128',              { w: Math.round(CONTENT_W*0.22) }),
        cell('加载 .glb / .gltf 3D 模型（道具、星球背景模型）', { w: Math.round(CONTENT_W*0.45) }),
      ]}),
      new TableRow({ children: [
        cell('Web Audio API',     { w: COL3 }),
        cell('原生',              { w: Math.round(CONTENT_W*0.22) }),
        cell('游戏音效合成（着陆、破碎、护盾命中、侧风等）', { w: Math.round(CONTENT_W*0.45) }),
      ]}),
      new TableRow({ children: [
        cell('localStorage API',  { w: COL3 }),
        cell('原生',              { w: Math.round(CONTENT_W*0.22) }),
        cell('闯关进度（解锁关卡、星级评定）与道具数量的持久化存储', { w: Math.round(CONTENT_W*0.45) }),
      ]}),
    ]
  }),
  H2('2.3  3D 模型来源'),
  Pjust('本游戏中的 3D 模型分为两类：'),
  Bullet('程序化生成：星球背景、冰面着色器材质、粒子特效（星星、尘土、光带）均由代码实时生成，无需外部文件；'),
  Bullet('AI 生成的 GLB 模型：道具模型（复活太空舱、防滑外套、防风外套、飞行服）以及各关卡主题模型（地球-月球、火星、木星、土星、天王星、海王星、冥王星、黑洞、奇点彼岸）均使用 AI 3D 生成工具创建，导出为 .glb 格式后由 GLTFLoader 加载。'),
];

/* ════════════════════════════════════════
   第 3 章  游戏设计与功能模块
   ════════════════════════════════════════ */
const ch3 = [
  H1('三、游戏设计与功能模块'),
  H2('3.1  总体架构'),
  Pjust('游戏采用单页应用（SPA）架构，前端由三个文件组成：'),
  Bullet('threejs-sphere.html：页面结构、UI 层（欢迎页、模式选择页、关卡选择页、游戏 HUD、商城页、帮助页、结算页）；'),
  Bullet('styles.css：全部样式，负责响应式布局与游戏 UI 美化；'),
  Bullet('game.js（约 4100 行）：全部游戏逻辑，包括 Three.js 场景初始化、游戏循环（animate）、物理系统、道具系统、闯关系统等。'),
  Pjust('这种「结构-样式-逻辑」分离的设计符合 Web 标准，便于维护和迭代。'),

  H2('3.2  功能模块划分'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL3, Math.round(CONTENT_W * 0.3), Math.round(CONTENT_W * 0.37)],
    rows: [
      new TableRow({ children: [
        cell('模块名称', { w: COL3, fill: C.lblue2, run: { bold: true } }),
        cell('主要功能',   { w: Math.round(CONTENT_W*0.3), fill: C.lblue2, run: { bold: true } }),
        cell('关键函数 / 对象', { w: Math.round(CONTENT_W*0.37), fill: C.lblue2, run: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell('场景管理', { w: COL3 }),
        cell('初始化 Three.js 场景、摄像机、渲染器、灯光系统', { w: Math.round(CONTENT_W*0.3) }),
        cell('scene, camera, renderer\ninitScene()', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('几何体生成', { w: COL3 }),
        cell('根据关卡类型生成不同类型的轨道段（长直、方形、冰面、加速）', { w: Math.round(CONTENT_W*0.3) }),
        cell('createLongPlatform()\ncreateTriplePlatform()\ncreateIcePlatform()\ncreateBoostPlatform()', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('物理与运动', { w: COL3 }),
        cell('小球弹跳物理（时间驱动插值）、摄像机跟随、侧风推力、冰面滑行', { w: Math.round(CONTENT_W*0.3) }),
        cell('initJump()\nanimate() [物理更新部分]\niceSlideAccelDir', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('碰撞检测', { w: COL3 }),
        cell('落点 X 范围检测、颜色匹配检测、黑洞吸附检测、道具拾取检测', { w: Math.round(CONTENT_W*0.3) }),
        cell('findGroupAt()\ncheckLandColorMatch()\ncheckAntiSlip()', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('粒子系统', { w: COL3 }),
        cell('涟漪粒子、破碎粒子、爆发粒子、霜花粒子、黑洞粒子、加速粒子', { w: Math.round(CONTENT_W*0.3) }),
        cell('triggerRipple()\nupdateFrostParticles()\ntriggerBurst()\ntriggerPickupBurst()', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('着色器特效', { w: COL3 }),
        cell('冰面 3D Noise Shader（裂纹+气泡+菲涅尔发光），不依赖外部纹理', { w: Math.round(CONTENT_W*0.3) }),
        cell('createIceShaderMat()\nfrostParticleTex', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('道具系统', { w: COL3 }),
        cell('道具生成、拾取、使用、UI 显示、数量持久化', { w: Math.round(CONTENT_W*0.3) }),
        cell('trySpawnItem()\npickupItem()\nbuyItem()\nsaveItems() / loadItems()', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('闯关系统', { w: COL3 }),
        cell('10 个关卡、进度解锁、星级评定（≥70% PERFECT→3★）、localStorage 存储', { w: Math.round(CONTENT_W*0.3) }),
        cell('STAGE_CFGS[]\nenterStageSelect()\nsaveStageProgress()\nisStageUnlocked()', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('无尽模式', { w: COL3 }),
        cell('程序化背景（4 套）、路径选择（每 900 m）、确定性的风/冰生成', { w: Math.round(CONTENT_W*0.3) }),
        cell('createEndlessBg0-3()\nplanSegmentSpecials()\nshowPathChoice()', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('音效系统', { w: COL3 }),
        cell('Web Audio API 合成所有音效（着陆、破碎、护盾、侧风、倒计时等）', { w: Math.round(CONTENT_W*0.3) }),
        cell('playLandSound()\nplayShatterSound()\nplayShieldHitSound()\nplayUICountdown()', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('UI 管理', { w: COL3 }),
        cell('页面切换动画、HUD 更新、商城/帮助页、结算页', { w: Math.round(CONTENT_W*0.3) }),
        cell('switchPage()\nshowGameOver()\nbuildStageCards()\nbuildShopCards()', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
      new TableRow({ children: [
        cell('背景管理', { w: COL3 }),
        cell('9 套程序化背景 + 10 个关卡专属 3D 模型，跟随球移动', { w: Math.round(CONTENT_W*0.3) }),
        cell('createStageBackground()\nshowEarth() / showMoonBase()\nstage9Model.position.z', { w: Math.round(CONTENT_W*0.37) }),
      ]}),
    ]
  }),

  H2('3.3  核心类与对象'),
  Pjust('游戏采用面向过程 + 少部分面向对象的设计。主要对象和数组结构如下：'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [Math.round(CONTENT_W*0.25), Math.round(CONTENT_W*0.2), Math.round(CONTENT_W*0.55)],
    rows: [
      new TableRow({ children: [
        cell('对象 / 数组', { w: Math.round(CONTENT_W*0.25), fill: C.lblue2, run: { bold: true } }),
        cell('类型',       { w: Math.round(CONTENT_W*0.2),  fill: C.lblue2, run: { bold: true } }),
        cell('说明',       { w: Math.round(CONTENT_W*0.55), fill: C.lblue2, run: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell('scene',            { w: Math.round(CONTENT_W*0.25) }), cell('THREE.Scene',       { w: Math.round(CONTENT_W*0.2) }),  cell('Three.js 场景根节点，包含所有 3D 对象',        { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('camera',           { w: Math.round(CONTENT_W*0.25) }), cell('THREE.PerspectiveCamera', { w: Math.round(CONTENT_W*0.2) }), cell('透视摄像机，跟随小球位置', { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('groups[]',         { w: Math.round(CONTENT_W*0.25) }), cell('Array<Object>',      { w: Math.round(CONTENT_W*0.2) }),  cell('轨道段数组，每个元素含 {type, parts[], landZ, color, colorKey, index}', { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('ripples[]',        { w: Math.round(CONTENT_W*0.25) }), cell('Array<Object>',      { w: Math.round(CONTENT_W*0.2) }),  cell('涟漪粒子数组，每个元素含 {points, born, life, color, velY}', { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('windZones[]',      { w: Math.round(CONTENT_W*0.25) }), cell('Array<Object>',      { w: Math.round(CONTENT_W*0.2) }),  cell('侧风区域数组，每个含 {zStart, zEnd, direction, lines, warning}', { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('blackhole',        { w: Math.round(CONTENT_W*0.25) }), cell('Object',            { w: Math.round(CONTENT_W*0.2) }),  cell('黑洞对象，含 group（外层球体）、ring（吸积盘）、glow（光晕）', { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('sphere',           { w: Math.round(CONTENT_W*0.25) }), cell('THREE.Mesh',        { w: Math.round(CONTENT_W*0.2) }),  cell('小球网格对象，材质 sphereMat（MeshPhongMaterial）', { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('SHOP_ITEMS[]',    { w: Math.round(CONTENT_W*0.25) }), cell('Array<Object>',      { w: Math.round(CONTENT_W*0.2) }),  cell('商城道具配置数组，每个含 {id, name, nameCN, desc, price, icon}', { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('STAGE_CFGS[]',    { w: Math.round(CONTENT_W*0.25) }), cell('Array<Object>',      { w: Math.round(CONTENT_W*0.2) }),  cell('关卡配置数组，每个含 {id, name, nameCN, targetDist, hasBoost, hasIce, hasWind, gapMul}', { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('stage9Model',      { w: Math.round(CONTENT_W*0.25) }), cell('THREE.Group',        { w: Math.round(CONTENT_W*0.2) }),  cell('第 9 关「黑洞视界」GLB 模型（stage9_blackhole_20260527.glb）', { w: Math.round(CONTENT_W*0.55) })]}),
      new TableRow({ children: [
        cell('endlessBgGroups[]',{ w: Math.round(CONTENT_W*0.25) }), cell('Array<THREE.Group>', { w: Math.round(CONTENT_W*0.2) }), cell('无尽模式 4 套程序化背景，每套含天空球、地面、粒子等', { w: Math.round(CONTENT_W*0.55) })]}),
    ]
  }),
];

/* ════════════════════════════════════════
   第 4 章  游戏规则与难度设计
   ════════════════════════════════════════ */
const ch4 = [
  H1('四、游戏规则与难度设计'),
  H2('4.1  基本操作'),
  Pjust('玩家通过鼠标点击或触摸屏点击控制小球跳跃。小球会自动朝前方（Z 轴负方向）跳跃，' +
    '落点 X 坐标由点击位置决定（屏幕左侧→球向左移动，右侧→向右）。'),
  Bullet('左键点击 / 触屏：使小球从当前轨道跳向下一段轨道；'),
  Bullet('落点偏离轨道中心越小，评价越高（PERFECT / GREAT）；'),
  Bullet('连续安全着陆 3 次，护盾自动回充（可抵挡 1 次伤害）。'),

  H2('4.2  轨道类型'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL3, Math.round(CONTENT_W*0.2), Math.round(CONTENT_W*0.2), Math.round(CONTENT_W*0.37)],
    rows: [
      new TableRow({ children: [
        cell('类型', { w: COL3, fill: C.lblue2, run: { bold: true } }),
        cell('名称', { w: Math.round(CONTENT_W*0.2), fill: C.lblue2, run: { bold: true } }),
        cell('尺寸（宽×深）', { w: Math.round(CONTENT_W*0.2), fill: C.lblue2, run: { bold: true } }),
        cell('特殊规则', { w: Math.round(CONTENT_W*0.37), fill: C.lblue2, run: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell('Type 1', { w: COL3 }), cell('长直轨道', { w: Math.round(CONTENT_W*0.2) }), cell('8.0 × 3.6', { w: Math.round(CONTENT_W*0.2) }), cell('标准轨道，球落地后变色，计入连击', { w: Math.round(CONTENT_W*0.37) })]}),
      new TableRow({ children: [
        cell('Type 2', { w: COL3 }), cell('双色方形', { w: Math.round(CONTENT_W*0.2) }), cell('3.2 × 2.4', { w: Math.round(CONTENT_W*0.2) }), cell('两个方块，连击变色', { w: Math.round(CONTENT_W*0.37) })]}),
      new TableRow({ children: [
        cell('Type 3', { w: COL3 }), cell('三色方形', { w: Math.round(CONTENT_W*0.2) }), cell('3.2 × 2.4', { w: Math.round(CONTENT_W*0.2) }), cell('三个方块，需跳全三色', { w: Math.round(CONTENT_W*0.37) })]}),
      new TableRow({ children: [
        cell('Type 4', { w: COL3 }), cell('加速轨道', { w: Math.round(CONTENT_W*0.2) }), cell('8.0 × 3.6', { w: Math.round(CONTENT_W*0.2) }), cell('8 秒加速效果，不变色、不计分', { w: Math.round(CONTENT_W*0.37) })]}),
      new TableRow({ children: [
        cell('Type 5', { w: COL3 }), cell('冰霜段',   { w: Math.round(CONTENT_W*0.2) }), cell('2.5 × 24.0', { w: Math.round(CONTENT_W*0.2) }), cell('球滑行不弹跳，随机横向推力，需防风外套/防滑外套', { w: Math.round(CONTENT_W*0.37) })]}),
    ]
  }),

  H2('4.3  死亡条件'),
  Bullet('小球落点超出轨道范围 → 掉落死亡；'),
  Bullet('落到 Type 2/3 轨道但颜色不匹配 → 球碎裂死亡；'),
  Bullet('在冰面上滑行时超出冰面边界 → 掉落死亡；'),
  Bullet('被侧风吹落轨道 → 死亡；'),
  Bullet('护盾存在时可抵挡 1 次死亡判定（血条归零前）。'),

  H2('4.4  复活机制'),
  Pjust('死亡后玩家可选择以下任意一种方式复活：'),
  Bullet('使用 1 个复活太空舱（道具，商城购买或关卡拾取）；'),
  Bullet('观看广告（模拟，点击按钮即可）；'),
  Bullet('使用当局累积星星复活（无尽模式专用）。'),

  H2('4.5  闯关模式 — 关卡设计'),
  Pjust('闯关模式共 10 关，以「星际穿越」为主题，难度逐级提升。'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL4, Math.round(CONTENT_W*0.18), Math.round(CONTENT_W*0.15), Math.round(CONTENT_W*0.15), Math.round(CONTENT_W*0.15), Math.round(CONTENT_W*0.23)],
    rows: [
      new TableRow({ children: [
        cell('关卡', { w: COL4, fill: C.lblue2, run: { bold: true } }),
        cell('主题', { w: Math.round(CONTENT_W*0.18), fill: C.lblue2, run: { bold: true } }),
        cell('目标距离', { w: Math.round(CONTENT_W*0.15), fill: C.lblue2, run: { bold: true } }),
        cell('加速轨道', { w: Math.round(CONTENT_W*0.15), fill: C.lblue2, run: { bold: true } }),
        cell('冰面',   { w: Math.round(CONTENT_W*0.15), fill: C.lblue2, run: { bold: true } }),
        cell('侧风',   { w: Math.round(CONTENT_W*0.23), fill: C.lblue2, run: { bold: true } }),
      ]}),
      ...([
        [1,  '地球轨道',     '213  m', '×', '×', '×'],
        [2,  '月球中转站',   '356  m', '√', '×', '×'],
        [3,  '火星峡谷',     '478  m', '√', '×', '×'],
        [4,  '木星冰环',     '591  m', '√', '√', '×'],
        [5,  '土星风暴',     '722  m', '√', '×', '√'],
        [6,  '天王星极地',   '845  m', '√', '√', '×'],
        [7,  '海王星深渊',   '983  m', '√', '√', '√'],
        [8,  '冥王星暗域',   '1134 m', '√', '√', '√'],
        [9,  '黑洞视界',     '1283 m', '√', '√', '√'],
        [10, '奇点彼岸',     '1506 m', '√', '√', '√'],
      ].map(([id, name, dist, boost, ice, wind]) =>
        new TableRow({ children: [
          cell(String(id),      { w: COL4 }),
          cell(name,            { w: Math.round(CONTENT_W*0.18) }),
          cell(dist,            { w: Math.round(CONTENT_W*0.15) }),
          cell(boost,           { w: Math.round(CONTENT_W*0.15) }),
          cell(ice,             { w: Math.round(CONTENT_W*0.15) }),
          cell(wind,            { w: Math.round(CONTENT_W*0.23) }),
        ]})
      )),
    ]
  }),
  Pjust('星级评定标准：进度 ≥ 70% PERFECT → 3★；≥ 40% → 2★；其余 → 1★。通关后自动解锁下一关。'),

  H2('4.6  无尽模式 — 难度递进'),
  Pjust('无尽模式没有终点，但难度随距离增加而递进。游戏将全程划分为 4 个「阶段」，每个阶段有独立的轨道间距倍率和特殊地形生成频率：'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [Math.round(CONTENT_W*0.15), Math.round(CONTENT_W*0.2), Math.round(CONTENT_W*0.18), Math.round(CONTENT_W*0.18), Math.round(CONTENT_W*0.24)],
    rows: [
      new TableRow({ children: [
        cell('阶段', { w: Math.round(CONTENT_W*0.15), fill: C.lblue2, run: { bold: true } }),
        cell('距离范围', { w: Math.round(CONTENT_W*0.2),  fill: C.lblue2, run: { bold: true } }),
        cell('轨道间距倍率', { w: Math.round(CONTENT_W*0.18), fill: C.lblue2, run: { bold: true } }),
        cell('冰面频率', { w: Math.round(CONTENT_W*0.18), fill: C.lblue2, run: { bold: true } }),
        cell('侧风频率', { w: Math.round(CONTENT_W*0.24), fill: C.lblue2, run: { bold: true } }),
      ]}),
      ...([
        ['第一阶段', '0 — 5000  m', '1.0×', '低', '无'],
        ['第二阶段', '5000 — 15000  m', '1.1×', '中', '低'],
        ['第三阶段', '15000 — 30000  m', '1.25×', '高', '中'],
        ['第四阶段', '30000 m 以上', '1.4×', '极高', '高'],
      ].map(r => new TableRow({ children: r.map((t, i) => cell(t, { w: [Math.round(CONTENT_W*0.15), Math.round(CONTENT_W*0.2), Math.round(CONTENT_W*0.18), Math.round(CONTENT_W*0.18), Math.round(CONTENT_W*0.24)][i] })) }))),
    ]
  }),
  Pjust('此外，每累计前进 300 m 获得一颗星星；每 900 m 出现一次路径选择（三条分支路径，难度不同）。'),
];

/* ════════════════════════════════════════
   第 5 章  场景、模型与动画的实现
   ════════════════════════════════════════ */
const ch5 = [
  H1('五、场景、模型与动画的实现'),
  H2('5.1  3D 场景构建'),
  Pjust('Three.js 场景（THREE.Scene）是游戏世界的容器。本游戏的场景构建流程如下：'),
  Bullet('创建场景对象：const scene = new THREE.Scene()；'),
  Bullet('设置背景色：scene.background = new THREE.Color(0x050510)（深空黑色）；'),
  Bullet('添加灯光：AmbientLight（环境光）+ HemisphereLight（天光）+ 2 盏 DirectionalLight（主光 + 补光），确保轨道和球体都有良好的光照；'),
  Bullet('添加摄像机：PerspectiveCamera（视角 60°，近平面 0.1，远平面 100000），摄像机位置通过 CAM_OFFSET 向量偏移跟随球体。'),

  H2('5.2  GLB 模型加载与展示'),
  Pjust('本游戏大量使用 .glb 格式的 3D 模型来丰富视觉体验。加载流程如下：'),
  Bullet('使用 Three.js 内置的 GLTFLoader 加载 .glb 文件；'),
  Bullet('模型加载完成后，遍历其所有子网格（Mesh），开启 castShadow 和 receiveShadow；'),
  Bullet('计算模型的包围盒（Box3），自动缩放至合适尺寸，并居中放置；'),
  Bullet('关卡背景模型（地球-月球、火星、木星等）在对应关卡激活时加载并加入场景，每帧更新其 position.z 跟随球体，确保始终可见；'),
  Bullet('商城中的道具预览同样使用 GLTFLoader 加载，并额外添加了 4 盏灯光（Ambient + Hemisphere + 2 Directional + PointLight）以确保模型清晰展示。'),

  H2('5.3  程序化背景生成'),
  Pjust('游戏包含 9 套程序化背景（对应 10 个关卡 + 4 套无尽模式背景），全部由代码生成，无需外部素材。以第 1 关「地球轨道」为例：'),
  Bullet('天空球：半径 500 的 SphereGeometry，side: BackSide（只渲染内表面），颜色为浅蓝色（0x4A90D9）；'),
  Bullet('地面：PlaneGeometry（2000×2000），顶点 Z 坐标叠加正弦波模拟起伏，附加地形纹理；'),
  Bullet('湖泊：在同一位置叠加一个 PlaneGeometry，顶点 Z 坐标按距中心距离二次函数下沉，模拟湖岸缓坡；'),
  Bullet('云朵：16 个 Sprite（圆形纹理），AdditiveBlending 混合模式，分布在天空球内；'),
  Bullet('光带：createLightRibbons() 生成流动能量带，增加科幻感。'),
  Pjust('其他关卡的程序化背景同理，根据主题替换颜色和形状（如火星的红色地面、土星的漩涡粒子、天王星的极光、海王星的冰晶等）。'),

  H2('5.4  冰面着色器（GLSL）'),
  Pjust('冰霜段（Type 5）使用自定义 GLSL Shader 材质，而非普通纹理贴图。着色器实现如下效果：'),
  Bullet('3D Noise 冰裂纹：在片元着色器中用三维 Simplex Noise 生成裂纹纹理；'),
  Bullet('气泡效果：在 Noise 基础上叠加多层不同频率的噪声，模拟冰中气泡；'),
  Bullet('菲涅尔发光：基于视线角（Fresnel）控制自发光强度，边缘发出蓝白色光芒；'),
  Bullet('动态更新：所有冰面材质存入 activeIceMats[] 数组，每帧更新 uTime 和 uCameraPos uniform。'),
  Pjust('该 Shader 材质通过 createIceShaderMat() 工厂函数创建，不依赖任何外部纹理图片。'),

  H2('5.5  动画系统'),
  Pjust('游戏动画分为以下几类：'),
  Bullet('球体弹跳动画：基于时间驱动的插值（jumpTimer / curJumpDur），球体在起跳点和落点之间做抛物线运动；'),
  Bullet('摄像机跟随动画：摄像机通过 CAM_OFFSET 偏移量跟随球体，落地时有缓冲回弹效果（landBounceActive）；'),
  Bullet('粒子动画：涟漪粒子（triggerRipple）从落点向外扩散并上升消失；霜花粒子（updateFrostParticles）在冰面上持续飘落；'),
  Bullet('模型自转动画：关卡背景模型（stage9Model、stage10Model 等）每帧更新 rotation.y，实现缓慢自转；'),
  Bullet('UI 动画：CSS 动画实现页面切换、Combo 弹出、道具通知等效果。'),
];

/* ════════════════════════════════════════
   第 6 章  道具系统
   ════════════════════════════════════════ */
const ch6 = [
  H1('六、道具系统'),
  Pjust('本游戏设计了 4 种道具，玩家可在商城中购买，也可在游戏中拾取。'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [Math.round(CONTENT_W*0.18), Math.round(CONTENT_W*0.18), Math.round(CONTENT_W*0.6)],
    rows: [
      new TableRow({ children: [
        cell('道具名称', { w: Math.round(CONTENT_W*0.18), fill: C.lblue2, run: { bold: true } }),
        cell('模型文件', { w: Math.round(CONTENT_W*0.18), fill: C.lblue2, run: { bold: true } }),
        cell('功能描述', { w: Math.round(CONTENT_W*0.6),  fill: C.lblue2, run: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell('复活太空舱', { w: Math.round(CONTENT_W*0.18) }),
        cell('item_revive_capsule.glb', { w: Math.round(CONTENT_W*0.18) }),
        cell('球死亡时可选消耗 1 个，使球在死亡点复活，保留当前进度', { w: Math.round(CONTENT_W*0.6) })]}),
      new TableRow({ children: [
        cell('防滑外套',   { w: Math.round(CONTENT_W*0.18) }),
        cell('item_anti_slip_shell.glb', { w: Math.round(CONTENT_W*0.18) }),
        cell('免疫当前冰面的滑行效果，球直接跳过冰面滑行逻辑（落地后失效）', { w: Math.round(CONTENT_W*0.6) })]}),
      new TableRow({ children: [
        cell('防风外套',   { w: Math.round(CONTENT_W*0.18) }),
        cell('windproof_jacket.glb', { w: Math.round(CONTENT_W*0.18) }),
        cell('免疫当前侧风区域的横向推力，球不会被风吹离轨道（离开风区后失效）', { w: Math.round(CONTENT_W*0.6) })]}),
      new TableRow({ children: [
        cell('飞行服',     { w: Math.round(CONTENT_W*0.18) }),
        cell('flight_suit.glb', { w: Math.round(CONTENT_W*0.18) }),
        cell('激活后向前飞行 150 m，期间无敌（免疫冰面、侧风、黑洞吸附），落地后跳过冰面滑行', { w: Math.round(CONTENT_W*0.6) })]}),
    ]
  }),
  Pjust('道具数量通过 localStorage 持久化存储，页面刷新不会丢失。商城购买使用游戏中累积的星星兑换。'),
];

/* ════════════════════════════════════════
   第 7 章  游戏玩法说明
   ════════════════════════════════════════ */
const ch7 = [
  H1('七、游戏玩法说明'),
  H2('7.1  开始游戏'),
  Bullet('打开游戏页面（threejs-sphere.html），等待欢迎页动画结束后点击进入；'),
  Bullet('选择游戏模式：「∞ 无尽模式」或「★ 闯关模式」；'),
  Bullet('若选择闯关模式，在关卡选择界面点击已解锁的关卡开始游戏；'),
  Bullet('闯关模式每一关开始前有 3-2-1 倒计时。'),

  H2('7.2  游戏目标'),
  Pjust('操纵小球跳上同色轨道，避免因未落在轨道上、跳上错误颜色轨道、从冰面滑落、被侧风吹落而死亡。'),

  H2('7.3  无尽模式'),
  Pjust('操纵小球前进，每累计前进 300 m 获得一颗星星；每 900 m 进行一次路径选择（三条分支，难度不同）；死亡后可选择使用复活太空舱、观看广告、或使用当局累积星星复活。'),

  H2('7.4  道具使用'),
  Bullet('在游戏中拾取道具后，道具数量更新在屏幕左侧道具栏；'),
  Bullet('死亡时，若持有复活太空舱，可选择「使用太空舱复活」；'),
  Bullet('通行冰面时，若持有防滑外套，自动生效（冰面段显示防护罩效果）；'),
  Bullet('进入侧风区域时，若持有防风外套，自动生效（风线显示为灰色，表示已免疫）；'),
  Bullet('随时可按「F」键或点击飞行按钮激活飞行服（需持有）。'),

  H2('7.5  帮助页面'),
  Pjust('游戏内设有帮助页面（点击模式选择页的「? 游戏帮助」按钮），详细介绍操作方式、道具说明和游戏规则。'),
];

/* ════════════════════════════════════════
   第 8 章  创新点与同类游戏对比
   ════════════════════════════════════════ */
const ch8 = [
  H1('八、创新点与同类游戏对比'),
  H2('8.1  与 Helix Jump 的对比'),
  Pjust('本游戏的核心玩法借鉴自热门手游 Helix Jump，但在多个维度上进行了创新和扩展：'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [Math.round(CONTENT_W*0.33), Math.round(CONTENT_W*0.33), Math.round(CONTENT_W*0.34)],
    rows: [
      new TableRow({ children: [
        cell('功能维度', { w: Math.round(CONTENT_W*0.33), fill: C.lblue2, run: { bold: true } }),
        cell('Helix Jump（原版）', { w: Math.round(CONTENT_W*0.33), fill: C.lblue2, run: { bold: true } }),
        cell('本游戏', { w: Math.round(CONTENT_W*0.34), fill: C.lblue2, run: { bold: true } }),
      ]}),
      new TableRow({ children: [
        cell('视角', { w: Math.round(CONTENT_W*0.33) }), cell('俯视 3D', { w: Math.round(CONTENT_W*0.33) }), cell('第三人称追尾视角，更具沉浸感', { w: Math.round(CONTENT_W*0.34) })]}),
      new TableRow({ children: [
        cell('主题', { w: Math.round(CONTENT_W*0.33) }), cell('抽象几何', { w: Math.round(CONTENT_W*0.33) }), cell('星际穿越主题，10 个独特星球关卡', { w: Math.round(CONTENT_W*0.34) })]}),
      new TableRow({ children: [
        cell('地形类型', { w: Math.round(CONTENT_W*0.33) }), cell('仅普通平台', { w: Math.round(CONTENT_W*0.33) }), cell('5 种轨道类型（长直/双色/三色/加速/冰霜）', { w: Math.round(CONTENT_W*0.34) })]}),
      new TableRow({ children: [
        cell('天气/环境', { w: Math.round(CONTENT_W*0.33) }), cell('无', { w: Math.round(CONTENT_W*0.33) }), cell('侧风系统 + 冰面滑行，增加不可控变量', { w: Math.round(CONTENT_W*0.34) })]}),
      new TableRow({ children: [
        cell('道具系统', { w: Math.round(CONTENT_W*0.33) }), cell('简单道具', { w: Math.round(CONTENT_W*0.33) }), cell('4 种道具 + 商城系统 + 拾取 + 持久化', { w: Math.round(CONTENT_W*0.34) })]}),
      new TableRow({ children: [
        cell('进度存储', { w: Math.round(CONTENT_W*0.33) }), cell('有', { w: Math.round(CONTENT_W*0.33) }), cell('localStorage 存储关卡进度 + 星级 + 道具数量', { w: Math.round(CONTENT_W*0.34) })]}),
      new TableRow({ children: [
        cell('GLSL 着色器', { w: Math.round(CONTENT_W*0.33) }), cell('无', { w: Math.round(CONTENT_W*0.33) }), cell('冰面 3D Noise Shader，无需纹理图片', { w: Math.round(CONTENT_W*0.34) })]}),
      new TableRow({ children: [
        cell('AI 生成模型', { w: Math.round(CONTENT_W*0.33) }), cell('无', { w: Math.round(CONTENT_W*0.33) }), cell('10 个关卡模型 + 4 个道具模型均为 AI 生成 GLB', { w: Math.round(CONTENT_W*0.34) })]}),
    ]
  }),

  H2('8.2  主要创新点'),
  Bullet('闯关模式 + 星级评定：将平台跳跃与闯关进度结合，增加可重玩性；'),
  Bullet('程序化背景系统：9 套独特背景，每套由代码全权生成，体现计算机图形学核心技术；'),
  Bullet('冰面 GLSL 着色器：用着色器编程实现复杂视觉效果，展示图形学 shader 能力；'),
  Bullet('确定性的无尽模式：风区和冰面生成采用预规划算法，保证每次游戏的公平性和可控性；'),
  Bullet('道具持久化：结合 localStorage，实现跨页面的道具数量存储，页面刷新不丢失；'),
  Bullet('三分路检查点：每 900 m 出现路径选择，三条路径难度不同，增加策略性。'),
];

/* ════════════════════════════════════════
   第 9 章  运行截图说明
   ════════════════════════════════════════ */
const ch9 = [
  H1('九、运行截图说明'),
  Pjust('由于本报告撰写时游戏运行环境所限，以下描述所需截图的位置和内容，请自行运行游戏并截图后插入对应位置。'),
  H2('9.1  建议截图清单'),
  new Table({
    width:  { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [COL3, Math.round(CONTENT_W*0.5), Math.round(CONTENT_W*0.2)],
    rows: [
      new TableRow({ children: [
        cell('编号',   { w: COL3, fill: C.lblue2, run: { bold: true } }),
        cell('截图内容', { w: Math.round(CONTENT_W*0.5), fill: C.lblue2, run: { bold: true } }),
        cell('建议位置', { w: Math.round(CONTENT_W*0.2), fill: C.lblue2, run: { bold: true } }),
      ]}),
      ...([
        ['图 1', '欢迎页面（Welcome Page）— 显示游戏标题和「点击任意位置跳过」', '第 1 章后'],
        ['图 2', '模式选择页面 — 显示「无尽模式」和「闯关模式」两个按钮', '第 3 章后'],
        ['图 3', '关卡选择页面 — 显示 10 个关卡卡片，已解锁的亮显，未解锁的灰显带锁', '第 4 章后'],
        ['图 4', '游戏中画面（第 1 关）— 显示小球在蓝色长直轨道上，摄像机追尾视角，HUD 显示星星数和距离', '第 5 章后'],
        ['图 5', '冰面段游戏画面 — 显示小球在透明冰面上滑行，冰面有 GLSL 着色器裂纹效果', '第 5 章后'],
        ['图 6', '侧风区域游戏画面 — 显示屏幕上出现风线警示，小球受横向推力', '第 5 章后'],
        ['图 7', '道具拾取提示 — 显示「拾取：[道具名称]」的白色通知', '第 6 章后'],
        ['图 8', '商城页面 — 显示 4 个道具卡片，每个卡片有 3D 模型预览、名称、描述和购买按钮', '第 6 章后'],
        ['图 9', '第 9 关「黑洞视界」— 显示背景天空球、地面、吸积盘粒子，以及黑洞视界模型', '第 5 章后'],
        ['图 10', '结算页面 — 显示「Stage Clear」、获得星级、进度百分比、按钮「下一关」和「返回关卡选择」', '第 4 章后'],
        ['图 11', 'Game Over 页面 — 显示「Game Over」、死亡原因、进度百分比、复活选项', '第 4 章后'],
        ['图 12', '帮助页面 — 显示游戏操作说明、道具说明、游戏规则', '第 7 章后'],
      ].map(([id, desc, pos]) =>
        new TableRow({ children: [
          cell(id,    { w: COL3 }),
          cell(desc,  { w: Math.round(CONTENT_W*0.5) }),
          cell(pos,   { w: Math.round(CONTENT_W*0.2) }),
        ]})
      )),
    ]
  }),
  H2('9.2  截图方法'),
  Pjust('在 Chrome 浏览器中运行游戏，按 F12 打开 DevTools，使用以下方法截图：'),
  Bullet('整页截图：在 DevTools 中按 Ctrl+Shift+P，输入「screenshot」，选择「Capture full size screenshot」；'),
  Bullet('当前视口截图：直接使用「Capture node screenshot」或浏览器扩展（如「Full Page Screen Capture」）；'),
  Bullet('推荐分辨率：1920×1080 或 1366×768，保证截图清晰度。'),
  H2('9.3  【此处插入截图】'),
  Pjust('（请将上述截图插入本位置，并为每张截图添加题注，如「图 1  欢迎页面」）'),
];

/* ════════════════════════════════════════
   第 10 章  总结
   ════════════════════════════════════════ */
const ch10 = [
  H1('十、总结'),
  Pjust('本项目以 Three.js 为核心技术，实现了一款兼具娱乐性和学术价值的 3D 弹跳球闯关游戏。' +
    '项目完整覆盖了计算机图形学的主要知识点：3D 场景构建、几何变换、纹理映射、着色器编程、' +
    '粒子系统、动画与交互等。'),
  Pjust('在功能完整性的基础上，项目进行了多项创新设计：闯关模式与星级评定系统、' +
    '程序化生成的多样化和主题化背景、基于 GLSL 的冰面着色器特效、AI 生成的 3D 模型、' +
    '道具系统与进度持久化等。这些设计使游戏在同类产品中具有差异化竞争优势。'),
  Pjust('未来可进一步扩展的方向包括：多人在线对战、更多关卡主题、VR 模式支持、' +
    '移动端陀螺仪控制等。本项目的完成不仅加深了对 Web 3D 图形编程的理解，' +
    '也为浏览器端高性能 3D 游戏的开发积累了宝贵经验。'),
];

/* ════════════════════════════════════════
   组装文档
   ════════════════════════════════════════ */
const allChildren = [
  // ── 封面（简单段落模拟）──
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2400, after: 400 },
    children: [new TextRun({ text: '《计算机图形学》大作业', font: '黑体', size: 44, bold: true, color: C.navy })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
    children: [new TextRun({ text: '3D 弹跳球闯关游戏', font: '黑体', size: 36, bold: true, color: C.blue })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 800 },
    children: [new TextRun({ text: '—— 基于 Three.js 的实现与设计', font: '宋体', size: 28, color: C.gray })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 200 },
    children: [new TextRun({ text: '学    生：__________', font: '宋体', size: 26 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: '学    号：__________', font: '宋体', size: 26 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: [new TextRun({ text: '专    业：__________', font: '宋体', size: 26 })]
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 2400 },
    children: [new TextRun({ text: '日    期：2026 年 6 月', font: '宋体', size: 26 })]
  }),

  // ── 目录（简单模拟，手动锚点）──
  new Paragraph({
    pageBreakBefore: true,
    alignment: AlignmentType.CENTER,
    spacing: { before: 1200, after: 600 },
    children: [new TextRun({ text: '目  录', font: '黑体', size: 36, bold: true, color: C.navy })]
  }),
  ...[
    '一、研究目的与意义',
    '二、开发环境与软件工具',
    '三、游戏设计与功能模块',
    '四、游戏规则与难度设计',
    '五、场景、模型与动画的实现',
    '六、道具系统',
    '七、游戏玩法说明',
    '八、创新点与同类游戏对比',
    '九、运行截图说明',
    '十、总结',
  ].map((t, i) => new Paragraph({
    spacing: { before: 200, after: 200 },
    children: [
      new TextRun({ text: `第 ${['一','二','三','四','五','六','七','八','九','十'][i]} 章  `, font: '黑体', size: 26, bold: true, color: C.navy }),
      new TextRun({ text: t.replace(/^.+?、/, ''), font: '宋体', size: 26, color: C.black }),
    ],
    // 简单模拟点线
    ...(i < 9 ? [new TextRun({ text: '　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　．　', font: '宋体', size: 22, color: 'AAAAAA' })] : []),
  }))),

  // ── 各章节内容（新页开始）──
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch1,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch2,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch3,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch4,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch5,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch6,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch7,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch8,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch9,
  new Paragraph({ pageBreakBefore: true, children: [] }),
  ...ch10,
];

/* ════════════════════════════════════════
   生成文档
   ════════════════════════════════════════ */
const outPath = path.join(__dirname, '计算机图形学大作业_3D弹跳球游戏.docx');
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: '宋体', size: 24 } }
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 32, bold: true, font: '黑体', color: C.navy },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: '黑体', color: C.blue },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: '黑体', color: C.black },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size:   { width: DXA(8.5), height: DXA(11) },
        margin: { top: DXA(1), right: DXA(1), bottom: DXA(1), left: DXA(1) },
      }
    },
    children: allChildren,
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log('✅ 文档已生成：' + outPath);
}).catch(err => {
  console.error('❌ 生成失败：', err);
  process.exit(1);
});
