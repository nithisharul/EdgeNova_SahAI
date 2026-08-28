"""
One stable location for the SQLite database.

Both backend/ledger.py and backend/models/user.py previously hard-coded the
relative string "backend/database.db". A relative path is resolved against the
process's current working directory, not against the code, so starting uvicorn
from anywhere other than the repository root either failed outright or -- worse,
when a `backend/` directory happened to exist -- silently created a SECOND,
empty database and served every finance screen from it. The ledger looked
legitimately empty rather than misconfigured.

Anchoring the path to this file removes the ambiguity: the database is always
the one sitting next to the code, whatever directory the server was launched
from.

SAHAI_DB_PATH overrides it, which is what tests and any future deployment
should use.
"""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent

DEFAULT_DB_PATH = BACKEND_DIR / "database.db"

DB_PATH = str(Path(os.getenv("SAHAI_DB_PATH", str(DEFAULT_DB_PATH))).resolve())
