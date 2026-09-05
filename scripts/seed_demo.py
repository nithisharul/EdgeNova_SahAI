"""
sahAI - Demo data seeder
=========================

Fills an empty database with a treasurer, four members, and enough backdated
ledger history that the loan risk model has something real to work with.

    python scripts/seed_demo.py            # add to whatever is already there
    python scripts/seed_demo.py --reset    # wipe the DB first (asks first)

WHY THIS EXISTS
---------------
compute_savings_consistency() needs at least 3 deposits before it will report
anything other than a neutral 0.5. On an empty database every member scores
identically and the loan demo shows nothing. More importantly, deposit
REGULARITY is measured across time - entries added by hand through /docs land
seconds apart, which produces a meaningless consistency figure. This script
backdates timestamps directly through ledger.add_entry(), which the HTTP API
deliberately cannot do.

The four members have deliberately different savings patterns so that the same
loan request returns visibly different risk scores. That contrast is the
product's whole argument: the score is hers, not generic.

WHAT IT DOES NOT DO
-------------------
It writes deposits straight to the ledger rather than through POST /ledger/add,
because deposits are treasurer-only now and the script has no token. That is
the security rule working as intended, not a workaround.

DO NOT COMMIT THE DATABASE THIS CREATES. The script is code and belongs in
version control; backend/database.db holds password hashes and does not.
The passwords below are obviously fake demo credentials - never put a real
treasurer password in here.
"""

import argparse
import os
import sqlite3
import sys
import time

# Make `backend` importable when run as `python scripts/seed_demo.py`
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db_path import DATABASE_URL, DB_PATH, is_postgres
from backend.ledger import add_entry, get_all_entries, init_db, verify_chain
from backend.models.user import authenticate, create_user, init_users_db

DAY = 86400.0
MONTH = DAY * 30

# Demo credentials. Fake on purpose - see module docstring.
TREASURER = {"member_id": "nithish", "name": "Nithish", "password": "demo1234", "role": "treasurer"}

MEMBERS = [
    {
        "member_id": "lakshmi", "name": "Lakshmi", "password": "demo1234",
        "profile": "Disciplined saver - Rs.500 every month for 8 months.",
        "deposits": [(500, 8 - i) for i in range(8)],   # (amount, months_ago)
        "loans": [],
    },
    {
        "member_id": "priya", "name": "Priya", "password": "demo1234",
        "profile": "Irregular - lump sums at unpredictable intervals.",
        "deposits": [(200, 9), (3000, 7), (150, 6), (1800, 2), (300, 1)],
        "loans": [],
    },
    {
        "member_id": "meena", "name": "Meena", "password": "demo1234",
        "profile": "Steady saver with an active loan she is repaying on time.",
        "deposits": [(400, 7), (400, 6), (400, 5), (450, 4), (400, 3), (400, 2), (400, 1)],
        "loans": [("loan_disbursed", 6000, 4), ("loan_repayment", 1000, 3),
                  ("loan_repayment", 1000, 2), ("loan_repayment", 1000, 1)],
    },
    {
        "member_id": "kavitha", "name": "Kavitha", "password": "demo1234",
        "profile": "New member - only one deposit, too little history to score.",
        "deposits": [(500, 1)],
        "loans": [],
    },
]


def ensure_user(spec: dict) -> str:
    """Create the account, or report it already exists. Idempotent."""
    try:
        create_user(spec["member_id"], spec["name"], spec["password"], spec["role"])
        return "created"
    except ValueError:
        # Already registered. Confirm the demo password still works, otherwise
        # whoever runs this will hit a confusing 401 later.
        if authenticate(spec["member_id"], spec["password"]) is None:
            return "EXISTS (different password!)"
        return "exists"


def reset_database():
    if is_postgres():
        print("[i] PostgreSQL database configured via DATABASE_URL; reset is handled by dropping tables manually if needed.")
        return
    if not os.path.exists(DB_PATH):
        print(f"[i] No database at {DB_PATH} - nothing to reset.")
        return
    answer = input(f"Delete {DB_PATH} and all its data? [y/N] ").strip().lower()
    if answer != "y":
        sys.exit("Aborted.")
    os.remove(DB_PATH)
    print(f"[+] Deleted {DB_PATH}")


def backdate_last_entry(months_ago: float, jitter_days: float = 0.0):
    """Rewrite the most recent entry's timestamp and re-hash it.

    add_entry() stamps time.time(). Deposit regularity is measured across
    months, so the demo needs history rather than a burst of rows written
    seconds apart. We update the timestamp and recompute the hash chain from
    that entry onward, which keeps verify_chain() valid - the point is to
    create realistic history, not to demonstrate tampering.
    """
    from backend.models.transaction import compute_hash

    if is_postgres():
        import psycopg
        conn = psycopg.connect(DATABASE_URL)
        row = conn.execute("SELECT * FROM ledger ORDER BY id DESC LIMIT 1").fetchone()
        if row is None:
            conn.close()
            return
        new_ts = time.time() - (months_ago * MONTH) + (jitter_days * DAY)
        conn.execute("UPDATE ledger SET timestamp = %s WHERE id = %s", (new_ts, row[0]))
        conn.commit()
        conn.close()
        rehash_chain()
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM ledger ORDER BY id DESC LIMIT 1").fetchone()
    if row is None:
        conn.close()
        return

    new_ts = time.time() - (months_ago * MONTH) + (jitter_days * DAY)
    conn.execute("UPDATE ledger SET timestamp = ? WHERE id = ?", (new_ts, row["id"]))
    conn.commit()
    conn.close()
    rehash_chain()


def rehash_chain():
    """Recompute every hash in order so the chain stays internally consistent."""
    from backend.models.transaction import GENESIS_HASH, compute_hash

    if is_postgres():
        import psycopg
        conn = psycopg.connect(DATABASE_URL)
        rows = conn.execute("SELECT * FROM ledger ORDER BY id ASC").fetchall()
        prev = GENESIS_HASH
        for r in rows:
            entry_hash = compute_hash(
                r[1], r[2], r[3], r[4], prev
            )
            conn.execute(
                "UPDATE ledger SET prev_hash = %s, entry_hash = %s WHERE id = %s",
                (prev, entry_hash, r[0]),
            )
            prev = entry_hash
        conn.commit()
        conn.close()
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute("SELECT * FROM ledger ORDER BY id ASC").fetchall()

    prev = GENESIS_HASH
    for r in rows:
        entry_hash = compute_hash(
            r["member_id"], r["entry_type"], r["amount"], r["timestamp"], prev
        )
        conn.execute(
            "UPDATE ledger SET prev_hash = ?, entry_hash = ? WHERE id = ?",
            (prev, entry_hash, r["id"]),
        )
        prev = entry_hash
    conn.commit()
    conn.close()


def seed():
    init_db()
    init_users_db()

    print("\n--- accounts ---")
    print(f"  treasurer {TREASURER['member_id']:<10} {ensure_user(TREASURER)}")
    for m in MEMBERS:
        print(f"  member    {m['member_id']:<10} {ensure_user({**m, 'role': 'member'})}")

    print("\n--- ledger history ---")
    for m in MEMBERS:
        events = [("savings_deposit", amt, ago) for amt, ago in m["deposits"]]
        events += [(kind, amt, ago) for kind, amt, ago in m["loans"]]
        events.sort(key=lambda e: -e[2])          # oldest first

        for kind, amount, months_ago in events:
            add_entry(m["member_id"], kind, float(amount))
            backdate_last_entry(months_ago)

        print(f"  {m['member_id']:<10} {len(events):>2} entries  |  {m['profile']}")

    valid, broken = verify_chain()
    print(f"\n[i] Ledger entries: {len(get_all_entries())}")
    print(f"[i] Chain valid: {valid}" + (f" (broken at {broken})" if broken else ""))

    print("\n--- expected savings_consistency ---")
    try:
        from backend.routes.loan_routes import compute_savings_consistency
        for m in MEMBERS:
            score, detail = compute_savings_consistency(m["member_id"])
            note = "estimated - too little history" if detail.get("is_estimated") else ""
            print(f"  {m['member_id']:<10} {score:.3f}  ({detail['deposit_count']} deposits) {note}")
    except Exception as e:
        print(f"  [!] Could not compute: {e}")

    print(f"""
--- next steps ---
  1. Start the server (set SAHAI_SETUP_KEY first if you need to register more):
       uvicorn backend.app:app --reload --port 5000
  2. Log in at /docs as a member ({MEMBERS[0]['member_id']} / demo1234) or the
     treasurer ({TREASURER['member_id']} / demo1234), then click Authorize.
  3. The demo contrast: POST /request-loan with amount 60000, term 12, as
     '{MEMBERS[0]['member_id']}' and then as '{MEMBERS[1]['member_id']}'.
     Same loan, opposite verdict - driven entirely by ledger history.
""")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Seed sahAI with demo data.")
    p.add_argument("--reset", action="store_true", help="delete the database first")
    args = p.parse_args()

    if args.reset:
        reset_database()
    seed()