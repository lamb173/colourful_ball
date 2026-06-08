@echo off
chcp 65001 >nul
title 弹跳小球 · 星际穿越

echo ========================================
echo    弹跳小球 · 星际穿越
echo    正在启动本地服务器...
echo ========================================
echo.

:: 检查 Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python！请先安装 Python 3。
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)

echo 服务器启动中，请稍候...
echo 浏览器将自动打开 http://localhost:9090
echo 按 Ctrl+C 可停止服务器
echo.

:: 先尝试打开浏览器
start "" http://localhost:9090

:: 启动 Python 服务器
python _serve.py

pause
