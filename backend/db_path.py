"""
Database configuration for local development and shared deployments.

The app historically used SQLite only. To support a live multi-user setup without
breaking local development, we now prefer a PostgreSQL connection string via the
standard DATABASE_URL environment variable. If it is not set, we fall back to the
existing SQLite file-based database.

This preserves the SSO / Keycloak flow because it does not touch authentication
logic. Only the persistence layer changes.
"""

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BACKEND_DIR / "database.db"

DATABASE_URL = os.getenv("DATABASE_URL", "").strip() or None
DB_PATH = str(Path(os.getenv("SAHAI_DB_PATH", str(DEFAULT_DB_PATH))).resolve())


def is_postgres() -> bool:
    return bool(DATABASE_URL)
