#!/usr/bin/env python3
"""Serve the site locally for testing: python3 tools/serve.py [port]

Opens at http://localhost:4173 by default.
"""
import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
    print(f"Nano Motion demo store running at http://localhost:{PORT}")
    server.serve_forever()
