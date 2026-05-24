import http.server, socketserver, os, threading

os.chdir('c:/Users/lamb/WorkBuddy/20260412222433')
handler = http.server.SimpleHTTPRequestHandler

class MyServer(socketserver.TCPServer):
    allow_reuse_address = True

try:
    with MyServer(('0.0.0.0', 9090), handler) as httpd:
        print('9090 SERVER STARTED')
        httpd.serve_forever()
except Exception as e:
    print('ERROR:', e)
