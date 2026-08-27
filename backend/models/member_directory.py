"""
Member directory -- the profile fields the ledger cannot supply.

The financial picture (savings, loans, net position) is derived from the
hash-chained ledger and lives in backend/models/member.py. But a member is
also a person with a name, a phone number and a village, and the Add Member
form collects all three. `users` already stores the name; this module adds
the remaining two plus a joined date.

The columns are added with ALTER TABLE ... ADD COLUMN, which is additive and
non-destructive: existing rows keep their data and simply carry NULL in the
new columns. No table is dropped and no column is renamed.
"""

import sqlite3
import time
from typing import Optional

from backend.db_path import DB_PATH
from backend.ledger import get_all_entries

PROFILE_COLUMNS = {
    "phone": "TEXT",
    "village": "TEXT",
    "joined_at": "TEXT",
}


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def ensure_profile_columns():
    """Add the profile columns if they are not already present. Idempotent."""
    conn = get_connection()
    existing = {row["name"] for row in conn.execute("PRAGMA table_info(users)")}
    for column, sql_type in PROFILE_COLUMNS.items():
        if column not in existing:
            conn.execute(f"ALTER TABLE users ADD COLUMN {column} {sql_type}")
    conn.commit()
    conn.close()


def _ledger_totals():
    """Per-member savings and outstanding loan, straight from the ledger."""
    totals = {}
    for entry in get_all_entries():
        member = entry["member_id"]
        bucket = totals.setdefault(member, {"savings": 0.0, "borrowed": 0.0, "repaid": 0.0})
        if entry["entry_type"] == "savings_deposit":
            bucket["savings"] += entry["amount"]
        elif entry["entry_type"] == "loan_disbursed":
            bucket["borrowed"] += entry["amount"]
        elif entry["entry_type"] == "loan_repayment":
            bucket["repaid"] += entry["amount"]
    return totals


def _repayment_status(outstanding: float, borrowed: float, repaid: float) -> str:
    """A plain description of where the member stands on repayment."""
    if borrowed <= 0:
        return "No Active Loan"
    if outstanding <= 0:
        return "Fully Repaid"
    return "On Track" if repaid > 0 else "Repayment Due"


def list_members():
    """Every SHG member, with their real ledger-derived position.

    Scoped to role = 'member'. Treasurer and admin accounts are staff logins,
    not members of the group -- counting them would inflate the member count
    on every screen that shows it.
    """
    conn = get_connection()
    rows = conn.execute(
        "SELECT member_id, name, role, phone, village, joined_at "
        "FROM users WHERE role = 'member' ORDER BY member_id"
    ).fetchall()
    conn.close()

    totals = _ledger_totals()
    members = []
    for row in rows:
        t = totals.get(row["member_id"], {"savings": 0.0, "borrowed": 0.0, "repaid": 0.0})
        outstanding = max(t["borrowed"] - t["repaid"], 0.0)
        members.append({
            "member_id": row["member_id"],
            "name": row["name"],
            "role": row["role"],
            "phone": row["phone"],
            "village": row["village"],
            "joined_at": row["joined_at"],
            "savings": round(t["savings"], 2),
            "outstanding_loan": round(outstanding, 2),
            "repayment_status": _repayment_status(outstanding, t["borrowed"], t["repaid"]),
        })
    return members


def get_member(member_id: str) -> Optional[dict]:
    """One member, or None when the id is not registered."""
    for member in list_members():
        if member["member_id"] == member_id:
            return member
    return None


def next_member_id() -> str:
    """The next MEM-nnn id, continuing from the highest one already stored."""
    conn = get_connection()
    rows = conn.execute("SELECT member_id FROM users WHERE member_id LIKE 'MEM-%'").fetchall()
    conn.close()

    highest = 0
    for row in rows:
        suffix = row["member_id"].split("-", 1)[-1]
        if suffix.isdigit():
            highest = max(highest, int(suffix))
    return f"MEM-{highest + 1:03d}"


def set_profile(member_id: str, phone: str = None, village: str = None, joined_at: str = None):
    """Write the profile fields for a member that already exists in `users`."""
    conn = get_connection()
    conn.execute(
        "UPDATE users SET phone = ?, village = ?, joined_at = ? WHERE member_id = ?",
        (phone, village, joined_at or time.strftime("%Y-%m-%d"), member_id),
    )
    conn.commit()
    conn.close()
