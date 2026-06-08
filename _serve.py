#!/usr/bin/env python3
"""本地开发 HTTP 文件服务器"""
import http.server
import socketserver
import sys
import os

PORT = 9090
Handler = http.server.SimpleHTTPRequestHandler

# 允许跨域
Handler.extensions_map.update({
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
})

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"[OK] Serving http://localhost:{PORT}")
        print("按 Ctrl+C 停止服务器")
        sys.stdout.flush()
        httpd.serve_forever()

if __name__ == "__main__":
    main()
