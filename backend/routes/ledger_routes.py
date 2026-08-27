"""
Ledger routes -- the tamper-evident security layer.

POST /ledger/add     -> write a new hash-chained transaction
GET  /ledger/verify  -> walk the chain and confirm nothing was altered
GET  /ledger/all     -> raw ledger entries
"""

from fastapi import APIRouter
from pydantic import BaseModel

from backend.ledger import add_entry, verify_chain, get_all_entries

router = APIRouter(prefix="/ledger", tags=["ledger"])


class LedgerAddRequest(BaseModel):
    member_id: str
    entry_type: str  # "savings_deposit" | "loan_disbursed" | "loan_repayment"
    amount: float


@router.post("/add")
def ledger_add(payload: LedgerAddRequest):
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
def ledger_verify():
    valid, broken_id = verify_chain()
    return {"valid": valid, "broken_entry_id": broken_id}


@router.get("/all")
def ledger_all():
    return get_all_entries()
