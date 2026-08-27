"""
Portfolio routes -- member and treasurer-level financial views,
built on top of the ledger data.

GET /member/{member_id}/portfolio -> one member's savings/loans/net position
GET /group/summary                -> treasurer's group-wide overview
"""

from fastapi import APIRouter, Depends, HTTPException

from backend.models.member import build_portfolio, build_group_summary
from backend.auth import STAFF_ROLES, get_current_user, require_treasurer

router = APIRouter(tags=["portfolio"])


@router.get("/member/{member_id}/portfolio")
def member_portfolio(member_id: str, user: dict = Depends(get_current_user)):
    # A member can only see their own portfolio; staff can see anyone's.
    if user["role"] not in STAFF_ROLES and user["member_id"] != member_id:
        raise HTTPException(status_code=403, detail="You can only view your own portfolio.")

    portfolio = build_portfolio(member_id)
    return {
        "member_id": portfolio.member_id,
        "total_savings": portfolio.total_savings,
        "total_loans_outstanding": portfolio.total_loans_outstanding,
        "net_position": portfolio.net_position,
        "history": portfolio.history,
    }


@router.get("/group/summary")
def group_summary(user: dict = Depends(require_treasurer)):
    return build_group_summary()