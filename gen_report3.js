const fs   = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, WidthType, ShadingType, BorderStyle,
        LevelFormat } = require('docx');

const C = { navy:'1F3864', blue:'2E75B6', lblue:'BDD7EE', black:'000000', gray:'555555' };
const DXA = (in) => Math.round(in * 1440);
const CW = DXA(8.5) - DXA(1)*2;
const COL2 = Math.round(CW*0.5);
const COL3 = Math.round(CW/3);
const COL4 = Math.round(CW/4);

const border = { style:BorderStyle.SINGLE, size:3, color:C.blue };
const bL = { top:border, bottom:border, left:border, right:border };

const h1 = (t) => new Paragraph({
  heading:HeadingLevel.HEADING_1,
  spacing:{before:480,after:240},
  children:[new TextRun({text:t, font:'黑体', size:32, bold:true, color:C.navy})]
});
const h2 = (t) => new Paragraph({
  heading:HeadingLevel.HEADING_2,
  spacing:{before:360,after:180},
  children:[new TextRun({text:t, font:'黑体', size:28, bold:true, color:C.blue})]
});
const h3 = (t) => new Paragraph({
  heading:HeadingLevel.HEADING_3,
  spacing:{before:240,after:120},
  children:[new TextRun({text:t, font:'黑体', size:24, bold:true, color:C.black})]
});
const pj = (t) => new Paragraph({
  children:[new TextRun({text:t, font:'宋体', size:24})],
  alignment:AlignmentType.JUSTIFY,
  spacing:{before:60,after:60,line:360}
});
const bl = (t) => new Paragraph({
  children:[new TextRun({text:'• '+t, font:'宋体', size:24})],
  spacing:{before:40,after:40,line:320}
});
const c = (t, opts={}) => new TableCell({
  children: [
    typeof t==='string'
      ? new Paragraph({children:[new TextRun({text:t, font:'宋体', size:22, ...(opts.run||{})})]})
      : t
  ],
  width:{size:opts.w||COL2, type:WidthType.DXA},
  shading: opts.fill ? {fill:opts.fill, type:ShadingType.CLEAR} : undefined,
  margins:{top:80,bottom:80,left:120,right:120},
  verticalAlign:'center',
});

const children = [];

/* ── 封面 ── */
children.push(
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:2400,after:400}, children:[new TextRun({text:'《计算机图形学》大作业', font:'黑体', size:44, bold:true, color:C.navy})] }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:400}, children:[new TextRun({text:'3D 弹跳球闯关游戏', font:'黑体', size:36, bold:true, color:C.blue})] }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:800}, children:[new TextRun({text:'—— 基于 Three.js 的实现与设计', font:'宋体', size:28, color:C.gray})] }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{before:600,after:200}, children:[new TextRun({text:'学　　生：__________', font:'宋体', size:26})] }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:200}, children:[new TextRun({text:'学　　号：__________', font:'宋体', size:26})] }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:200}, children:[new TextRun({text:'专　　业：__________', font:'宋体', size:26})] }),
  new Paragraph({ alignment:AlignmentType.CENTER, spacing:{after:2400}, children:[new TextRun({text:'日　　期：2026 年 6 月', font:'宋体', size:26})] }),
);

/* ── 目录 ── */
const tocItems = ['研究目的与意义','开发环境与软件工具','游戏设计与功能模块','游戏规则与难度设计','场景、模型与动画的实现','道具系统','游戏玩法说明','创新点与同类游戏对比','运行截图说明','总结'];
const tocNums = ['一','二','三','四','五','六','七','八','九','十'];
children.push(new Paragraph({ pageBreakBefore:true, alignment:AlignmentType.CENTER, spacing:{before:1200,after:600}, children:[new TextRun({text:'目　　录', font:'黑体', size:36, bold:true, color:C.navy})] }));
for(let i=0;i<tocItems.length;i++){
  children.push(new Paragraph({
    spacing:{before:200,after:200},
    children:[new TextRun({text:'第 '+tocNums[i]+' 章　'+tocItems[i], font:'宋体', size:26, color:C.black})]
  }));
}

/* ══════ 第1章 ══════ */
children.push(new Paragraph({pageBreakBefore:true, children:[]}));
children.push(h1('一、研究目的与意义'));
children.push(pj('随着Web技术的飞速发展，基于浏览器的实时3D图形渲染已经成为计算机图形学的重要研究方向。相比于传统的原生图形应用，Web 3D 具有跨平台、无需安装、即时分享等优势，在游戏、教育、产品展示等领域展现出广阔的应用前景。'));
children.push(pj('本课题以 Three.js（基于 WebGL 的 JavaScript 3D 图形库）为核心技术，设计并实现了一款具有完整游戏性的 3D 弹跳球闯关游戏。项目涵盖计算机图形学核心知识点：3D 场景构建、透视摄像机与观察矩阵、几何图元生成、纹理映射、着色器编程（GLSL）、粒子系统、动画与交互等。同时在此基础上进行了创新设计，加入了闯关模式、道具系统、程序化背景等特色功能，使项目兼具学术学习价值与娱乐性。'));

children.push(h2('1.1  研究目的'));
children.push(bl('掌握 Three.js / WebGL 的核心渲染流程，理解 3D 图形管线的实际运用；'));
children.push(bl('设计并实现一个包含完整游戏逻辑的 3D 交互应用，涵盖场景管理、物理模拟、碰撞检测等模块；'));
children.push(bl('探索 GLSL 着色器在游戏特效（冰面 Shader、粒子效果）中的实际应用；'));
children.push(bl('研究基于浏览器的 3D 游戏性能优化方法（几何体复用、视锥剔除、资源释放等）。'));

children.push(h2('1.2  研究意义'));
children.push(pj('本项目的完成表明：利用纯 Web 技术即可实现高质量 3D 游戏，无需任何插件或本地安装。这对推动计算机图形学教学的信息化、可视化具有积极意义。同时，项目中使用的闯关进度存储（localStorage）、GLB 模型加载、着色器材质等实践内容，可为同类课程设计提供参考。'));

/* ══════ 第2章 ══════ */
children.push(new Paragraph({pageBreakBefore:true, children:[]}));
children.push(h1('二、开发环境与软件工具'));
children.push(h2('2.1  开发软件与编程语言'));
const devRows = [
  new TableRow({children:[c('开发工具',{w:COL3,fill:C.lblue,run:{bold:true}}),c('用途说明',{w:COL3*2,fill:C.lblue,run:{bold:true}})]}),
  new TableRow({children:[c('VS Code',{w:COL3}),c('代码编辑与调试（安装 ESLint、Prettier 插件）',{w:COL3*2})]}),
  new TableRow({children:[c('Google Chrome',{w:COL3}),c('游戏运行与调试，利用 DevTools 进行性能分析（FPS、内存）',{w:COL3*2})]}),
  new TableRow({children:[c('Python 3.13',{w:COL3}),c('启动本地 HTTP 服务器（_serve.py），端口 9090',{w:COL3*2})]}),
  new TableRow({children:[c('Node.js 22',{w:COL3}),c('安装和管理 npm 包（docx 等）',{w:COL3*2})]}),
  new TableRow({children:[c('Git',{w:COL3}),c('版本控制，记录每次功能迭代与 Bug 修复',{w:COL3*2})]}),
];
children.push(new Table({width:{size:CW,type:WidthType.DXA}, columnWidths:[COL3,COL3*2], rows:devRows}));

children.push(h2('2.2  核心技术库'));
const libRows = [
  new TableRow({children:[c('库名',{w:COL3,fill:C.lblue,run:{bold:true}}),c('版本',{w:Math.round(CW*0.22),fill:C.lblue,run:{bold:true}}),c('用途',{w:Math.round(CW*0.45),fill:C.lblue,run:{bold:true}})]}),
  new TableRow({children:[c('Three.js',{w:COL3}),c('r128',{w:Math.round(CW*0.22)}),c('3D 渲染引擎：场景、摄像机、几何体、材质、灯光、加载器',{w:Math.round(CW*0.45)})]}),
  new TableRow({children:[c('three/examples/jsm/loaders/GLTFLoader',{w:COL3}),c('r128',{w:Math.round(CW*0.22)}),c('加载 .glb / .gltf 3D 模型（道具、星球背景模型）',{w:Math.round(CW*0.45)})]}),
  new TableRow({children:[c('Web Audio API',{w:COL3}),c('原生',{w:Math.round(CW*0.22)}),c('游戏音效合成（着陆、破碎、护盾命中、侧风等）',{w:Math.round(CW*0.45)})]}),
  new TableRow({children:[c('localStorage API',{w:COL3}),c('原生',{w:Math.round(CW*0.22)}),c('闯关进度（解锁关卡、星级评定）与道具数量的持久化存储',{w:Math.round(CW*0.45)})]}),
];
children.push(new Table({width:{size:CW,type:WidthType.DXA}, columnWidths:[COL3,Math.round(CW*0.22),Math.round(CW*0.45)], rows:libRows}));

children.push(h2('2.3  3D 模型来源'));
children.push(pj('本游戏中的 3D 模型分为两类：'));
children.push(bl('程序化生成：星球背景、冰面着色器材质、粒子特效（星星、尘土、光带）均由代码实时生成，无需外部文件；'));
children.push(bl('AI 生成的 GLB 模型：道具模型（复活太空舱、防滑外套、防风外套、飞行服）以及各关卡主题模型（地球-月球、火星、木星、土星、天王星、海王星、冥王星、黑洞、奇点彼岸）均使用 AI 3D 生成工具创建，导出为 .glb 格式后由 GLTFLoader 加载。'));

/* ══════ 第3章 ══════ */
children.push(new Paragraph({pageBreakBefore:true, children:[]}));
children.push(h1('三、游戏设计与功能模块'));
children.push(h2('3.1  总体架构'));
children.push(pj('游戏采用单页应用（SPA）架构，前端由三个文件组成：'));
children.push(bl('threejs-sphere.html：页面结构、UI 层（欢迎页、模式选择页、关卡选择页、游戏 HUD、商城页、帮助页、结算页）；'));
children.push(bl('styles.css：全部样式，负责响应式布局与游戏 UI 美化；'));
children.push(bl('game.js（约 4100 行）：全部游戏逻辑，包括 Three.js 场景初始化、游戏循环（animate）、物理系统、道具系统、闯关系统等。')));
children.push(pj('这种「结构-样式-逻辑」分离的设计符合 Web 标准，便于维护和迭代。'));

children.push(h2('3.2  功能模块划分'));
const modRows = [
  new TableRow({children:[c('模块名称',{w:COL3,fill:C.lblue,run:{bold:true}}),c('主要功能',{w:Math.round(CW*0.3),fill:C.lblue,run:{bold:true}}),c('关键函数 / 对象',{w:Math.round(CW*0.37),fill:C.lblue,run:{bold:true}})]}),
  new TableRow({children:[c('场景管理',{w:COL3}),c('初始化 Three.js 场景、摄像机、渲染器、灯光系统',{w:Math.round(CW*0.3)}),c('scene, camera, renderer',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('几何体生成',{w:COL3}),c('根据关卡类型生成不同类型的轨道段（长直、方形、冰面、加速）',{w:Math.round(CW*0.3)}),c('createLongPlatform()\ncreateTriplePlatform()\ncreateIcePlatform()\ncreateBoostPlatform()',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('物理与运动',{w:COL3}),c('小球弹跳物理（时间驱动插值）、摄像机跟随、侧风推力、冰面滑行',{w:Math.round(CW*0.3)}),c('initJump()\nanimate()[物理更新部分]\niceSlideAccelDir',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('碰撞检测',{w:COL3}),c('落点 X 范围检测、颜色匹配检测、黑洞吸附检测、道具拾取检测',{w:Math.round(CW*0.3)}),c('findGroupAt()\ncheckLandColorMatch()\ncheckAntiSlip()',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('粒子系统',{w:COL3}),c('涟漪粒子、破碎粒子、爆发粒子、霜花粒子、黑洞粒子、加速粒子',{w:Math.round(CW*0.3)}),c('triggerRipple()\nupdateFrostParticles()\ntriggerBurst()\ntriggerPickupBurst()',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('着色器特效',{w:COL3}),c('冰面 3D Noise Shader（裂纹+气泡+菲涅尔发光），不依赖外部纹理',{w:Math.round(CW*0.3)}),c('createIceShaderMat()\nfrostParticleTex',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('道具系统',{w:COL3}),c('道具生成、拾取、使用、UI 显示、数量持久化',{w:Math.round(CW*0.3)}),c('trySpawnItem()\npickupItem()\nbuyItem()\nsaveItems()',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('闯关系统',{w:COL3}),c('10 个关卡、进度解锁、星级评定（≥70% PERFECT→3★）、localStorage 存储',{w:Math.round(CW*0.3)}),c('STAGE_CFGS[]\nenterStageSelect()\nsaveStageProgress()',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('无尽模式',{w:COL3}),c('程序化背景（4 套）、路径选择（每 900 m）、确定性的风/冰生成',{w:Math.round(CW*0.3)}),c('createEndlessBg0-3()\nplanSegmentSpecials()\nshowPathChoice()',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('音效系统',{w:COL3}),c('Web Audio API 合成所有音效（着陆、破碎、护盾、侧风、倒计时等）',{w:Math.round(CW*0.3)}),c('playLandSound()\nplayShatterSound()\nplayShieldHitSound()',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('UI 管理',{w:COL3}),c('页面切换动画、HUD 更新、商城/帮助页、结算页',{w:Math.round(CW*0.3)}),c('switchPage()\nshowGameOver()\nbuildStageCards()',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('背景管理',{w:COL3}),c('9 套程序化背景 + 10 个关卡专属 3D 模型，跟随球移动',{w:Math.round(CW*0.3)}),c('createStageBackground()\nshowEarth() / showMoonBase()\nstage9Model.position.z',{w:Math.round(CW*0.37)})]}),
];
children.push(new Table({width:{size:CW,type:WidthType.DXA}, columnWidths:[COL3,Math.round(CW*0.3),Math.round(CW*0.37)], rows:modRows}));

children.push(h2('3.3  核心类与对象'));
children.push(pj('游戏采用面向过程 + 少部分面向对象的设计。主要对象和数组结构如下：'));
const objRows = [
  new TableRow({children:[c('对象 / 数组',{w:Math.round(CW*0.25),fill:C.lblue,run:{bold:true}}),c('类型',{w:Math.round(CW*0.2),fill:C.lblue,run:{bold:true}}),c('说明',{w:Math.round(CW*0.55),fill:C.lblue,run:{bold:true}})]}),
  new TableRow({children:[c('scene',{w:Math.round(CW*0.25)}),c('THREE.Scene',{w:Math.round(CW*0.2)}),c('Three.js 场景根节点，包含所有 3D 对象',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('camera',{w:Math.round(CW*0.25)}),c('THREE.PerspectiveCamera',{w:Math.round(CW*0.2)}),c('透视摄像机，跟随小球位置',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('groups[]',{w:Math.round(CW*0.25)}),c('Array<Object>',{w:Math.round(CW*0.2)}),c('轨道段数组，每个元素含 {type, parts[], landZ, color, colorKey, index}',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('ripples[]',{w:Math.round(CW*0.25)}),c('Array<Object>',{w:Math.round(CW*0.2)}),c('涟漪粒子数组，每个元素含 {points, born, life, color, velY}',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('windZones[]',{w:Math.round(CW*0.25)}),c('Array<Object>',{w:Math.round(CW*0.2)}),c('侧风区域数组，每个含 {zStart, zEnd, direction, lines, warning}',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('blackhole',{w:Math.round(CW*0.25)}),c('Object',{w:Math.round(CW*0.2)}),c('黑洞对象，含 group（外层球体）、ring（吸积盘）、glow（光晕）',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('sphere',{w:Math.round(CW*0.25)}),c('THREE.Mesh',{w:Math.round(CW*0.2)}),c('小球网格对象，材质 sphereMat（MeshPhongMaterial）',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('SHOP_ITEMS[]',{w:Math.round(CW*0.25)}),c('Array<Object>',{w:Math.round(CW*0.2)}),c('商城道具配置数组，每个含 {id, name, nameCN, desc, price, icon}',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('STAGE_CFGS[]',{w:Math.round(CW*0.25)}),c('Array<Object>',{w:Math.round(CW*0.2)}),c('关卡配置数组，每个含 {id, name, nameCN, targetDist, hasBoost, hasIce, hasWind, gapMul}',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('stage9Model',{w:Math.round(CW*0.25)}),c('THREE.Group',{w:Math.round(CW*0.2)}),c('第 9 关「黑洞视界」GLB 模型（stage9_blackhole_20260527.glb）',{w:Math.round(CW*0.55)})]}),
  new TableRow({children:[c('endlessBgGroups[]',{w:Math.round(CW*0.25)}),c('Array<THREE.Group>',{w:Math.round(CW*0.2)}),c('无尽模式 4 套程序化背景，每套含天空球、地面、粒子等',{w:Math.round(CW*0.55)})]}),
];
children.push(new Table({width:{size:CW,type:WidthType.DXA}, columnWidths:[Math.round(CW*0.25),Math.round(CW*0.2),Math.round(CW*0.55)], rows:objRows}));

/* ══════ 第4章 ══════ */
children.push(new Paragraph({pageBreakBefore:true, children:[]}));
children.push(h1('四、游戏规则与难度设计'));
children.push(h2('4.1  基本操作'));
children.push(pj('玩家通过鼠标点击或触摸屏点击控制小球跳跃。小球会自动朝前方（Z 轴负方向）跳跃，落点 X 坐标由点击位置决定（屏幕左侧→球向左移动，右侧→向右）。'));
children.push(bl('左键点击 / 触屏：使小球从当前轨道跳向下一段轨道；'));
children.push(bl('落点偏离轨道中心越小，评价越高（PERFECT / GREAT）；'));
children.push(bl('连续安全着陆 3 次，护盾自动回充（可抵挡 1 次伤害）。'));

children.push(h2('4.2  轨道类型'));
const typeRows = [
  new TableRow({children:[c('类型',{w:COL3,fill:C.lblue,run:{bold:true}}),c('名称',{w:Math.round(CW*0.2),fill:C.lblue,run:{bold:true}}),c('尺寸（宽×深）',{w:Math.round(CW*0.2),fill:C.lblue,run:{bold:true}}),c('特殊规则',{w:Math.round(CW*0.37),fill:C.lblue,run:{bold:true}})]}),
  new TableRow({children:[c('Type 1',{w:COL3}),c('长直轨道',{w:Math.round(CW*0.2)}),c('8.0 × 3.6',{w:Math.round(CW*0.2)}),c('标准轨道，球落地后变色，计入连击',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('Type 2',{w:COL3}),c('双色方形',{w:Math.round(CW*0.2)}),c('3.2 × 2.4',{w:Math.round(CW*0.2)}),c('两个方块，连击变色',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('Type 3',{w:COL3}),c('三色方形',{w:Math.round(CW*0.2)}),c('3.2 × 2.4',{w:Math.round(CW*0.2)}),c('三个方块，需跳全三色',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('Type 4',{w:COL3}),c('加速轨道',{w:Math.round(CW*0.2)}),c('8.0 × 3.6',{w:Math.round(CW*0.2)}),c('8 秒加速效果，不变色、不计分',{w:Math.round(CW*0.37)})]}),
  new TableRow({children:[c('Type 5',{w:COL3}),c('冰霜段',{w:Math.round(CW*0.2)}),c('2.5 × 24.0',{w:Math.round(CW*0.2)}),c('球滑行不弹跳，随机横向推力，需防风外套/防滑外套',{w:Math.round(CW*0.37)})]}),
];
children.push(new Table({width:{size:CW,type:WidthType.DXA}, columnWidths:[COL3,Math.round(CW*0.2),Math.round(CW*0.2),Math.round(CW*0.37)], rows:typeRows}));

children.push(h2('4.3  死亡条件'));
children.push(bl('小球落点超出轨道范围 → 掉落死亡；'));
children.push(bl('落到 Type 2/3 轨道但颜色不匹配 → 球碎裂死亡；'));
children.push(bl('在冰面上滑行时超出冰面边界 → 掉落死亡；'));
children.push(bl('被侧风吹落轨道 → 死亡；'));
children.push(bl('护盾存在时可抵挡 1 次死亡判定（血条归零前）。'));

children.push(h2('4.4  复活机制'));
children.push(pj('死亡后玩家可选择以下任意一种方式复活：'));
children.push(bl('使用 1 个复活太空舱（道具，商城购买或关卡拾取）；'));
children.push(bl('观看广告（模拟，点击按钮即可）；'));
children.push(bl('使用当局累积星星复活（无尽模式专用）。'));

// ══════ 写入文件 ══════
const outPath = path.join(__dirname, '计算机图形学大作业_3D弹跳球游戏.docx');
const doc = new Document({
  styles:{
    default:{ document:{ run:{ font:'宋体', size:24 } } },
    paragraphStyles:[
      { id:'Heading1', name:'Heading 1', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:{size:32,bold:true,font:'黑体',color:C.navy},
        paragraph:{ spacing:{before:480,after:240}, outlineLevel:0 }},
      { id:'Heading2', name:'Heading 2', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:{size:28,bold:true,font:'黑体',color:C.blue},
        paragraph:{ spacing:{before:360,after:180}, outlineLevel:1 }},
      { id:'Heading3', name:'Heading 3', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:{size:24,bold:true,font:'黑体',color:C.black},
        paragraph:{ spacing:{before:240,after:120}, outlineLevel:2 }},
    ]
  },
  sections:[{
    properties:{
      page:{ size:{width:DXA(8.5), height:DXA(11)}, margin:{top:DXA(1),right:DXA(1),bottom:DXA(1),left:DXA(1)} }
    },
    children:children
  }]
});
Packer.toBuffer(doc).then(buf=>{
  fs.writeFileSync(outPath, buf);
  console.log('✅ 文档已生成：' + outPath);
}).catch(e=>{ console.error('❌ 生成失败：', e); process.exit(1); });
