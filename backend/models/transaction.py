"""
Transaction entity + hashing logic for the tamper-evident SHG ledger.

This is where the SHA-256 hashing actually lives -- ledger.py imports
compute_hash() and LedgerEntry from here and handles the database/
chain-walking side of things.
"""

import hashlib
import json
from dataclasses import dataclass
from typing import Optional

GENESIS_HASH = "0" * 64


@dataclass
class LedgerEntry:
    id: Optional[int]
    member_id: str
    entry_type: str      # "savings_deposit" | "loan_disbursed" | "loan_repayment"
    amount: float
    timestamp: float
    prev_hash: str
    entry_hash: str = ""


def compute_hash(member_id: str, entry_type: str, amount: float,
                  timestamp: float, prev_hash: str) -> str:
    """
    SHA-256 hash of a transaction's data chained to the previous entry's
    hash. This is the core of the tamper-evident ledger: change any past
    entry's data and its hash (and every hash after it) no longer matches
    what's stored, which verify_chain() in ledger.py detects.
    """
    # Cast amount/timestamp to float explicitly -- SQLite round-trips
    # REAL columns as float, but a caller might pass an int (e.g. 500
    # instead of 500.0), which would serialize differently and break
    # hash verification. Casting here keeps hashing consistent regardless
    # of whether the value just came from Python or from the DB.
    payload = json.dumps({
        "member_id": member_id,
        "entry_type": entry_type,
        "amount": float(amount),
        "timestamp": float(timestamp),
        "prev_hash": prev_hash,
    }, sort_keys=True)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()
