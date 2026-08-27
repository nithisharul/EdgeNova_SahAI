"""
Tamper-evident, hash-chained ledger for SHG savings/loan transactions.

The transaction data model and SHA-256 hashing live in
backend/models/transaction.py. This file handles the database side:
writing entries, walking the chain, and verifying integrity.
"""

import os
import sys
import sqlite3
import time

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.models.transaction import LedgerEntry, compute_hash, GENESIS_HASH

DB_PATH = "backend/database.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS ledger (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            member_id TEXT NOT NULL,
            entry_type TEXT NOT NULL,
            amount REAL NOT NULL,
            timestamp REAL NOT NULL,
            prev_hash TEXT NOT NULL,
            entry_hash TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def get_last_hash(conn) -> str:
    row = conn.execute(
        "SELECT entry_hash FROM ledger ORDER BY id DESC LIMIT 1"
    ).fetchone()
    return row["entry_hash"] if row else GENESIS_HASH


def add_entry(member_id: str, entry_type: str, amount: float) -> LedgerEntry:
    conn = get_connection()
    prev_hash = get_last_hash(conn)
    timestamp = time.time()
    entry_hash = compute_hash(member_id, entry_type, amount, timestamp, prev_hash)

    cur = conn.execute(
        """INSERT INTO ledger (member_id, entry_type, amount, timestamp, prev_hash, entry_hash)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (member_id, entry_type, amount, timestamp, prev_hash, entry_hash),
    )
    conn.commit()
    entry_id = cur.lastrowid
    conn.close()

    return LedgerEntry(entry_id, member_id, entry_type, amount, timestamp, prev_hash, entry_hash)


def get_all_entries():
    conn = get_connection()
    rows = conn.execute("SELECT * FROM ledger ORDER BY id ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def verify_chain():
    """
    Walk every entry, recompute its hash from scratch, and compare it to
    what's stored. Returns (is_valid, first_broken_entry_id_or_None).
    """
    entries = get_all_entries()
    expected_prev = GENESIS_HASH

    for entry in entries:
        recomputed = compute_hash(
            entry["member_id"], entry["entry_type"], entry["amount"],
            entry["timestamp"], entry["prev_hash"],
        )
        if entry["prev_hash"] != expected_prev or recomputed != entry["entry_hash"]:
            return False, entry["id"]
        expected_prev = entry["entry_hash"]

    return True, None


def get_member_balance(member_id: str) -> float:
    entries = [e for e in get_all_entries() if e["member_id"] == member_id]
    balance = 0.0
    for e in entries:
        if e["entry_type"] == "savings_deposit":
            balance += e["amount"]
        elif e["entry_type"] == "loan_disbursed":
            balance -= e["amount"]
        elif e["entry_type"] == "loan_repayment":
            balance += e["amount"]
    return balance


if __name__ == "__main__":
    # quick manual smoke test
    init_db()
    add_entry("member_001", "savings_deposit", 500)
    add_entry("member_001", "loan_disbursed", 2000)
    add_entry("member_001", "loan_repayment", 300)

    valid, broken_id = verify_chain()
    print("Chain valid?", valid)
    print("Member balance:", get_member_balance("member_001"))
