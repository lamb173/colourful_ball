import http.server
import socketserver
import os
import sys
import socket

PORT = 8080
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))
        sys.stderr.flush()

class ThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True
    # Windows 上双栈支持需要特殊处理
    def server_bind(self):
        # 尝试 IPv6 双栈（IPv4 + IPv6）
        try:
            self.socket = socket.socket(socket.AF_INET6, self.socket_type)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            # Windows 不支持 IPV6_V6ONLY=0，所以需要分别绑定
            self.socket.bind(("::1", self.server_address[1]))
        except (OSError, socket.error):
            # IPv6 失败，回退到 IPv4
            self.socket = socket.socket(socket.AF_INET, self.socket_type)
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.socket.bind(("127.0.0.1", self.server_address[1]))
        self.server_address = self.socket.getsockname()

try:
    with ThreadedServer(("", PORT), Handler) as httpd:
        addr = httpd.socket.getsockname()
        sys.stderr.write(f"[SERVER] Threaded HTTP server on {addr}\n")
        sys.stderr.flush()
        httpd.serve_forever()
except KeyboardInterrupt:
    sys.stderr.write("[SERVER] Shutting down\n")
except Exception as e:
    sys.stderr.write(f"[SERVER] FATAL: {e}\n")
    sys.exit(1)
