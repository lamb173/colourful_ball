====================================
   弹跳小球 · 星际穿越 游戏
   本地运行说明
====================================

【游戏简介】
操控小球跳上同色轨道，穿越星际！
10关闯关模式 + 无尽模式，多种道具和特殊地形等你挑战。

【如何运行】

Windows 用户：
  双击 "start.bat" 即可一键启动

Mac 用户：
  双击 "start.command" 即可一键启动

手动启动：
  1. 确保电脑已安装 Python 3
  2. 打开终端/命令提示符，进入此文件夹
  3. 运行：python _serve.py
  4. 打开浏览器访问：http://localhost:9090

【系统要求】
- 任意现代浏览器（Chrome / Edge / Firefox 推荐）
- Python 3（用于本地服务器）
- 不需要联网！所有资源都已包含在内

【操作说明】
- 鼠标移动：控制小球左右方向
- 点击/触摸：开始游戏、选择路径
- F 键：激活飞行器道具（若已拥有）

【文件说明】
- threejs-sphere.html → 游戏主页面
- game.js → 游戏逻辑
- styles.css → 样式文件
- three.min.js → Three.js 3D引擎
- GLTFLoader_local.js → 模型加载器
- assets/ → 3D模型等资源

【常见问题】
Q: 双击 HTML 文件打开后看不到模型？
A: 必须通过本地服务器运行（start.bat），不能直接双击 HTML！

Q: 端口 9090 被占用？
A: 编辑 _serve.py，修改第 3 行的 PORT = 9090 为其他端口号

Q: 打开浏览器显示空白？
A: 确认 URL 是 http://localhost:9090（注意是 http 不是 https）

祝你玩得开心！🚀
