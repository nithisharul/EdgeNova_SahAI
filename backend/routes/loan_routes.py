"""
Loan Risk route.

POST /request-loan -> gives the treasurer a risk indicator for a
member's internal loan request. Currently a lightweight placeholder
formula -- swap in the trained XGBoost model (models/loan_model.json,
from models/train_loan_model.py) before your demo for the real version.
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["loan"])


class LoanRequest(BaseModel):
    amount: float
    savings_consistency: float = 0.5  # 0-1


@router.post("/request-loan")
def request_loan(payload: LoanRequest):
    risk_score = max(0.0, min(
        1.0,
        (payload.amount / 5000) * 0.5 + (1 - payload.savings_consistency) * 0.5,
    ))
    risk_label = "Low" if risk_score < 0.33 else "Medium" if risk_score < 0.66 else "High"

    return {
        "risk_score": round(risk_score, 3),
        "risk_label": risk_label,
        "note": "Decision aid only -- final approval remains with the treasurer.",
    }
