"""
Seed the SahAI database with a demo SHG.

RUN THIS BY HAND. Nothing calls it automatically, and the application never
seeds itself at startup -- an empty database stays empty until someone decides
otherwise.

    python backend/seed_demo.py            # seed, refuses if data exists
    python backend/seed_demo.py --reset    # wipe demo rows first, then seed

WHY IT EXISTS
-------------
The backend derives every financial figure from the hash-chained ledger, so a
fresh database renders every finance screen as a legitimate but empty one:
zero members, zero corpus, nothing to verify. This script writes a plausible
twelve-member group so the app can be demonstrated end to end with data that
travels the real path -- SQLite -> FastAPI -> service layer -> screen -- rather
than being faked in the frontend.

The savings deposits are written as a monthly series per member rather than
one lump sum. That matters: the loan risk model's savings_consistency feature
is computed from deposit regularity in the ledger, so a single opening balance
would give every member the same neutral score and the model would have
nothing real to read.

Every row goes through backend.ledger.add_entry(), so the SHA-256 chain is
built exactly as it would be in production and GET /ledger/verify passes.
"""

import argparse
import random
import sqlite3
import sys
import time
from pathlib import Path

# Allow `python backend/seed_demo.py` from the repository root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.db_path import DB_PATH
from backend.ledger import add_entry, get_all_entries, init_db, verify_chain
from backend.models.member_directory import ensure_profile_columns, set_profile
from backend.models.user import create_user, init_users_db

DAY = 86400.0
MONTH = 30 * DAY

# The treasurer account the app signs in as. The PIN is a local demo
# credential for a database that holds no real people -- change it before this
# is ever pointed at genuine member data.
TREASURER = {
    "member_id": "TRE-001",
    "name": "Group Treasurer",
    "password": "sahai-demo-2026",
    "phone": "9800000100",
    "village": "Rampur",
}

# name, phone, village, joined, monthly deposit, count, regularity
#
# `regularity` drives how evenly the deposits are spaced and sized. It exists
# because the loan risk model reads savings_consistency straight out of this
# ledger: if every member saved identically, every member would score the same
# and the feature would demonstrate nothing. 1.0 is a member who never misses;
# lower values skip months and vary the amount, which is what a real SHG book
# looks like.
MEMBERS = [
    ("Asha Devi",    "9800000101", "Rampur",   "2025-06-12", 1000, 8, 1.00),
    ("Meena Devi",   "9800000102", "Rampur",   "2025-06-12",  975, 8, 0.85),
    ("Sunita Devi",  "9800000103", "Kondapur", "2025-07-03",  885, 7, 0.95),
    ("Lakshmi Bai",  "9800000104", "Kondapur", "2025-07-19",  900, 6, 0.70),
    ("Radha Kumari", "9800000105", "Rampur",   "2025-08-02",  920, 5, 0.45),
    ("Kavita Devi",  "9800000106", "Bhimpur",  "2025-08-14",  760, 5, 0.90),
    ("Savitri Devi", "9800000107", "Bhimpur",  "2025-09-01",  800, 4, 0.30),
    ("Parvati Devi", "9800000108", "Rampur",   "2025-09-22",  600, 4, 0.75),
    ("Gita Devi",    "9800000109", "Kondapur", "2025-10-08",  633, 3, 0.60),
    ("Rukmini Devi", "9800000110", "Bhimpur",  "2025-11-11",  800, 2, 0.80),
    ("Shanti Devi",  "9800000111", "Rampur",   "2026-01-15",  750, 2, 0.90),
    ("Anita Devi",   "9800000112", "Kondapur", "2026-02-04",  800, 2, 0.85),
]

# member index -> (principal, repaid so far). Outstanding = principal - repaid.
LOANS = {
    0: (5000, 2000),   # Asha Devi     -> 3000 outstanding
    1: (8000, 3000),   # Meena Devi    -> 5000 outstanding
    4: (6000, 2000),   # Radha Kumari  -> 4000 outstanding
    6: (7000, 1000),   # Savitri Devi  -> 6000 outstanding
}


def existing_counts():
    conn = sqlite3.connect(DB_PATH)
    users = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    ledger = conn.execute("SELECT COUNT(*) FROM ledger").fetchone()[0]
    conn.close()
    return users, ledger


def wipe():
    """Remove every row this script would have written. Destructive, opt-in."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute("DELETE FROM ledger")
    conn.execute("DELETE FROM users")
    conn.execute("DELETE FROM sqlite_sequence WHERE name IN ('ledger')")
    conn.commit()
    conn.close()
    print("[i] Cleared users and ledger.")


def seed():
    now = time.time()

    create_user(TREASURER["member_id"], TREASURER["name"], TREASURER["password"], "treasurer")
    set_profile(
        TREASURER["member_id"],
        phone=TREASURER["phone"],
        village=TREASURER["village"],
        joined_at="2025-06-01",
    )
    print(f"[+] Treasurer {TREASURER['member_id']} ({TREASURER['name']})")

    # Deposits first, oldest to newest, so the chain reads chronologically.
    # Seeded RNG so a re-seed reproduces the same book.
    rng = random.Random(20260827)

    deposits = []
    for index, (name, phone, village, joined, monthly, count, regularity) in enumerate(MEMBERS, start=1):
        member_id = "MEM-%03d" % index
        # The PIN is the member's phone number, which is how a treasurer hands
        # out first credentials on paper.
        create_user(member_id, name, phone, "member")
        set_profile(member_id, phone=phone, village=village, joined_at=joined)

        # A perfectly regular saver deposits the same amount every month. As
        # regularity falls, both the gap and the amount wander further.
        wobble = 1.0 - regularity
        for n in range(count):
            # Newest deposit roughly this month, then one per month backwards.
            slot = now - (count - 1 - n) * MONTH - DAY
            when = slot - rng.uniform(0, wobble * 22 * DAY)
            amount = monthly * (1.0 + rng.uniform(-wobble, wobble) * 0.55)
            deposits.append((when, member_id, "savings_deposit", round(max(amount, 50.0), 2)))

    for when, member_id, entry_type, amount in sorted(deposits):
        _add_at(member_id, entry_type, amount, when)

    print(f"[+] {len(MEMBERS)} members, {len(deposits)} savings deposits")

    # Loans: disbursed a few months back, repayments after.
    loan_rows = 0
    for index, (principal, repaid) in LOANS.items():
        member_id = "MEM-%03d" % (index + 1)
        disbursed_at = now - 4 * MONTH
        _add_at(member_id, "loan_disbursed", float(principal), disbursed_at)
        loan_rows += 1

        if repaid > 0:
            # Two equal instalments so repayment history is visible.
            half = repaid / 2.0
            _add_at(member_id, "loan_repayment", half, now - 2 * MONTH)
            _add_at(member_id, "loan_repayment", repaid - half, now - 1 * MONTH)
            loan_rows += 2

    print(f"[+] {len(LOANS)} loans, {loan_rows} loan ledger rows")


def _add_at(member_id: str, entry_type: str, amount: float, when: float):
    """add_entry() stamps time.time(); rewrite the timestamp and rebuild the
    hash so back-dated demo history still forms a valid chain."""
    from backend.models.transaction import compute_hash

    entry = add_entry(member_id, entry_type, amount)

    conn = sqlite3.connect(DB_PATH)
    row = conn.execute("SELECT prev_hash FROM ledger WHERE id = ?", (entry.id,)).fetchone()
    prev_hash = row[0]
    new_hash = compute_hash(member_id, entry_type, float(amount), float(when), prev_hash)
    conn.execute(
        "UPDATE ledger SET timestamp = ?, entry_hash = ? WHERE id = ?",
        (float(when), new_hash, entry.id),
    )
    # Every later entry chains off this one, so re-point the next entry's
    # prev_hash. Entries are written in order, so there is at most one.
    conn.execute(
        "UPDATE ledger SET prev_hash = ? WHERE id = ?",
        (new_hash, entry.id + 1),
    )
    conn.commit()
    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Seed the SahAI demo SHG.")
    parser.add_argument("--reset", action="store_true",
                        help="delete existing users and ledger rows first")
    args = parser.parse_args()

    print(f"[i] Database: {DB_PATH}")
    init_db()
    init_users_db()
    ensure_profile_columns()

    users, ledger = existing_counts()
    if (users or ledger) and not args.reset:
        print(f"[!] Database already holds {users} user(s) and {ledger} ledger row(s).")
        print("    Refusing to seed on top of existing data. Re-run with --reset")
        print("    to clear them first, if that is genuinely what you want.")
        return 1

    if args.reset:
        wipe()

    seed()

    entries = get_all_entries()
    savings = sum(e["amount"] for e in entries if e["entry_type"] == "savings_deposit")
    disbursed = sum(e["amount"] for e in entries if e["entry_type"] == "loan_disbursed")
    repaid = sum(e["amount"] for e in entries if e["entry_type"] == "loan_repayment")
    outstanding = disbursed - repaid

    valid, broken = verify_chain()

    print()
    print(f"    ledger entries    {len(entries)}")
    print(f"    total savings     Rs {savings:,.0f}")
    print(f"    outstanding loans Rs {outstanding:,.0f}")
    print(f"    available balance Rs {savings - outstanding:,.0f}")
    print(f"    chain valid       {valid}" + ("" if valid else f" (broken at {broken})"))
    print()
    if not valid:
        print("[!] Chain verification FAILED -- the seed is not trustworthy.")
        return 1
    print("[+] Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
