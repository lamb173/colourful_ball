#!/usr/bin/env python3
"""本地开发 HTTP 文件服务器（稳健版）"""
import http.server
import socketserver
import sys

PORT = 9090

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    allow_reuse_address = True
    daemon_threads = True

Handler = http.server.SimpleHTTPRequestHandler

if __name__ == '__main__':
    import os
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    try:
        with ThreadedHTTPServer(("0.0.0.0", PORT), Handler) as httpd:
            print(f"Serving on http://127.0.0.1:{PORT}")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"Server error: {e}", file=sys.stderr)
        sys.exit(1)
