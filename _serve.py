#!/usr/bin/env python3
"""本地开发 HTTP 文件服务器（IPv4+IPv6 双栈）"""
import http.server
import socketserver
import socket
import sys
import os

PORT = 9090
Handler = http.server.SimpleHTTPRequestHandler

class DualStackServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    address_family = socket.AF_INET6
    allow_reuse_address = True

    def server_bind(self):
        # 关键：绑定 IPv6 后允许 IPv4 映射，localhost(::1) 和 127.0.0.1 都能连
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with DualStackServer(("", PORT), Handler) as httpd:
        print(f"[OK] Serving http://localhost:{PORT}  (IPv4+IPv6)")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == "__main__":
    main()
