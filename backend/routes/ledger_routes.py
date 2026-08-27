"""
Ledger routes -- the tamper-evident security layer.

POST /ledger/add     -> write a new hash-chained transaction
GET  /ledger/verify  -> walk the chain and confirm nothing was altered
GET  /ledger/all     -> raw ledger entries

WHO MAY WRITE WHAT
------------------
Only staff (treasurer/admin) may record savings_deposit and loan_disbursed
entries. This is not bureaucracy: compute_savings_consistency() in
loan_routes.py derives a member's loan risk score from her deposit history,
so a member who could write her own deposits could manufacture a perfect
savings record and talk her own risk score down. The hash chain proves nobody
EDITED an entry; it cannot prove the money ever changed hands. Mirroring real
SHG practice - the treasurer records collections at the weekly meeting -
closes that gap.

Members may still record their own loan_repayment entries, which only ever
count against them.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from backend.ledger import add_entry, verify_chain, get_all_entries
from backend.auth import STAFF_ROLES, get_current_user, require_treasurer

router = APIRouter(prefix="/ledger", tags=["ledger"])


# Entry types a member may never write for herself - see module docstring.
STAFF_ONLY_ENTRY_TYPES = ("savings_deposit", "loan_disbursed")


class LedgerAddRequest(BaseModel):
    member_id: str = Field(..., min_length=1, max_length=64)
    entry_type: Literal["savings_deposit", "loan_disbursed", "loan_repayment"]
    amount: float = Field(..., gt=0, le=10_000_000,
                          description="Always positive; direction comes from entry_type.")


@router.post("/add")
def ledger_add(payload: LedgerAddRequest, user: dict = Depends(get_current_user)):
    is_staff = user["role"] in STAFF_ROLES

    # A member may only ever write entries against her own account.
    if not is_staff and user["member_id"] != payload.member_id:
        raise HTTPException(
            status_code=403,
            detail="You can only log transactions for your own account.",
        )

    # ...and even then, not the types that feed her own loan risk score.
    if not is_staff and payload.entry_type in STAFF_ONLY_ENTRY_TYPES:
        raise HTTPException(
            status_code=403,
            detail=(
                f"'{payload.entry_type}' must be recorded by the treasurer. "
                f"Members may record loan_repayment only."
            ),
        )

    entry = add_entry(payload.member_id, payload.entry_type, payload.amount)
    return {
        "id": entry.id,
        "member_id": entry.member_id,
        "entry_type": entry.entry_type,
        "amount": entry.amount,
        "timestamp": entry.timestamp,
        "entry_hash": entry.entry_hash,
    }


@router.get("/verify")
def ledger_verify(user: dict = Depends(require_treasurer)):
    valid, broken_id = verify_chain()
    return {"valid": valid, "broken_entry_id": broken_id}


@router.get("/all")
def ledger_all(user: dict = Depends(require_treasurer)):
    return get_all_entries()