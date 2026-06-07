@echo off
REM =============================================
REM  弹跳小球 · 本地服务器启动脚本
REM  双击运行，关闭窗口即停止服务器
REM =============================================

cd /d "%~dp0"

:loop
echo =============================================
echo  [%date% %time%] 启动服务器...
echo =============================================

REM 先清理占用 9090 端口的残留进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":9090" ^| findstr "LISTENING"') do (
    echo 清理残留进程 PID=%%a ...
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 >nul

python _serve.py

echo.
echo [!] 服务器已停止（退出码 %errorlevel%）
echo 3 秒后自动重启...
echo.
timeout /t 3 >nul
goto loop
