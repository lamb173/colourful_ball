#!/bin/bash
echo "========================================"
echo "   弹跳小球 · 星际穿越"
echo "   正在启动本地服务器..."
echo "========================================"
echo ""

# 检查 Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[错误] 未找到 Python！请先安装 Python 3。"
    echo "下载地址：https://www.python.org/downloads/"
    read -p "按回车键退出..."
    exit 1
fi

# 获取脚本所在目录
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "服务器启动中，请稍候..."
echo "浏览器将自动打开 http://localhost:9090"
echo "按 Ctrl+C 可停止服务器"
echo ""

# 打开浏览器
open http://localhost:9090 2>/dev/null &

# 启动 Python 服务器
python3 _serve.py 2>/dev/null || python _serve.py

read -p "按回车键退出..."
