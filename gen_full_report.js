'use strict';
const fs   = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle,
  PageBreak
} = require('docx');

// ─── 常量 ───────────────────────────────────────────────────────────────────
const CLR = {
  navy:   '1F3864',
  blue:   '2E75B6',
  lblue:  'BDD7EE',
  lteal:  'DAEEF3',
  white:  'FFFFFF',
  black:  '000000',
  gray:   '555555',
  lgray:  'F2F2F2',
};

const DXA   = (inches) => Math.round(inches * 1440);
const PAGE_W  = DXA(8.5);
const PAGE_H  = DXA(11);
const MARGIN  = DXA(1.1);
const CW      = PAGE_W - MARGIN * 2;           // content width

const bd = { style: BorderStyle.SINGLE, size: 3, color: CLR.blue };
const bdAll = { top: bd, bottom: bd, left: bd, right: bd };

// ─── 辅助构建函数 ────────────────────────────────────────────────────────────
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 240 },
    children: [new TextRun({ text, font: '黑体', size: 32, bold: true, color: CLR.navy })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 180 },
    children: [new TextRun({ text, font: '黑体', size: 26, bold: true, color: CLR.blue })],
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 100 },
    children: [new TextRun({ text, font: '黑体', size: 24, bold: true, color: CLR.black })],
  });
}
function para(text, opts = {}) {
  const run = { text, font: '宋体', size: 24, ...opts };
  return new Paragraph({
    alignment: AlignmentType.JUSTIFY,
    spacing: { before: 60, after: 60, line: 360 },
    children: [new TextRun(run)],
  });
}
function bullet(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { before: 40, after: 40, line: 320 },
    children: [new TextRun({ text: '• ' + text, font: '宋体', size: 24 })],
  });
}
function code(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, font: 'Courier New', size: 20, color: '003070' })],
    indent: { left: 360 },
  });
}
function blank() {
  return new Paragraph({ children: [new TextRun('')], spacing: { before: 0, after: 0 } });
}
function pb() {
  return new Paragraph({ children: [new PageBreak()] });
}

// 表格单元格
function cell(content, opts = {}) {
  const {
    w = Math.round(CW / 3),
    fill,
    bold = false,
    align = AlignmentType.LEFT,
    colspan = 1,
  } = opts;
  let child;
  if (typeof content === 'string') {
    child = new Paragraph({
      alignment: align,
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: content, font: '宋体', size: 22, bold })],
    });
  } else {
    child = content;
  }
  return new TableCell({
    children: [child],
    width: { size: w, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    columnSpan: colspan,
    borders: bdAll,
  });
}

// 表格辅助
function hrow(labels, widths) {
  return new TableRow({
    children: labels.map((t, i) =>
      cell(t, { w: widths[i], fill: CLR.lblue, bold: true })),
  });
}
function drow(cols, widths) {
  return new TableRow({
    children: cols.map((t, i) => cell(String(t), { w: widths[i] })),
  });
}
function mkTable(headers, widths, rows) {
  return new Table({
    width: { size: CW, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      hrow(headers, widths),
      ...rows.map(r => drow(r, widths)),
    ],
  });
}

// ─── 章节内容 ─────────────────────────────────────────────────────────────────
const children = [];

// ══════════════════════════════════════════════════════════════════════
// 封面
// ══════════════════════════════════════════════════════════════════════
children.push(
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 200 },
    children: [new TextRun({ text: '《计算机图形学》大作业报告', font: '黑体', size: 44, bold: true, color: CLR.navy })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: '3D 弹跳球闯关游戏', font: '黑体', size: 36, bold: true, color: CLR.blue })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 1200 },
    children: [new TextRun({ text: '—— 基于 Three.js + WebGL 的设计与实现', font: '宋体', size: 28, color: CLR.gray })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: '学　　生：__________', font: '宋体', size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: '学　　号：__________', font: '宋体', size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: '班　　级：__________', font: '宋体', size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text: '指导教师：__________', font: '宋体', size: 26 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 2400 },
    children: [new TextRun({ text: '日　　期：2026 年 6 月', font: '宋体', size: 26 })] }),
);

// ══════════════════════════════════════════════════════════════════════
// 目录（手动）
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 0, after: 600 },
  children: [new TextRun({ text: '目　　录', font: '黑体', size: 36, bold: true, color: CLR.navy })],
}));
const tocChapters = [
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
];
for (const title of tocChapters) {
  children.push(new Paragraph({
    spacing: { before: 100, after: 100 },
    children: [new TextRun({ text: title, font: '宋体', size: 26 })],
  }));
}

// ══════════════════════════════════════════════════════════════════════
// 第一章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('一、研究目的与意义'));
children.push(para('随着 Web 技术的飞速发展，基于浏览器的实时 3D 图形渲染已经成为计算机图形学的重要研究方向。相较于传统的原生图形应用，Web 3D 具有跨平台、无需安装、即时分享等显著优势，在游戏、教育、产品展示等领域展现出广阔的应用前景。'));
children.push(para('本课题以 Three.js（基于 WebGL 的 JavaScript 3D 图形库）为核心技术，设计并实现了一款具有完整游戏性的 3D 弹跳球闯关游戏。项目涵盖计算机图形学多项核心知识点：3D 场景构建、透视摄像机与观察矩阵、几何图元生成、纹理映射、GLSL 着色器编程、粒子系统、物理动画与用户交互等。'));
children.push(blank());

children.push(h2('1.1  研究目的'));
children.push(bullet('深入掌握 Three.js / WebGL 的核心渲染流程，理解 3D 图形管线在工程实践中的运用；'));
children.push(bullet('设计并实现一个包含完整游戏逻辑的 3D 交互应用，涵盖场景管理、物理模拟、碰撞检测等模块；'));
children.push(bullet('探索 GLSL 着色器在游戏特效（冰面 Shader、粒子效果）中的实际应用；'));
children.push(bullet('研究基于浏览器的 3D 游戏性能优化方法（几何体复用、视锥剔除、资源释放等）；'));
children.push(bullet('通过实际项目锻炼完整的软件工程能力：需求分析、模块设计、代码实现、测试与迭代。'));
children.push(blank());

children.push(h2('1.2  研究意义'));
children.push(para('本项目的完成证明：利用纯 Web 技术即可实现视觉效果丰富、游戏性完整的 3D 游戏，无需任何插件或本地安装，这对推动计算机图形学教学的信息化与可视化具有积极意义。'));
children.push(para('在学术层面，项目中使用的 GLSL 程序化冰面着色器、程序化粒子系统、关卡配置驱动的地形生成等技术，均具有一定的学习与参考价值，可为后续课程设计提供范本。'));
children.push(para('在实践层面，项目采用模块化设计，具备闯关模式、无尽模式、道具商城、关卡选择、星级评定、localStorage 进度存储等完整功能，已达到可正式发布的完成度。'));

// ══════════════════════════════════════════════════════════════════════
// 第二章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('二、开发环境与软件工具'));
children.push(h2('2.1  开发工具'));
const devW = [Math.round(CW*0.28), Math.round(CW*0.72)];
children.push(mkTable(
  ['开发工具', '用途说明'],
  devW,
  [
    ['VS Code + ESLint', '代码编辑、格式化与静态检查'],
    ['Google Chrome DevTools', '游戏运行与调试，利用性能面板分析帧率与内存'],
    ['Python 3.13', '启动本地 HTTP 服务器（_serve.py），端口 9090，支持 IPv4/IPv6 双栈'],
    ['Node.js 22', '安装和管理 npm 包（docx 等）'],
    ['Git', '版本控制，每次功能迭代与 Bug 修复均提交记录'],
    ['AI 3D 生成工具', '生成道具与关卡主题 .glb 模型（混元 3D API）'],
  ]
));
children.push(blank());

children.push(h2('2.2  核心技术库'));
const libW = [Math.round(CW*0.3), Math.round(CW*0.16), Math.round(CW*0.54)];
children.push(mkTable(
  ['库名', '版本', '用途'],
  libW,
  [
    ['Three.js', 'r128', '3D 渲染引擎：场景、摄像机、几何体、材质、灯光、加载器'],
    ['GLTFLoader（Three.js 插件）', 'r128', '加载 .glb / .gltf 3D 模型文件'],
    ['Web Audio API', '浏览器原生', '游戏音效合成（着陆、破碎、护盾命中、侧风等）'],
    ['localStorage API', '浏览器原生', '闯关进度（解锁关卡、星级评定）与道具数量的持久化存储'],
  ]
));
children.push(blank());

children.push(h2('2.3  3D 模型来源'));
children.push(para('本游戏中的 3D 资源分为两类：'));
children.push(bullet('程序化生成：星球背景、冰面着色器材质、轨道几何体、粒子特效（星星、尘土、光带）均由代码实时生成，无需外部文件；'));
children.push(bullet('AI 生成的 GLB 模型：道具模型（复活太空舱 item_revive_capsule.glb、防滑外套 item_anti_slip_shell.glb、防风外套 windproof_jacket.glb、飞行服 flight_suit.glb）以及各关卡主题装饰模型（地球-月球底座、火星、木星、土星、天王星、海王星、冥王星、黑洞、奇点彼岸等）均使用 AI 3D 生成工具（混元 3D API）生成，导出为 .glb 格式后由 GLTFLoader 加载。'));

// ══════════════════════════════════════════════════════════════════════
// 第三章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('三、游戏设计与功能模块'));
children.push(h2('3.1  总体架构'));
children.push(para('游戏采用单页应用（SPA）架构，前端由三个核心文件组成：'));
children.push(bullet('threejs-sphere.html：页面结构与 UI 层（欢迎页、模式选择页、关卡选择页、游戏 HUD、道具商城页、帮助页、结算页）；'));
children.push(bullet('styles.css：全部样式，负责响应式布局与 UI 美化；'));
children.push(bullet('game.js（约 4100 行）：全部游戏逻辑，包括 Three.js 场景初始化、游戏主循环（animate）、物理系统、道具系统、闯关系统等。'));
children.push(para('这种"结构–样式–逻辑"分离的设计符合 Web 标准，便于维护和迭代。'));
children.push(blank());

children.push(h2('3.2  功能模块划分'));
const modW = [Math.round(CW*0.2), Math.round(CW*0.37), Math.round(CW*0.43)];
children.push(mkTable(
  ['模块名称', '主要功能', '关键函数 / 对象'],
  modW,
  [
    ['场景管理', '初始化 Three.js 场景、摄像机、渲染器、灯光系统', 'scene, camera, renderer'],
    ['几何体生成', '根据关卡类型生成不同类型的轨道段（长直、方形、冰面、加速）', 'createLongPlatform()\ncreatePlatform()\ncreateIcePlatform()\ncreateBoostPlatform()'],
    ['物理与运动', '小球弹跳（时间插值）、摄像机跟随、侧风推力、冰面滑行', 'initJump()\nanimate() 物理更新\niceSlideAccelDir'],
    ['碰撞检测', '落点 X 范围检测、颜色匹配、黑洞吸附、道具拾取', 'findGroupAt()\ncheckLandColorMatch()\ncheckAntiSlip()'],
    ['粒子系统', '涟漪、破碎、爆发、霜花、黑洞、加速粒子', 'triggerRipple()\nupdateFrostParticles()\ntriggerBurst()'],
    ['着色器特效', '冰面 GLSL Shader（3D Noise 裂纹+气泡+菲涅尔发光）', 'createIceShaderMat()\nactiveIceMats[]'],
    ['道具系统', '道具生成、拾取、使用、UI 显示、数量持久化', 'trySpawnItem()\npickupItem()\nbuyItem()\nsaveItems()'],
    ['闯关系统', '10 个关卡配置、解锁、星级评定、进度 localStorage 存储', 'STAGE_CFGS[]\nenterStageSelect()\nsaveStageProgress()'],
    ['无尽模式', '4 套程序化背景、路径选择（每 900m）、地形生成', 'createEndlessBg0-3()\nplanSegmentSpecials()\nshowPathChoice()'],
    ['音效系统', 'Web Audio API 合成全部游戏音效', 'playLandSound()\nplayShatterSound()\nplayShieldHitSound()'],
    ['UI 管理', '页面切换动画、HUD 更新、商城/帮助页、结算页', 'switchPage()\nshowGameOver()\nbuildStageCards()'],
    ['背景管理', '9 套程序化背景 + 10 关专属 3D 模型，Z 轴跟随球移动', 'createStageBackground()\nshowEarth()\nshowMoonBase()'],
  ]
));
children.push(blank());

children.push(h2('3.3  核心对象与数据结构'));
const objW = [Math.round(CW*0.25), Math.round(CW*0.25), Math.round(CW*0.5)];
children.push(mkTable(
  ['对象 / 数组', '类型', '说明'],
  objW,
  [
    ['scene', 'THREE.Scene', 'Three.js 场景根节点，包含所有 3D 对象'],
    ['camera', 'THREE.PerspectiveCamera', '透视摄像机，跟随小球，视角（FOV）可动态切换'],
    ['sphere', 'THREE.Mesh', '小球网格，材质为 MeshPhongMaterial（支持高光）'],
    ['groups[]', 'Array<Object>', '轨道段数组，每元素含 {type, parts[], landZ, color, colorKey, index}'],
    ['ripples[]', 'Array<Object>', '涟漪粒子数组，每元素含 {points, born, life, color, velY}'],
    ['windZones[]', 'Array<Object>', '侧风区域数组，每元素含 {zStart, zEnd, direction, lines, warning}'],
    ['blackhole', 'Object', '黑洞对象，含 group（球体）、ring（吸积盘）、glow（光晕）'],
    ['SHOP_ITEMS[]', 'Array<Object>', '商城道具配置，每元素含 {id, name, nameCN, desc, price, icon}'],
    ['STAGE_CFGS[]', 'Array<Object>', '关卡配置，每元素含 {id, name, nameCN, targetDist, hasBoost, hasIce, hasWind, gapMul}'],
    ['activeIceMats[]', 'Array<THREE.ShaderMaterial>', '追踪所有活跃冰面 ShaderMaterial，每帧更新 uTime / uCameraPos'],
    ['endlessBgGroups[]', 'Array<THREE.Group>', '无尽模式 4 套程序化背景组'],
  ]
));

// ══════════════════════════════════════════════════════════════════════
// 第四章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('四、游戏规则与难度设计'));
children.push(h2('4.1  基本游戏规则'));
children.push(para('玩家操控一个彩色小球，在螺旋/线性下落的轨道上弹跳前进。核心规则如下：'));
children.push(bullet('小球必须落在轨道上，落空则扣血（血条共 3 格，归零即游戏结束）；'));
children.push(bullet('小球落在与自身颜色相同的轨道段上获得 PERFECT 加分，落在其他颜色轨道上则扣血；'));
children.push(bullet('每次正常落地可根据连击数（Combo）获得额外分数，连击显示在 HUD 右上角；'));
children.push(bullet('玩家可使用道具道具恢复血量、抵消一次死亡或飞越危险区域；'));
children.push(bullet('闯关模式下，到达目标距离即通关；无尽模式下无终点，球死亡即结束。'));
children.push(blank());

children.push(h2('4.2  轨道类型'));
const trackW = [Math.round(CW*0.18), Math.round(CW*0.15), Math.round(CW*0.67)];
children.push(mkTable(
  ['类型', '名称', '说明'],
  trackW,
  [
    ['1', '长直轨道', '最基础的轨道，宽 8.0 单位，深 3.6 单位，颜色随连击更新，PERFECT 判定主要来源'],
    ['2', '双色方形', '宽 3.2 / 深 2.4，两段拼合，连击时变色，训练精准落点'],
    ['3', '三色方形', '同上但三段拼合，颜色全包，落到非当前颜色段则扣血'],
    ['4', '加速轨道', '持续 8 秒强制加速，球速倍增，不更新颜色，不计分'],
    ['5', '冰霜轨道', '长 24.0 单位，球落上后不弹跳改为滑行，并施加随机横向推力，极易从两侧滑落'],
  ]
));
children.push(blank());

children.push(h2('4.3  特殊地形'));
children.push(bullet('侧风区域（Wind Zone）：在指定 Z 范围内持续施加横向推力，玩家需要反向操作修正方向；风向用动态光线和箭头指示。'));
children.push(bullet('黑洞（Black Hole）：部分关卡（第 9-10 关）存在黑洞，当小球进入黑洞前方 10m 范围内时自动被吸入，消耗 1 格血量，但可跳过一段轨道。'));
children.push(blank());

children.push(h2('4.4  闯关模式难度设计'));
const stageW = [Math.round(CW*0.08), Math.round(CW*0.22), Math.round(CW*0.14), Math.round(CW*0.56)];
children.push(mkTable(
  ['关', '主题', '目标距离', '特殊设计'],
  stageW,
  [
    ['1', '地球轨道', '120m', '全长直轨道，无侧风无冰面，适合新手熟悉操作'],
    ['2', '月球基地', '200m', '引入加速轨道（type4），间距缩小'],
    ['3', '火星沙丘', '300m', '首次引入侧风区域，风向不定'],
    ['4', '木星风暴', '400m', '侧风频率提升，加速轨道增多'],
    ['5', '土星光环', '500m', '首次引入冰面轨道，冰面+侧风共存'],
    ['6', '天王星', '700m', '冰面+侧风双重特效，间距加大'],
    ['7', '海王星', '900m', '三色方形大量出现，要求精准落点'],
    ['8', '冥王星', '1100m', '极寒主题，冰面与三色方形混合，手感最考验'],
    ['9', '黑洞视界', '1283m', '黑洞吸附，粒子涡旋，视觉干扰强'],
    ['10', '奇点彼岸', '1506m', '全部特效叠加，最高难度终局'],
  ]
));
children.push(blank());

children.push(h2('4.5  星级评定'));
children.push(para('闯关成功后，系统根据本局中 PERFECT 落地次数占总落地次数的比率进行星级评定：'));
children.push(bullet('3 星（★★★）：PERFECT 比率 ≥ 70%'));
children.push(bullet('2 星（★★☆）：PERFECT 比率 ≥ 40%'));
children.push(bullet('1 星（★☆☆）：通关但 PERFECT 比率 < 40%'));
children.push(para('星级数据通过 localStorage（键名 bounceGameStageProgress）持久化存储，页面刷新后保留。通关自动解锁下一关，玩家可回来刷高星级。'));
children.push(blank());

children.push(h2('4.6  无尽模式难度'));
children.push(para('无尽模式采用程序化分段生成，每 900m 划分为一个"阶段"，共 4 套视觉主题循环切换（星云平原、火山熔岩、冰川深渊、机械要塞）。每阶段开始时玩家可在三条路线中选择一条，不同路线的冰面、侧风、加速分布不同，形成差异化的体验。'));

// ══════════════════════════════════════════════════════════════════════
// 第五章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('五、场景、模型与动画的实现'));
children.push(h2('5.1  Three.js 场景初始化'));
children.push(para('游戏在页面加载时执行以下初始化流程：'));
children.push(bullet('创建 THREE.Scene，设置背景色为当前关卡/模式对应的天空色；'));
children.push(bullet('创建 THREE.PerspectiveCamera（FOV=60°，near=0.1，far=2000），初始位置在球上方偏后；'));
children.push(bullet('创建 THREE.WebGLRenderer，启用 antialias，挂载到 <canvas> 元素；'));
children.push(bullet('添加环境光（AmbientLight）、定向光（DirectionalLight）和点光源（PointLight）三层打光，确保模型在各角度下都有足够的照明；'));
children.push(bullet('注册 resize 事件，保持摄像机宽高比与视口一致；'));
children.push(bullet('调用 animate() 开始 requestAnimationFrame 游戏主循环。'));
children.push(blank());

children.push(h2('5.2  几何体生成'));
children.push(para('轨道段由 Three.js 基础几何体拼装，不依赖外部模型：'));
children.push(bullet('长直轨道（type1/4）：BoxGeometry（8.0 × 0.35 × 3.6），绑定 MeshPhongMaterial，颜色由 colorKey 索引 COLOR_LIST 获取；'));
children.push(bullet('方形轨道（type2/3）：多个 BoxGeometry（3.2 × 0.35 × 2.4）拼接，每段独立颜色材质；'));
children.push(bullet('冰面轨道（type5）：BoxGeometry（2.5 × 0.35 × 24.0），材质为 createIceShaderMat() 返回的自定义 ShaderMaterial。'));
children.push(para('所有轨道段被组织进 groups[] 数组，通过 removeOldGroups() 和 ensureGroupsAhead() 实现流式回收与预生成（视锥外的段及时 dispose，始终维持球前方 5 组缓冲）。'));
children.push(blank());

children.push(h2('5.3  冰面 GLSL 着色器'));
children.push(para('冰面轨道使用完全程序化的 GLSL ShaderMaterial，不依赖任何外部纹理文件。顶点着色器负责传递世界坐标与法线，片元着色器实现以下视觉效果：'));
children.push(bullet('3D Fractal Noise：基于 FBM（Fractional Brownian Motion）生成裂纹网络，形成自然的冰裂纹图案；'));
children.push(bullet('气泡/气孔：在噪声场的低谷区域叠加近似圆形的气泡形状；'));
children.push(bullet('菲涅尔发光（Fresnel Glow）：根据视线与法线夹角计算反射率，视线近乎平行时冰面边缘发出蓝白色光晕；'));
children.push(bullet('动态时间（uTime）：uniform 变量驱动噪声偏移，使冰面看起来在缓慢流动；'));
children.push(bullet('摄像机位置（uCameraPos）：uniform 变量用于菲涅尔计算，每帧更新。'));
children.push(blank());

children.push(h2('5.4  粒子系统'));
const partW = [Math.round(CW*0.22), Math.round(CW*0.78)];
children.push(mkTable(
  ['粒子类型', '实现说明'],
  partW,
  [
    ['落地涟漪', '小球着陆时生成环形扩散粒子，THREE.Points + BufferGeometry，5帧衰减'],
    ['破碎粒子', '小球死亡时生成向四周飞溅的碎片，含初速度与重力衰减'],
    ['爆发粒子', 'PERFECT 着陆时生成向上爆发的光点，颜色与轨道一致'],
    ['霜花粒子', '冰面上方持续飘落的细碎发光粒子，从上方生成，不遮挡视线'],
    ['黑洞粒子', '绕黑洞旋转的螺旋状粒子流，角速度与吸引距离成反比'],
    ['加速拖影', '加速轨道上方出现的蓝色光带粒子，方向沿 Z 轴'],
    ['道具拾取', '拾取道具时的爆炸光点，triggerPickupBurst() 触发'],
  ]
));
children.push(blank());

children.push(h2('5.5  关卡背景实现'));
children.push(para('每个关卡拥有独立的程序化背景或 GLB 模型装饰，由 createStageBackground() 统一调度：'));
children.push(bullet('天空球（Sky Dome）：半径 500 的球体，BackSide 渲染，颜色随关卡变化。所有背景组的 Z 轴每帧同步到小球位置，确保玩家始终处于天空球内部。'));
children.push(bullet('地球+月球：showEarth() 创建程序化地球（MeshPhongMaterial + 大气散射层）；月球底座为 GLB 模型。'));
children.push(bullet('土星：createSaturnProcedural() 创建程序化土星本体（条纹纹理）+ 六层光环（半透明圆环）；土星背景另有程序化星空（createSaturnStarfield()）。'));
children.push(bullet('天王星/海王星：程序化球体 + 轴倾斜的光环 + 随机星点。'));
children.push(bullet('冥王星：程序化岩石球体 + 冰盖极地纹理。'));
children.push(bullet('黑洞（第 9 关）：showStage9() 加载 stage9_blackhole_20260527.glb，同时绕球生成螺旋粒子流与橙红色吸积盘。'));
children.push(bullet('奇点彼岸（第 10 关）：showStage10() 加载 stage10_singularity.glb，配合深紫色天空与密集粒子涡旋。'));

// ══════════════════════════════════════════════════════════════════════
// 第六章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('六、道具系统'));
children.push(h2('6.1  道具种类'));
const itemW = [Math.round(CW*0.22), Math.round(CW*0.38), Math.round(CW*0.4)];
children.push(mkTable(
  ['道具名称', '效果', '使用时机'],
  itemW,
  [
    ['复活太空舱\n(Revive Capsule)', '球死亡时可选择使用，消耗 1 个可在死亡点原地复活，保留当前分数与血量', '死亡结算界面弹出选项，玩家确认后消耗'],
    ['防滑外套\n(Anti-Slip Shell)', '下一次落入冰面时，阻止球进入滑行状态，保持正常弹跳', '拾取后自动生效，下一次冰面碰撞时消耗'],
    ['防风外套\n(Windproof Jacket)', '穿越侧风区域时，完全消除横向推力，球按正常路径运动', '拾取后自动生效，穿越侧风区结束时消耗'],
    ['飞行服\n(Flight Suit)', '激活后球悬浮飞行 3 秒，期间无敌（不受颜色匹配、冰面、侧风影响）', '拾取后玩家手动在 HUD 点击图标激活'],
  ]
));
children.push(blank());

children.push(h2('6.2  道具生成机制'));
children.push(para('道具由 trySpawnItem(group) 函数在每条新轨道生成时调用，使用概率权重随机决定是否生成及生成类型。生成的道具为浮动发光的 3D 模型（GLB），悬停在轨道正上方，带有上下浮动动画。'));
children.push(para('道具数量通过 localStorage（键名 bounceGameItems）持久化，页面刷新后保留。玩家也可在商城中用星星购买道具。'));
children.push(blank());

children.push(h2('6.3  商城系统'));
children.push(para('商城通过点击顶部导航的"商城"按钮打开，以卡片形式展示四种道具及其三维预览模型。预览模型使用独立的 THREE.WebGLRenderer 渲染到 <canvas>，配备五盏灯光（环境光 + 半球光 + 3 定向光 + 点光源）以获得最佳视觉效果。玩家用游戏内星星（从闯关或无尽模式获取）购买道具，购买后数量立即更新并保存。'));

// ══════════════════════════════════════════════════════════════════════
// 第七章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('七、游戏玩法说明'));
children.push(h2('7.1  如何开始'));
children.push(para('在浏览器中打开游戏（localhost:9090 或直接打开 HTML 文件），首先进入欢迎页，点击"开始游戏"进入模式选择页。可选择"闯关模式"或"无尽模式"。'));
children.push(blank());

children.push(h2('7.2  操作方式'));
const ctrlW = [Math.round(CW*0.3), Math.round(CW*0.7)];
children.push(mkTable(
  ['操作', '功能'],
  ctrlW,
  [
    ['点击 / 触摸屏幕左侧', '小球向左移动（适合移动端）'],
    ['点击 / 触摸屏幕右侧', '小球向右移动'],
    ['键盘 ← / A', '小球向左'],
    ['键盘 → / D', '小球向右'],
    ['点击 HUD 道具图标', '激活对应道具（如飞行服）'],
    ['点击左上角 ☰', '打开暂停/返回菜单'],
  ]
));
children.push(blank());

children.push(h2('7.3  闯关模式流程'));
children.push(para('选择"闯关模式"后进入关卡选择页，已解锁的关卡高亮显示并标明最高星级。点击关卡卡片开始倒计时（3-2-1-GO），随后游戏开始。到达目标距离后显示胜利结算界面，展示本局星级与"下一关"按钮。'));
children.push(blank());

children.push(h2('7.4  无尽模式流程'));
children.push(para('选择"无尽模式"后立即开始游戏，球持续向前，每累计 300m 奖励一颗星星（同时在 HUD 顶部显示进度）。每 900m 会暂停跳出路径选择界面，玩家可在三条路线中选择一条继续。死亡后可选择使用复活太空舱、观看广告或消耗本局累计星星复活。'));

// ══════════════════════════════════════════════════════════════════════
// 第八章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('八、创新点与同类游戏对比'));
children.push(h2('8.1  与同类游戏对比'));
const cmpW = [Math.round(CW*0.28), Math.round(CW*0.36), Math.round(CW*0.36)];
children.push(mkTable(
  ['对比维度', '同类游戏（Helix Jump 等）', '本游戏'],
  cmpW,
  [
    ['平台', '原生 iOS / Android App', '纯 Web 浏览器，无需安装'],
    ['渲染技术', 'Unity 3D / Unreal', 'Three.js + WebGL（JavaScript 实现）'],
    ['轨道类型', '单一螺旋轨道', '5 种轨道（长直/双色/三色/加速/冰面）'],
    ['特殊地形', '无', '冰面滑行 + 侧风区域 + 黑洞吸附'],
    ['背景系统', '静态背景图', '程序化动态背景（9 套主题）+ GLB 模型'],
    ['关卡系统', '部分有', '10 个星际主题关卡，带星级评定与进度存储'],
    ['道具系统', '简单复活', '4 种不同机制道具，含商城购买系统'],
    ['音效', '简单音效', 'Web Audio API 合成 8+ 种音效'],
    ['着色器', '无自定义 Shader', 'GLSL 冰面着色器（3D Noise + Fresnel）'],
  ]
));
children.push(blank());

children.push(h2('8.2  主要创新点'));
children.push(h3('8.2.1  程序化冰面 GLSL 着色器'));
children.push(para('冰面完全通过 GLSL 程序化生成，不依赖任何外部纹理图片。3D FBM Noise 算法模拟真实冰裂纹，菲涅尔项模拟冰面反射，动态 uTime 驱动噪声流动，兼顾性能与视觉真实感。'));
children.push(blank());
children.push(h3('8.2.2  多样化的特殊地形互动'));
children.push(para('相较于同类游戏仅有颜色匹配机制，本游戏加入了三种完全不同的危险地形：冰面（摩擦力消除、随机推力）、侧风（持续横向力）、黑洞（近场吸附），每种地形对应专属道具克制，形成"地形-威胁-道具"三角系统。'));
children.push(blank());
children.push(h3('8.2.3  程序化星际主题背景'));
children.push(para('10 个关卡每关都有独特的程序化背景或 GLB 装饰模型，从地球到奇点彼岸，背景跟随球的 Z 轴实时移动，避免球跑出背景范围。土星、天王星等星球使用纯程序化贴图（无外部图片），在性能与视觉效果间取得平衡。'));
children.push(blank());
children.push(h3('8.2.4  完整的商城与进度系统'));
children.push(para('通过 localStorage 持久化闯关进度（解锁关卡 + 星级）与道具数量，页面刷新后全部保留。商城支持用游戏内货币购买道具并实时 3D 预览，形成正向激励循环。'));

// ══════════════════════════════════════════════════════════════════════
// 第九章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('九、运行截图说明'));
children.push(para('由于报告生成时无法自动截图，请按以下说明在游戏运行时截取对应截图，插入本章对应位置：'));
children.push(blank());

const ssW = [Math.round(CW*0.08), Math.round(CW*0.32), Math.round(CW*0.6)];
children.push(mkTable(
  ['编号', '截图名称', '截图内容说明'],
  ssW,
  [
    ['①', '欢迎页 / 模式选择页', '游戏启动后的主界面，展示游戏名称、"开始游戏"按钮'],
    ['②', '关卡选择页', '10 个关卡卡片，展示已解锁、已完成（带星级）与锁定状态'],
    ['③', '游戏进行中（长直轨道）', '小球在彩色长直轨道上弹跳，HUD 显示分数、血条、Combo'],
    ['④', '冰面轨道特效', '小球在冰面上滑行，冰面的 Shader 裂纹与菲涅尔发光效果清晰可见'],
    ['⑤', '侧风区域', '橙色/蓝色风向箭头与动态光线，小球被风推偏的瞬间'],
    ['⑥', '黑洞关卡（第 9 关）', '黑洞 GLB 模型与螺旋粒子流，深紫色天空背景'],
    ['⑦', '道具拾取 / 飞行状态', '飞行服激活后小球悬浮，HUD 道具图标高亮或飞行粒子轨迹'],
    ['⑧', '道具商城页', '四种道具 3D 预览卡片，展示名称、描述、价格与购买按钮'],
    ['⑨', '路径选择界面（无尽模式）', '三条路线的选择卡片，每条路线有冰/风/加速比例说明'],
    ['⑩', '通关结算页', '星级动画（1-3星）、本局分数、PERFECT 比率与"下一关"按钮'],
  ]
));
children.push(blank());
children.push(para('注：截图建议在 Chrome 浏览器全屏模式下按 F12 → 截图，以获得最佳分辨率效果。每张截图建议尺寸不低于 1280×720 像素。'));

// ══════════════════════════════════════════════════════════════════════
// 第十章
// ══════════════════════════════════════════════════════════════════════
children.push(pb());
children.push(h1('十、总结'));
children.push(h2('10.1  项目完成情况'));
children.push(para('本次大作业成功实现了一款功能完整、视觉效果丰富的 3D 弹跳球闯关游戏。主要完成内容包括：'));
children.push(bullet('基于 Three.js r128 + WebGL 构建完整 3D 游戏场景，实现了透视摄像机、多层灯光、几何体生成、材质系统等图形学基础功能；'));
children.push(bullet('设计并实现了 10 个星际主题关卡，每关独立的程序化背景或 GLB 模型，配合天空球 Z 轴跟随机制；'));
children.push(bullet('5 种轨道类型（长直/双色/三色/加速/冰面）结合 3 种特殊地形（侧风/黑洞）构成丰富的游戏策略层；'));
children.push(bullet('设计并实现了 GLSL 程序化冰面着色器（3D Noise + 菲涅尔），完全不依赖外部纹理；'));
children.push(bullet('实现了多套粒子系统（涟漪、破碎、爆发、霜花、黑洞、加速拖影），显著提升游戏表现力；'));
children.push(bullet('4 种道具系统（复活、防滑、防风、飞行）配合道具商城，形成完整的游戏经济循环；'));
children.push(bullet('完整的 localStorage 进度存储，支持闯关进度、星级、道具数量的持久化。'));
children.push(blank());

children.push(h2('10.2  遇到的主要问题与解决方案'));
const qW = [Math.round(CW*0.38), Math.round(CW*0.62)];
children.push(mkTable(
  ['问题描述', '解决方案'],
  qW,
  [
    ['Three.js r128 不支持 MeshPhysicalMaterial 的 transmission / clearcoat 属性', '改用 MeshPhongMaterial，通过高光参数（shininess, specular）模拟反光效果'],
    ['冰面材质需要动态贴图但 AI 生成的图片效果不佳', '改用纯 GLSL 程序化 ShaderMaterial，3D Noise 生成裂纹，完全不依赖外部图片'],
    ['第 9/10 关背景在 500m 后变全黑', '根因：背景 sky dome 半径仅 500，而背景组未跟随球移动。修复：在主循环中同步 stage9BgGroup.position.z = sphere.position.z'],
    ['GLB 模型加载后颜色偏暗或不正确', '在 GLTFLoader.load 回调中保留原始 GLB 材质，仅增加场景灯光强度，不替换任何材质属性'],
    ['本地 Python HTTP 服务器 localhost 无法连接', '添加 IPv6 双栈支持（socket.AF_INET6 + IPV6_V6ONLY=0），并创建 .bat 一键启动脚本'],
    ['冰面球滑落时黑洞未能吸收', '黑洞吸附阈值从 0-5m 扩展为 -5m 至 10m（含球已越过黑洞的情况）'],
  ]
));
children.push(blank());

children.push(h2('10.3  心得与展望'));
children.push(para('本次课程设计是一次高强度的综合实践，深刻体会到计算机图形学在实际工程中的运用远比课堂理论复杂。Three.js 封装了大量 WebGL 细节，但仍需深刻理解 3D 矩阵变换、光照模型、着色器原理才能真正驾驭。GLSL 着色器编程尤其让人印象深刻——短短数十行代码即可产生难以用参数化材质模拟的视觉效果。'));
children.push(para('未来如有机会进一步完善，计划加入以下内容：'));
children.push(bullet('使用 Three.js InstancedMesh 对大量重复轨道几何体进行实例化渲染，进一步提升帧率；'));
children.push(bullet('加入在线排行榜（WebSocket / REST API），支持多人成绩比较；'));
children.push(bullet('使用 Three.js 后处理管线（EffectComposer）加入 Bloom、FXAA 等后期效果；'));
children.push(bullet('适配移动端触控操作，支持微信小游戏发布。'));
children.push(blank());
children.push(para('总体而言，本项目实现了预期目标，在技术深度和功能完整性上均达到了计算机图形学大作业的要求。感谢老师在课程中对 WebGL 渲染管线和着色器编程的讲解，为本项目的开发奠定了坚实基础。'));

// ─── 生成文档 ────────────────────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: '宋体', size: 24 } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run:       { size: 32, bold: true, font: '黑体', color: CLR.navy },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run:       { size: 26, bold: true, font: '黑体', color: CLR.blue },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run:       { size: 24, bold: true, font: '黑体', color: CLR.black },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size:   { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    children,
  }],
});

const outPath = path.join(__dirname, '计算机图形学大作业_3D弹跳球游戏.docx');
Packer.toBuffer(doc)
  .then(buf => {
    fs.writeFileSync(outPath, buf);
    console.log('✅ Word 文档已生成：' + outPath);
  })
  .catch(e => {
    console.error('❌ 生成失败：', e);
    process.exit(1);
  });
