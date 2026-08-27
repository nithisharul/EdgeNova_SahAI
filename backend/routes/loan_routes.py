"""
Loan Risk route.

POST /request-loan -> gives the treasurer a risk indicator for a member's
internal loan request, using the trained XGBoost model
(models/train_loan_model.py -> models/loan_model.joblib).

Two things worth knowing:

1. savings_consistency is NOT taken from the request body. It is derived from
   the member's own hash-chained ledger history (deposit regularity), which is
   the whole point of the product: the score is hers, not generic. A caller
   cannot inflate her own score by passing a number.

2. The model was trained on Kiva loans denominated in USD. SHG loans are in
   INR. Feeding a raw rupee amount into a USD-scaled model puts it far outside
   the training distribution, so amounts are converted before scoring. See
   INR_PER_USD below.
"""

import os

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.ledger import get_all_entries

router = APIRouter(tags=["loan"])

MODELS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "models",
)

# Kiva loan_amount is USD. Convert INR requests to a USD-equivalent so they land
# inside the distribution the scaler was fitted on. Approximate on purpose - it
# only needs to put the value in the right order of magnitude.
INR_PER_USD = 83.0

# Sectors the model saw during training. Anything else is one-hot "unknown"
# (handle_unknown="ignore"), which is safe but carries no signal.
VALID_SECTORS = [
    "Agriculture", "Food", "Retail", "Services", "Clothing", "Housing",
    "Education", "Health", "Arts", "Transportation", "Construction",
    "Manufacturing", "Personal Use", "Entertainment", "Wholesale",
]
VALID_INTERVALS = ["monthly", "irregular", "bullet", "weekly"]

# Below this many deposits we don't trust a computed consistency figure.
MIN_DEPOSITS_FOR_CONFIDENCE = 3
NEUTRAL_CONSISTENCY = 0.5


class LoanRequest(BaseModel):
    amount: float = Field(..., gt=0, description="Requested loan amount in INR")
    term_in_months: int = Field(..., gt=0, le=120)
    sector: str = Field("Agriculture", description=f"One of: {VALID_SECTORS}")
    repayment_interval: str = Field("monthly", description=f"One of: {VALID_INTERVALS}")
    member_id: str | None = Field(
        None,
        description="Treasurer only - score on behalf of another member. "
                    "Members always score themselves.",
    )


def load_loan_model():
    model_path = os.path.join(MODELS_DIR, "loan_model.joblib")
    meta_path = os.path.join(MODELS_DIR, "loan_preprocessor.joblib")
    if not (os.path.exists(model_path) and os.path.exists(meta_path)):
        return None, None
    return joblib.load(model_path), joblib.load(meta_path)


# Loaded once at import. None means the model hasn't been trained yet.
loan_model, loan_meta = load_loan_model()


def compute_savings_consistency(member_id: str):
    """Derive deposit regularity (0-1) from the member's ledger history.

    Two components, averaged:
      * interval regularity - are deposits evenly spaced?
      * amount regularity   - are deposits similar in size?

    Both use 1 - coefficient_of_variation, clipped to [0, 1]. A member who
    deposits Rs.500 every month scores near 1.0; sporadic lump sums score low.

    Returns (score, explanation_dict). With too little history we return a
    neutral 0.5 and say so rather than pretending to a precise figure.
    """
    deposits = [
        e for e in get_all_entries()
        if e["member_id"] == member_id and e["entry_type"] == "savings_deposit"
    ]
    deposits.sort(key=lambda e: e["timestamp"])

    detail = {"deposit_count": len(deposits), "basis": None}

    if len(deposits) < MIN_DEPOSITS_FOR_CONFIDENCE:
        detail["basis"] = (
            f"Only {len(deposits)} deposit(s) on record - too little history to "
            f"assess regularity. Using a neutral value."
        )
        detail["is_estimated"] = True
        return NEUTRAL_CONSISTENCY, detail

    timestamps = np.array([e["timestamp"] for e in deposits], dtype=float)
    amounts = np.array([e["amount"] for e in deposits], dtype=float)

    gaps = np.diff(timestamps)
    if len(gaps) and gaps.mean() > 0:
        interval_cv = gaps.std() / gaps.mean()
        interval_score = float(np.clip(1.0 - interval_cv, 0.0, 1.0))
    else:
        interval_score = NEUTRAL_CONSISTENCY

    if amounts.mean() > 0:
        amount_cv = amounts.std() / amounts.mean()
        amount_score = float(np.clip(1.0 - amount_cv, 0.0, 1.0))
    else:
        amount_score = NEUTRAL_CONSISTENCY

    score = round(float(np.clip(0.5 * interval_score + 0.5 * amount_score, 0.0, 1.0)), 3)

    detail.update({
        "basis": f"Computed from {len(deposits)} recorded deposits.",
        "interval_regularity": round(interval_score, 3),
        "amount_regularity": round(amount_score, 3),
        "is_estimated": False,
    })
    return score, detail


def band_for(proba: float, bands) -> str:
    for cutoff, label in bands:
        if proba < cutoff:
            return label
    return bands[-1][1]


@router.post("/request-loan")
def request_loan(payload: LoanRequest, user: dict = Depends(get_current_user)):
    if loan_model is None:
        raise HTTPException(
            status_code=503,
            detail="Loan model not trained yet. Run models/train_loan_model.py first.",
        )

    # A member always scores herself. Only a treasurer may name another member.
    if payload.member_id and payload.member_id != user["member_id"]:
        if user["role"] != "treasurer":
            raise HTTPException(
                status_code=403,
                detail="You can only request a loan assessment for your own account.",
            )
        target_id = payload.member_id
    else:
        target_id = user["member_id"]

    if payload.sector not in VALID_SECTORS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown sector '{payload.sector}'. Valid values: {VALID_SECTORS}",
        )
    if payload.repayment_interval not in VALID_INTERVALS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown repayment_interval '{payload.repayment_interval}'. "
                   f"Valid values: {VALID_INTERVALS}",
        )

    # --- the feature the SHG actually owns, straight from the ledger ---
    savings_consistency, consistency_detail = compute_savings_consistency(target_id)

    # --- build the feature row (names must match FEATURE_COLS exactly) ---
    amount_usd = payload.amount / INR_PER_USD
    num_borrowers = 1          # SHG internal loans are to one member
    female_ratio = 1.0         # SHG membership is women

    row = pd.DataFrame([{
        "loan_amount": amount_usd,
        "log_loan_amount": float(np.log1p(amount_usd)),
        "term_in_months": float(payload.term_in_months),
        "monthly_installment": amount_usd / max(payload.term_in_months, 1),
        "loan_per_borrower": amount_usd / num_borrowers,
        "num_borrowers": float(num_borrowers),
        "female_ratio": female_ratio,
        "savings_consistency": savings_consistency,
        "sector": payload.sector,
        "repayment_interval": payload.repayment_interval,
    }])[loan_meta["feature_cols"]]

    x = loan_meta["preprocessor"].transform(row)
    proba = float(loan_model.predict_proba(x)[0][1])

    threshold = float(loan_meta["decision_threshold"])
    bands = loan_meta["risk_bands"]

    return {
        "member_id": target_id,
        "risk_score": round(proba, 3),
        "risk_label": band_for(proba, bands),
        "flagged_high_risk": bool(proba >= threshold),
        "decision_threshold": round(threshold, 3),
        "savings_consistency": savings_consistency,
        "savings_consistency_detail": consistency_detail,
        "request": {
            "amount_inr": payload.amount,
            "term_in_months": payload.term_in_months,
            "sector": payload.sector,
            "repayment_interval": payload.repayment_interval,
        },
        "model": {
            "type": "XGBoost",
            "val_auc": round(float(loan_meta.get("val_auc", 0)), 4),
            "label_is_synthetic": bool(loan_meta.get("label_is_synthetic", True)),
        },
        "note": "Decision aid only -- final approval remains with the treasurer.",
    }