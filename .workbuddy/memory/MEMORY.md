# 长期记忆

## 项目概要
- 项目：Three.js 3D 弹跳球游戏（Helix Jump 风格）
- **已拆分文件**: `threejs-sphere.html`(骨架), `styles.css`(全部样式), `game.js`(~4060行 全部逻辑)
- Three.js 版本：**r128**（重要约束！不支持 MeshPhysicalMaterial 的 transmission/clearcoat 属性）
- 本地服务器：Python 多线程 HTTP `_serve.py` 端口 9090

## 闯关模式（Stages Mode）
- 10关星际穿越主题：地球轨道→月球→火星→木星→土星→天王星→海王星→冥王星→黑洞视界→奇点彼岸
- localStorage 进度: `bounceGameStageProgress` = `{unlocked: number, stars: {[id]: 0-3}}`
- 星级评定: ≥70% PERFECT → 3★, ≥40% → 2★, 其余 → 1★
- 通关自动解锁下一关
- 关卡卡片状态: locked(🔒灰显)/unlocked(可点击)/completed(★显示)
- Game Over 显示进度百分比，Victory 显示星级+"下一关"/"返回关卡选择"

## 轨道类型清单
| type | 名称 | 宽 | 深 | 特殊行为 |
|------|------|-----|------|----------|
| 1 | 长直轨道 | LONG_W=8 | LONG_D=3.6 | 标准 |
| 2 | 双色方形 | SQ_W=3.2 | SQ_D=2.4 | 连击变色 |
| 3 | 三色方形 | SQ_W=3.2 | SQ_D=2.4 | 三色全包 |
| 4 | 加速轨道 | LONG_W=8 | LONG_D=3.6 | 8秒加速，不变色 |
| 5 | 冰霜段 | ICE_W=2.5 | ICE_D=24.0 | 球滑行不弹跳，随机横向推力 |

## 代码改动记录规范（用户要求）
- 每版改动必须记录到当天的 `YYYY-MM-DD.md` 工作日志
- 记录内容：版本号、改动摘要、改动位置（行号/函数名）、修复的 Bug 根因
- 紧急修复标注 `hotfix` 后缀
- **Git 必做**：每版改动完成后必须 `git commit`，仓库位于项目根目录 `c:/Users/lamb/WorkBuddy/20260412222433/`

## 技术约束
- Three.js r128 只能用 `MeshPhongMaterial` / `MeshStandardMaterial`（不支持 clearcoat/transmission）
- Three.js r128 的 ShaderMaterial 提供内置 uniform：`modelMatrix`、`viewMatrix`、`projectionMatrix`、`modelViewMatrix`、`cameraPosition`、`normalMatrix`
- 球材质也是 `MeshPhongMaterial`（v6d 从 MeshPhysicalMaterial 修复）
- 球弹跳物理基于时间驱动插值（jumpTimer / curJumpDur）
- 颜色连通性：段颜色由 activeColorKey 维护，长直轨道更新段颜色
- 冰霜段和加速轨道：不变色、不计分、不更新 activeColorKey
- 加速轨道（type4）和冰霜段（type5）不能连续出现（canBoost/canIce 条件互斥）
- **冰霜段（type5）使用程序化 GLSL Shader（不依赖外部纹理图片）**：3D noise 冰裂纹+气泡+菲涅尔发光，通过 `createIceShaderMat()` 工厂函数创建
- **`activeIceMats` 全局数组**追踪所有活跃冰面 ShaderMaterial，每帧更新 uTime/uCameraPos
- `ice-crystal.png` 已废弃（AI 生成图片不适合做 3D 纹理），可删除

## 用户偏好
- 简体中文沟通
- 代码检查要求快速定位，偏好完整错误堆栈
- 结构化输出（表格/列表）
- 渐进式开发流程：提想法→AI设计→用户确认→实施→反馈
- 音量要求较高
- 粒子效果：细碎发光、从上方飘落、不遮挡视线

## 最新机制记录（v11.0-hotfix5）

### 死亡颜色持久化
- `lastDeathColor` (THREE.Color) + `lastDeathColorKey` (string) 保存球死时的颜色
- `saveBallDeathColor()` 在 4 个死亡触发点调用（护盾碎、冰面越界、落地脱轨、颜色不匹配）
- `revivePlayer()` 统一从 `lastDeathColor/lastDeathColorKey` 恢复，不再查平台颜色

### 倒计时画布渲染
- `animate()` 中 `!gameStarted` 分支不再跳过渲染，添加简易镜头跟随 + `renderer.render()`

### 路径选择后缓冲区刷新
- `selectPath()` 调用 `refreshGroupsAfterPath()` → `disposeGroup()` 清理前方组 → `ensureGroupsAhead()` 重新生成
- 解决三分路检查点前预生成的缓冲区缺乏冰面的问题
