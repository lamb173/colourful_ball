#!/usr/bin/env python3
"""本地开发 HTTP 文件服务器（双栈 IPv4+IPv6）"""
import http.server
import socketserver
import socket
import sys
import os

PORT = 9090

class DualStackServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    """同时支持 IPv4 和 IPv6，解决 localhost 解析到 ::1 时连不上的问题"""
    address_family = socket.AF_INET6
    allow_reuse_address = True
    daemon_threads = True

    def server_bind(self):
        # 允许 IPv4 映射到 IPv6，这样 ::ffff:127.0.0.1 也能连
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()

Handler = http.server.SimpleHTTPRequestHandler

if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    try:
        with DualStackServer(("", PORT), Handler) as httpd:
            print(f"Serving on http://localhost:{PORT}  (IPv4+IPv6 dual-stack)")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"Server error: {e}", file=sys.stderr)
        sys.exit(1)
