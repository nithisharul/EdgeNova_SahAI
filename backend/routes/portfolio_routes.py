"""
Portfolio routes -- member and treasurer-level financial views,
built on top of the ledger data.

GET /member/{member_id}/portfolio -> one member's savings/loans/net position
GET /group/summary                -> treasurer's group-wide overview
"""

from fastapi import APIRouter, Depends

from backend.auth import require_roles

from backend.models.member import build_portfolio, build_group_summary

router = APIRouter(tags=["portfolio"])


@router.get("/member/{member_id}/portfolio")
def member_portfolio(
    member_id: str,
    current_user=Depends(require_roles("admin", "treasurer")),
):
    _ = current_user
    portfolio = build_portfolio(member_id)
    return {
        "member_id": portfolio.member_id,
        "total_savings": portfolio.total_savings,
        "total_loans_outstanding": portfolio.total_loans_outstanding,
        "net_position": portfolio.net_position,
        "history": portfolio.history,
    }


@router.get("/group/summary")
def group_summary(current_user=Depends(require_roles("admin", "treasurer"))):
    _ = current_user
    return build_group_summary()
