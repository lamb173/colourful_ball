import http.server
import socketserver
import os
import sys

PORT = 9090
os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))
        sys.stderr.flush()

class ThreadedServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True

try:
    with ThreadedServer(("", PORT), Handler) as httpd:
        sys.stderr.write(f"[SERVER] Threaded HTTP server on port {PORT}\n")
        sys.stderr.flush()
        httpd.serve_forever()
except KeyboardInterrupt:
    sys.stderr.write("[SERVER] Shutting down\n")
except Exception as e:
    sys.stderr.write(f"[SERVER] FATAL: {e}\n")
    sys.exit(1)
