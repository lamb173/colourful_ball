@echo off
REM =============================================
REM  弹跳小球 · 本地服务器启动脚本
REM  双击运行，关闭窗口即停止服务器
REM =============================================

cd /d "%~dp0"

:loop
echo =============================================
echo [%date% %time%] 启动服务器...
echo =============================================

REM 清理 9090 端口（直接杀 python 进程）
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 >nul

REM 启动服务器（使用完整 python 路径）
"D:\ANACONDA\python.exe" _serve.py
if errorlevel 1 (
    echo.
    echo [错误] 服务器启动失败！
    echo 请检查 _serve.py 是否存在
    echo.
    pause
)

echo.
echo [!] 服务器已停止（退出码 %errorlevel%）
echo 3 秒后自动重启...
echo.
timeout /t 3 >nul
goto loop
