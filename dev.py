"""
Run SahAI -- backend and frontend together.

    python dev.py                 both services
    python dev.py --backend       backend only
    python dev.py --frontend      frontend only
    python dev.py --web           open Expo straight into the browser
    python dev.py --host 0.0.0.0  bind for a phone on the same Wi-Fi

WHY THIS EXISTS
---------------
The two halves are one product but two processes, and starting them by hand in
two terminals every time is where "the frontend and backend feel like separate
apps" begins. This does NOT merge the code: uvicorn still owns Python and Expo
still owns JavaScript, each with its own hot reload. It only removes the
ceremony.

WHAT IT DELIBERATELY DOES NOT DO
--------------------------------
It does not seed the database. An empty database stays empty until someone runs
scripts/seed_demo.py on purpose -- the app must never invent data for itself.

RELOADING
---------
Backend runs with --reload, so editing a .py file restarts the API. Frontend
runs the project's own `npm start`, so editing a .jsx file Fast Refreshes.
Neither needs this script restarted.
"""

import argparse
import atexit
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
BACKEND_PORT = 5000

# Windows needs shell=True to resolve npm.cmd; POSIX does not and is safer without.
IS_WINDOWS = os.name == "nt"


class Service:
    """One child process, its label, and the thread pumping its output."""

    def __init__(self, name, command, cwd, env=None):
        self.name = name
        self.command = command
        self.cwd = cwd
        self.env = env
        self.process = None
        self.thread = None

    def start(self):
        self.process = subprocess.Popen(
            self.command,
            cwd=str(self.cwd),
            env=self.env or os.environ.copy(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            shell=IS_WINDOWS,
            # A new process group lets us signal the whole tree: Expo and uvicorn
            # both spawn children, and killing only the parent orphans them.
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if IS_WINDOWS else 0,
            start_new_session=not IS_WINDOWS,
        )
        self.thread = threading.Thread(target=self._pump, daemon=True)
        self.thread.start()
        return self

    def _pump(self):
        """Prefix every line so two interleaved logs stay readable."""
        try:
            for line in self.process.stdout:
                sys.stdout.write(f"[{self.name}] {line}")
                sys.stdout.flush()
        except (ValueError, OSError):
            # Pipe closed during shutdown. Expected.
            pass

    def stop(self):
        if not self.process or self.process.poll() is not None:
            return
        try:
            if IS_WINDOWS:
                # taskkill /T reaches the children; Popen.terminate does not.
                subprocess.run(
                    ["taskkill", "/PID", str(self.process.pid), "/T", "/F"],
                    capture_output=True,
                    check=False,
                )
            else:
                os.killpg(os.getpgid(self.process.pid), signal.SIGTERM)
        except (ProcessLookupError, PermissionError, OSError):
            pass

        try:
            self.process.wait(timeout=8)
        except subprocess.TimeoutExpired:
            try:
                self.process.kill()
            except OSError:
                pass


#: Every child we start, so cleanup can reach them from a signal handler.
RUNNING = []
_shutting_down = threading.Event()


def shutdown(reason=""):
    """Stop every child. Safe to call twice, and from a signal handler.

    This must NOT rely on the interpreter unwinding to a `finally` block. On
    Windows a console control event terminates the process with
    STATUS_CONTROL_C_EXIT before `except KeyboardInterrupt` runs, which
    orphaned uvicorn and Expo -- their ports stayed bound after dev.py was
    gone. Doing the work in the handler itself is what makes Ctrl+C reliable.
    """
    if _shutting_down.is_set():
        return
    _shutting_down.set()

    if reason:
        print(f"\n[dev] {reason}")
    for service in reversed(RUNNING):
        service.stop()
    print("[dev] Stopped.")


def install_signal_handlers():
    def handler(signum, _frame):
        shutdown("Shutting down...")
        # Exit from the handler; there is nothing left to unwind to.
        os._exit(0)

    signal.signal(signal.SIGINT, handler)
    if IS_WINDOWS and hasattr(signal, "SIGBREAK"):
        # Ctrl+Break, and what a parent process sends as CTRL_BREAK_EVENT.
        signal.signal(signal.SIGBREAK, handler)
    if not IS_WINDOWS:
        signal.signal(signal.SIGTERM, handler)

    # Backstop for any exit path that does unwind normally.
    atexit.register(shutdown)


def preflight():
    """Fail with a useful sentence rather than a stack trace."""
    problems = []

    if not FRONTEND.exists():
        problems.append(f"No frontend directory at {FRONTEND}")
    elif not (FRONTEND / "node_modules").exists():
        problems.append("Frontend dependencies missing. Run: cd frontend && npm install")

    if not (ROOT / "backend" / "app.py").exists():
        problems.append(f"No backend/app.py under {ROOT}")

    if shutil.which("npm") is None:
        problems.append("npm is not on PATH. Install Node.js.")

    try:
        import fastapi  # noqa: F401
        import uvicorn  # noqa: F401
    except ImportError:
        problems.append("Python dependencies missing. Run: pip install -r requirements.txt")

    return problems


def build_backend(host):
    return Service(
        "backend",
        [
            sys.executable,
            "-m",
            "uvicorn",
            "backend.app:app",
            "--reload",
            "--host",
            host,
            "--port",
            str(BACKEND_PORT),
        ],
        cwd=ROOT,
    )


def build_frontend(open_web):
    # Use the project's own script rather than inventing a command, so this
    # keeps working if package.json changes.
    command = ["npm", "run", "web"] if open_web else ["npm", "start"]
    return Service("frontend", command, cwd=FRONTEND)


def banner(host, backend_only, frontend_only):
    line = "=" * 52
    print(f"\n{line}")
    print("              SahAI Development")
    print(line)
    if not frontend_only:
        print(f"  Backend    http://localhost:{BACKEND_PORT}")
        print(f"  API docs   http://localhost:{BACKEND_PORT}/docs")
    if not backend_only:
        print("  Frontend   Expo dev server (press w for web)")
    if host != "127.0.0.1" and not frontend_only:
        print()
        print("  Phone on the same Wi-Fi: set the API URL before starting,")
        print("  because 'localhost' on a phone means the phone itself:")
        print(f"    EXPO_PUBLIC_API_BASE_URL=http://<your-lan-ip>:{BACKEND_PORT}")
    print(line)
    print("  Ctrl+C stops both.")
    print(f"{line}\n")


def main():
    parser = argparse.ArgumentParser(description="Run SahAI backend and frontend together.")
    parser.add_argument("--backend", action="store_true", help="backend only")
    parser.add_argument("--frontend", action="store_true", help="frontend only")
    parser.add_argument("--web", action="store_true", help="open Expo directly in the browser")
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="backend bind address; use 0.0.0.0 to reach it from a phone",
    )
    args = parser.parse_args()

    problems = preflight()
    if problems:
        print("Cannot start SahAI:\n")
        for problem in problems:
            print(f"  - {problem}")
        return 1

    banner(args.host, args.backend, args.frontend)
    install_signal_handlers()

    try:
        if not args.frontend:
            RUNNING.append(build_backend(args.host).start())
            # Let uvicorn bind and load the models before Expo floods the log.
            time.sleep(1.5)
        if not args.backend:
            RUNNING.append(build_frontend(args.web).start())

        # Wait on both. If either dies on its own, take the other down too --
        # a running frontend against a dead API is a confusing thing to leave.
        while True:
            for service in RUNNING:
                code = service.process.poll()
                if code is not None:
                    shutdown(f"{service.name} exited with code {code}. Stopping the rest.")
                    return code or 0
            time.sleep(0.4)

    except KeyboardInterrupt:
        # Reached on POSIX, and on Windows when the interpreter gets there
        # first. The signal handler covers the case where it does not.
        shutdown("Shutting down...")
        return 0
    finally:
        shutdown()


if __name__ == "__main__":
    sys.exit(main())
