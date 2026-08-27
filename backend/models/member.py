"""
Member entity -- aggregates ledger data into a portfolio view.
"""

from dataclasses import dataclass, field
from typing import List, Dict
from backend.ledger import get_all_entries, get_member_balance


@dataclass
class MemberPortfolio:
    member_id: str
    name: str
    total_savings: float = 0.0
    total_loans_outstanding: float = 0.0
    net_position: float = 0.0
    history: List[Dict] = field(default_factory=list)


def build_portfolio(member_id: str, name: str = "") -> MemberPortfolio:
    entries = [e for e in get_all_entries() if e["member_id"] == member_id]

    total_savings = sum(e["amount"] for e in entries if e["entry_type"] == "savings_deposit")
    total_borrowed = sum(e["amount"] for e in entries if e["entry_type"] == "loan_disbursed")
    total_repaid = sum(e["amount"] for e in entries if e["entry_type"] == "loan_repayment")
    outstanding = max(total_borrowed - total_repaid, 0.0)

    net_position = get_member_balance(member_id)

    return MemberPortfolio(
        member_id=member_id,
        name=name,
        total_savings=total_savings,
        total_loans_outstanding=outstanding,
        net_position=net_position,
        history=entries,
    )


def build_group_summary() -> Dict:
    entries = get_all_entries()
    member_ids = sorted(set(e["member_id"] for e in entries))

    total_corpus = sum(e["amount"] for e in entries if e["entry_type"] == "savings_deposit")
    total_lent = sum(e["amount"] for e in entries if e["entry_type"] == "loan_disbursed")
    total_repaid = sum(e["amount"] for e in entries if e["entry_type"] == "loan_repayment")

    return {
        "member_count": len(member_ids),
        "total_corpus": total_corpus,
        "total_outstanding_loans": max(total_lent - total_repaid, 0.0),
        "members": member_ids,
    }
