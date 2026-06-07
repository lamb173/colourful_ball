@echo off
REM 最稳定的 HTTP 文件服务器启动脚本（自动重启）
:loop
echo =
echo Restarting server at %time% ...
echo =

REM 杀掉所有占 9090 端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :9090 ^| findstr LISTENING') do (
  taskkill //F //PID %%a >nul 2>&1
)

REM 等待端口释放
timeout /t 2 >nul

REM 启动服务器（IPv4 + IPv6 双栈）
python -c "import http.server, socketserver, socket; \
s = socketserver.TCPServer; \
s.allow_reuse_address = True; \
class S(socketserver.ThreadingMixIn, s): pass; \
try: \
  with S(('', 9090), http.server.SimpleHTTPRequestHandler) as srv: \
    print('Serving http://localhost:9090'); \
    srv.serve_forever() \
except Exception as e: \
  print('Server error:', e); \
  exit(1)"

echo Server stopped with exit code %errorlevel%
echo Restarting in 3 seconds...
timeout /t 3 >nul
goto loop
