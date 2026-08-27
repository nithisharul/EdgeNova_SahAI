"""
Ledger routes -- the tamper-evident security layer.

POST /ledger/add     -> write a new hash-chained transaction
GET  /ledger/verify  -> walk the chain and confirm nothing was altered
GET  /ledger/all     -> raw ledger entries
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Literal

from backend.ledger import add_entry, verify_chain, get_all_entries
from backend.auth import STAFF_ROLES, get_current_user, require_treasurer

router = APIRouter(prefix="/ledger", tags=["ledger"])


class LedgerAddRequest(BaseModel):
    member_id: str
    entry_type: Literal["savings_deposit", "loan_disbursed", "loan_repayment"]
    amount: float

@router.post("/add")
def ledger_add(payload: LedgerAddRequest, user: dict = Depends(get_current_user)):
    # Any logged-in user can add a transaction for themself; a treasurer
    # can add on behalf of any member.
    if user["role"] not in STAFF_ROLES and user["member_id"] != payload.member_id:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="You can only log transactions for your own account.")

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