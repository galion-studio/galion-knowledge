#!/usr/bin/env python3
"""Serve the built V2 site on 127.0.0.1:3015.

Prefer the machine's existing static file server, pointed at v2/_site/.
This script is only for a host that does not have one. It uses the
Python standard library and nothing else.
"""

import http.server
import os
import socketserver

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_site")
HOST = "127.0.0.1"
PORT = 3015


def main() -> None:
    if not os.path.isdir(ROOT):
        raise SystemExit("v2/_site is missing. From v2/, run: npm run build")
    os.chdir(ROOT)
    server = socketserver.TCPServer((HOST, PORT), http.server.SimpleHTTPRequestHandler)
    print(f"Serving {ROOT} at http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
