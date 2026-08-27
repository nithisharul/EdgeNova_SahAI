"""
Where the SQLite database lives.

Resolved from this file's location, not the current working directory. The
previous relative "backend/database.db" only worked when uvicorn happened to
be started from the repository root -- from anywhere else SQLite silently
created a brand new, empty database and every screen went blank while the real
data sat untouched a few directories away.

Set SAHAI_DB_PATH to point at a different file (a test database, or a copy
shared by a teammate) without editing code.
"""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BACKEND_DIR / "database.db"

DB_PATH = str(Path(os.getenv("SAHAI_DB_PATH", str(DEFAULT_DB_PATH))).resolve())
