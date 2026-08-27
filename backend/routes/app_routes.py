"""
App-facing routes.

The existing routers cover auth, the two agronomy models, loan scoring and the
raw ledger. This file adds what the React Native client needs on top of those
and nothing more:

    GET  /health                  liveness, model availability, database state
    GET  /api/members             roster with real ledger-derived positions
    POST /api/members             register a member (treasurer)
    GET  /api/members/{id}        one member plus their transaction history
    GET  /api/finance/summary     the figures the Finance and Home screens show
    GET  /api/transactions        ledger entries in the shape the list renders
    GET  /api/loans               outstanding loans, derived per member

Everything here reads from the same SQLite database and the same hash-chained
ledger the rest of the backend uses. Nothing is computed twice and nothing is
invented: a value the ledger cannot support is not returned at all.

Auth follows the convention already set in this codebase -- reads need a valid
token, creating a member needs a treasurer.
"""

import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth import get_current_user, require_treasurer
from backend.ledger import add_entry, get_all_entries
from backend.models import member_directory as directory
from backend.models.user import create_user
from backend.services import agri_pipeline as agri

router = APIRouter(tags=["app"])

# How a ledger entry_type is described in the transactions list.
ENTRY_LABELS = {
    "savings_deposit": "Savings deposit",
    "loan_disbursed": "Loan disbursed",
    "loan_repayment": "Loan repayment",
}

# Entry types that move money OUT of the group's pooled corpus.
OUTGOING = {"loan_disbursed"}


# ------------------------------------------------------------------- me

@router.get("/api/me")
def api_me(user: dict = Depends(get_current_user)):
    """
    The signed-in account, including its display name.

    /auth/me returns what the token carries -- member_id and role -- which is
    correct but leaves the client with an id to greet the user by. This adds
    the name and profile fields from the users table.
    """
    conn = directory.get_connection()
    row = conn.execute(
        "SELECT member_id, name, role, phone, village FROM users WHERE member_id = ?",
        (user["member_id"],),
    ).fetchone()
    conn.close()

    if row is None:
        raise HTTPException(status_code=404, detail="Account not found.")

    return {
        "member_id": row["member_id"],
        "name": row["name"],
        "role": row["role"],
        "phone": row["phone"],
        "village": row["village"],
    }


# ----------------------------------------------------------------- health

def _model_status():
    """Which trained models actually loaded. Never raises."""
    status = {}
    for name, loader in (
        ("crop", agri.load_crop_model),
        ("fertilizer", agri.load_fertilizer_model),
    ):
        try:
            loader()
            status[name] = True
        except Exception:
            status[name] = False

    # The loan model is loaded at import time by loan_routes.
    try:
        from backend.routes.loan_routes import loan_model
        status["loan"] = loan_model is not None
    except Exception:
        status["loan"] = False

    return status


@router.get("/health")
def health():
    """Unauthenticated so the client can check reachability before logging in."""
    try:
        database = {
            "connected": True,
            "members": len(directory.list_members()),
            "ledger_entries": len(get_all_entries()),
        }
    except Exception:
        database = {"connected": False, "members": 0, "ledger_entries": 0}

    return {"status": "ok", "models": _model_status(), "database": database}


# ---------------------------------------------------------------- members

class NewMember(BaseModel):
    name: str = Field(..., min_length=2)
    phone: str = Field(..., min_length=6, max_length=20)
    village: str = Field(..., min_length=2)
    initial_savings: float = Field(0, ge=0)
    #: PIN for the member's own login. Defaults to the phone number, which is
    #: how an SHG treasurer hands out first credentials on paper.
    password: str | None = None


@router.get("/api/members")
def api_members(user: dict = Depends(get_current_user)):
    return {"members": directory.list_members()}


@router.get("/api/members/{member_id}")
def api_member_detail(member_id: str, user: dict = Depends(get_current_user)):
    member = directory.get_member(member_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found.")

    history = [
        _as_transaction(entry)
        for entry in get_all_entries()
        if entry["member_id"] == member_id
    ]
    history.reverse()  # newest first, matching the list screens
    return {**member, "history": history}


@router.post("/api/members", status_code=201)
def api_create_member(payload: NewMember, user: dict = Depends(require_treasurer)):
    """Register a member, then record their opening savings on the ledger."""
    member_id = directory.next_member_id()

    try:
        create_user(member_id, payload.name.strip(), payload.password or payload.phone, "member")
    except ValueError as e:
        # create_user raises when the id is already taken -- a genuine conflict.
        raise HTTPException(status_code=409, detail=str(e))

    directory.set_profile(
        member_id,
        phone=payload.phone.strip(),
        village=payload.village.strip(),
        joined_at=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    )

    # An opening balance is a real deposit, so it goes through the chain like
    # any other -- not written straight into a totals column.
    if payload.initial_savings > 0:
        add_entry(member_id, "savings_deposit", float(payload.initial_savings))

    created = directory.get_member(member_id)
    if created is None:
        raise HTTPException(status_code=500, detail="Member could not be created.")
    return created


# ----------------------------------------------------------- transactions

def _as_transaction(entry: dict) -> dict:
    """One ledger row in the shape the transactions list renders."""
    return {
        "id": "TXN-%04d" % entry["id"],
        "ledger_id": entry["id"],
        "member_id": entry["member_id"],
        "entry_type": entry["entry_type"],
        "description": ENTRY_LABELS.get(entry["entry_type"], entry["entry_type"]),
        "amount": entry["amount"],
        "outgoing": entry["entry_type"] in OUTGOING,
        "timestamp": entry["timestamp"],
        "date": time.strftime("%d %b %Y", time.localtime(entry["timestamp"])),
    }


@router.get("/api/transactions")
def api_transactions(user: dict = Depends(get_current_user)):
    """Newest first. Member names are resolved here so the client does not have
    to join two responses together."""
    names = {m["member_id"]: m["name"] for m in directory.list_members()}
    rows = [_as_transaction(e) for e in get_all_entries()]
    rows.reverse()
    for row in rows:
        row["member"] = names.get(row["member_id"], row["member_id"])
    return {"transactions": rows}


# --------------------------------------------------------------- finance

@router.get("/api/finance/summary")
def api_finance_summary(user: dict = Depends(get_current_user)):
    """The group's position, derived entirely from the ledger."""
    entries = get_all_entries()

    total_savings = sum(e["amount"] for e in entries if e["entry_type"] == "savings_deposit")
    disbursed = sum(e["amount"] for e in entries if e["entry_type"] == "loan_disbursed")
    repaid = sum(e["amount"] for e in entries if e["entry_type"] == "loan_repayment")
    outstanding = max(disbursed - repaid, 0.0)

    # Savings recorded in the current calendar month.
    now = datetime.now()
    savings_this_month = 0.0
    for e in entries:
        if e["entry_type"] != "savings_deposit":
            continue
        when = datetime.fromtimestamp(e["timestamp"])
        if when.year == now.year and when.month == now.month:
            savings_this_month += e["amount"]

    return {
        "total_savings": round(total_savings, 2),
        # What the group could still lend out today.
        "available_balance": round(total_savings - outstanding, 2),
        "outstanding_loans": round(outstanding, 2),
        "active_members": len(directory.list_members()),
        "savings_this_month": round(savings_this_month, 2),
        "transaction_count": len(entries),
    }


# ----------------------------------------------------------------- loans

@router.get("/api/loans")
def api_loans(user: dict = Depends(get_current_user)):
    """One row per member who has borrowed, with what is still owed."""
    names = {m["member_id"]: m["name"] for m in directory.list_members()}

    per_member = {}
    for entry in get_all_entries():
        if entry["entry_type"] not in ("loan_disbursed", "loan_repayment"):
            continue
        bucket = per_member.setdefault(
            entry["member_id"],
            {"borrowed": 0.0, "repaid": 0.0, "disbursed_at": entry["timestamp"]},
        )
        if entry["entry_type"] == "loan_disbursed":
            bucket["borrowed"] += entry["amount"]
            bucket["disbursed_at"] = min(bucket["disbursed_at"], entry["timestamp"])
        else:
            bucket["repaid"] += entry["amount"]

    loans = []
    for member_id, b in per_member.items():
        outstanding = max(b["borrowed"] - b["repaid"], 0.0)
        progress = (b["repaid"] / b["borrowed"] * 100) if b["borrowed"] else 0.0
        loans.append({
            "id": "LN-" + member_id,
            "member_id": member_id,
            "member": names.get(member_id, member_id),
            "principal": round(b["borrowed"], 2),
            "repaid": round(b["repaid"], 2),
            "outstanding": round(outstanding, 2),
            "repaid_percent": round(min(progress, 100.0), 1),
            "status": "Closed" if outstanding <= 0 else "Active",
            "disbursed_on": time.strftime("%d %b %Y", time.localtime(b["disbursed_at"])),
        })

    loans.sort(key=lambda loan: loan["outstanding"], reverse=True)
    return {"loans": loans}
