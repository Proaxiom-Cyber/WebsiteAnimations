import http.server
import socketserver

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def send_response_only(self, code, message=None):
        super().send_response_only(code, message)
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')

port = 8000
handler = NoCacheHTTPRequestHandler
httpd = socketserver.TCPServer(("", port), handler)
print(f"Serving at port {port} with caching disabled")
httpd.serve_forever()