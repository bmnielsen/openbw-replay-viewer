#!/usr/bin/env python3

import argparse
import atexit
import json
import os
import signal
import sys
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--root", required=True)
    parser.add_argument("--state-dir", required=True)
    return parser.parse_args()


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def main():
    args = parse_args()
    root = Path(args.root).resolve()
    state_dir = Path(args.state_dir).resolve()
    pid_file = state_dir / "http-server.pid.json"
    access_log = state_dir / "http-server.log"

    if not root.exists():
        raise SystemExit(f"Static root does not exist: {root}")

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *handler_args, **handler_kwargs):
            super().__init__(*handler_args, directory=str(root), **handler_kwargs)

        def log_message(self, fmt, *log_args):
            timestamp = datetime.now(timezone.utc).isoformat()
            state_dir.mkdir(parents=True, exist_ok=True)
            with access_log.open("a", encoding="utf-8") as f:
                f.write(
                    f"{timestamp} {self.address_string()} "
                    f"{fmt % log_args}\n"
                )

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.daemon_threads = True

    payload = {
        "pid": os.getpid(),
        "host": args.host,
        "port": args.port,
        "root": str(root),
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    write_json(pid_file, payload)

    def cleanup():
        try:
            if pid_file.exists():
                current = json.loads(pid_file.read_text(encoding="utf-8"))
                if current.get("pid") == os.getpid():
                    pid_file.unlink()
        except Exception:
            pass

    def handle_signal(signum, _frame):
        cleanup()
        server.shutdown()
        raise SystemExit(0)

    atexit.register(cleanup)
    signal.signal(signal.SIGTERM, handle_signal)
    if hasattr(signal, "SIGINT"):
        signal.signal(signal.SIGINT, handle_signal)

    try:
        server.serve_forever()
    finally:
        cleanup()


if __name__ == "__main__":
    main()
