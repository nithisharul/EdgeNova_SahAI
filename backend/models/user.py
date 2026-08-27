"""
User storage -- member_id, name, hashed password (PIN), and role
("member" or "treasurer"). Lives in the same SQLite DB as the ledger.
"""

import sqlite3
from dataclasses import dataclass
from typing import Optional

from backend.auth import hash_password, verify_password

# Absolute, resolved from backend/ -- see backend/db_path.py for why.
from backend.db_path import DB_PATH


@dataclass
class User:
    member_id: str
    name: str
    role: str


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_users_db():
    conn = get_connection()
    existing_schema = conn.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    ).fetchone()
    if existing_schema and "'admin'" not in existing_schema["sql"]:
        conn.execute("ALTER TABLE users RENAME TO users_legacy")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            member_id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('admin', 'member', 'treasurer'))
        )
    """)
    if existing_schema and "'admin'" not in existing_schema["sql"]:
        conn.execute("""
            INSERT INTO users (member_id, name, password_hash, role)
            SELECT member_id, name, password_hash, role FROM users_legacy
        """)
        conn.execute("DROP TABLE users_legacy")
    conn.commit()
    conn.close()


def create_user(member_id: str, name: str, password: str, role: str) -> User:
    conn = get_connection()
    existing = conn.execute("SELECT member_id FROM users WHERE member_id = ?", (member_id,)).fetchone()
    if existing:
        conn.close()
        raise ValueError(f"member_id '{member_id}' is already registered.")

    conn.execute(
        "INSERT INTO users (member_id, name, password_hash, role) VALUES (?, ?, ?, ?)",
        (member_id, name, hash_password(password), role),
    )
    conn.commit()
    conn.close()
    return User(member_id, name, role)


def authenticate(member_id: str, password: str) -> Optional[User]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM users WHERE member_id = ?", (member_id,)).fetchone()
    conn.close()

    if row is None or not verify_password(password, row["password_hash"]):
        return None
    return User(row["member_id"], row["name"], row["role"])