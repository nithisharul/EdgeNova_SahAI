"""
sahAI - SHG Loan Repayment Risk Model (XGBoost)
================================================

Trains a binary classifier that scores how risky a proposed SHG loan is.

Dataset : "Kiva Loans" (Kaggle, public) - kiva_loans.csv

IMPORTANT - READ BEFORE THE DEMO
--------------------------------
The Kiva dataset contains NO repayment or default outcome column. There is no
ground-truth label to learn. This script therefore constructs a *documented
synthetic risk label* from real Kiva signals, and trains on features the sahAI
app can actually supply at request time.

Label construction (see build_risk_label):
    latent_risk =  w1 * z(loan_amount)
                +  w2 * z(term_in_months)
                +  w3 * (1 - funded_ratio)          <-- crowd confidence signal
                +  sector_base_rate
                -  w5 * savings_consistency
                +  gaussian noise
    label = 1 (HIGH RISK) if latent_risk is in the top ~25%, else 0

Two deliberate choices worth defending to a judge:
  * funded_ratio (funded_amount / loan_amount) is real Kiva data and is used to
    BUILD the label, but is deliberately EXCLUDED from the feature set - the app
    has no funded_ratio at request time. It acts as unobserved signal, which
    stops the model from trivially inverting its own label formula.
  * savings_consistency is synthetic here, but in production it is computed from
    the member's real hash-chained ledger history (deposit regularity). It is the
    one feature sahAI genuinely owns, which is the point of the whole product.

So: the *pipeline* is real, the *label* is a proxy. Say that out loud rather
than claiming predictive validity on repayment.

Usage (from the sahAI project root):
    python models/train_loan_model.py
    python models/train_loan_model.py --csv data/raw/kiva_loans.csv --max-rows 200000

Outputs (written to models/):
    loan_model.joblib          - trained XGBClassifier
    loan_preprocessor.joblib   - ColumnTransformer + feature/band metadata
"""

import argparse
import glob
import os
import sys

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.compose import ColumnTransformer
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

SEED = 42
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw")

# Columns we pull off disk (Kiva is ~670k rows; don't load all 20 columns).
USECOLS = [
    "funded_amount",
    "loan_amount",
    "sector",
    "term_in_months",
    "lender_count",
    "repayment_interval",
    "borrower_genders",
]

# What the model actually trains on == what POST /request-loan must send.
NUMERIC_FEATURES = [
    "loan_amount",
    "term_in_months",
    "num_borrowers",
    "female_ratio",
    "savings_consistency",
]
CATEGORICAL_FEATURES = ["sector", "repayment_interval"]
FEATURE_COLS = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# Probability -> band shown in the treasurer UI.
RISK_BANDS = [(0.35, "LOW"), (0.65, "MEDIUM"), (1.01, "HIGH")]


def find_csv(explicit: str | None) -> str:
    if explicit:
        if not os.path.exists(explicit):
            sys.exit(f"[!] CSV not found: {explicit}")
        return explicit
    candidates = glob.glob(os.path.join(RAW_DIR, "*.csv"))
    hits = [c for c in candidates if "kiva" in os.path.basename(c).lower()]
    hits = [h for h in hits if "theme" not in os.path.basename(h).lower()]  # skip the region/theme extras
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        sys.exit("[!] Multiple Kiva CSVs found, pass one with --csv:\n    " + "\n    ".join(hits))
    sys.exit(
        f"[!] No kiva_loans.csv found in {RAW_DIR}\n"
        f"    Drop the Kaggle Kiva loans CSV there, or pass --csv <path>."
    )


def parse_borrower_genders(series: pd.Series) -> pd.DataFrame:
    """'female, female, male' -> borrower count + female ratio."""
    split = series.fillna("").astype(str).str.lower().str.split(",")
    num = split.apply(lambda parts: sum(1 for p in parts if p.strip()))
    fem = split.apply(lambda parts: sum(1 for p in parts if p.strip() == "female"))
    num = num.replace(0, 1)
    return pd.DataFrame({"num_borrowers": num, "female_ratio": (fem / num).clip(0, 1)})


def zscore(s: pd.Series) -> pd.Series:
    std = s.std()
    return (s - s.mean()) / (std if std and std > 0 else 1.0)


def build_risk_label(df: pd.DataFrame, rng: np.random.Generator, positive_rate: float = 0.25):
    """Synthesise a defensible risk label. See the module docstring."""
    funded_ratio = (df["funded_amount"] / df["loan_amount"].replace(0, np.nan)).fillna(0).clip(0, 1)

    # Sector-level base rates: sectors with longer cash-conversion cycles or more
    # weather exposure carry more risk. Anything unlisted gets 0.0.
    sector_base = {
        "Agriculture": 0.25,
        "Food": 0.10,
        "Retail": 0.05,
        "Services": 0.00,
        "Clothing": 0.05,
        "Housing": 0.30,
        "Education": 0.20,
        "Health": 0.15,
        "Arts": 0.15,
        "Transportation": 0.10,
        "Construction": 0.30,
        "Manufacturing": 0.15,
        "Personal Use": 0.35,
        "Entertainment": 0.25,
        "Wholesale": 0.10,
    }
    sector_effect = df["sector"].map(sector_base).fillna(0.0)

    latent = (
        0.45 * zscore(np.log1p(df["loan_amount"]))
        + 0.30 * zscore(df["term_in_months"])
        + 0.90 * (1.0 - funded_ratio)
        + sector_effect
        - 1.10 * df["savings_consistency"]
        + rng.normal(0, 0.55, len(df))  # irreducible noise -> model can't hit 100%
    )
    threshold = np.quantile(latent, 1.0 - positive_rate)
    return (latent >= threshold).astype(int), funded_ratio


def main():
    p = argparse.ArgumentParser(description="Train the sahAI loan risk model.")
    p.add_argument("--csv", default=None, help="path to kiva_loans.csv")
    p.add_argument("--max-rows", type=int, default=200_000, help="subsample for speed; 0 = use all")
    p.add_argument("--n-estimators", type=int, default=600)
    p.add_argument("--max-depth", type=int, default=5)
    p.add_argument("--lr", type=float, default=0.08)
    args = p.parse_args()

    rng = np.random.default_rng(SEED)

    # ---------------------------------------------------------------- load
    csv_path = find_csv(args.csv)
    print(f"[i] Reading {csv_path} (this file is large, give it a moment)")
    df = pd.read_csv(csv_path, usecols=lambda c: c.strip() in USECOLS, low_memory=False)
    df.columns = [c.strip() for c in df.columns]

    missing = [c for c in USECOLS if c not in df.columns]
    if missing:
        sys.exit(f"[!] Missing expected Kiva columns: {missing}\n    Present: {list(df.columns)}")

    df = df.dropna(subset=["loan_amount", "funded_amount", "term_in_months", "sector"])
    df = df[(df["loan_amount"] > 0) & (df["term_in_months"] > 0)]
    print(f"[i] Usable rows: {len(df):,}")

    if args.max_rows and len(df) > args.max_rows:
        df = df.sample(args.max_rows, random_state=SEED)
        print(f"[i] Subsampled to {len(df):,} rows (--max-rows 0 to use everything)")

    df = df.reset_index(drop=True)
    df["repayment_interval"] = df["repayment_interval"].fillna("unknown").astype(str).str.strip()
    df["sector"] = df["sector"].astype(str).str.strip()
    df = pd.concat([df, parse_borrower_genders(df["borrower_genders"])], axis=1)

    # --- synthetic feature: deposit regularity, 0..1 (real ledger data in prod)
    # Beta(5,2) skews high: most SHG members save consistently, a tail does not.
    df["savings_consistency"] = rng.beta(5, 2, len(df)).round(3)

    # --------------------------------------------------------------- label
    y, funded_ratio = build_risk_label(df, rng)
    print(f"[i] Synthetic label balance: high-risk {y.mean():.1%} / low-risk {1 - y.mean():.1%}")
    print(f"[i] funded_ratio used for label only, NOT a feature (mean {funded_ratio.mean():.3f})")

    X = df[FEATURE_COLS]
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )

    # -------------------------------------------------------- preprocessing
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERIC_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ]
    )
    X_train_t = preprocessor.fit_transform(X_train)
    X_val_t = preprocessor.transform(X_val)
    feature_names = list(preprocessor.get_feature_names_out())
    print(f"[i] Feature vector width after encoding: {X_train_t.shape[1]}")

    # -------------------------------------------------------------- model
    pos = float((y_train == 1).sum())
    neg = float((y_train == 0).sum())
    model = xgb.XGBClassifier(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        learning_rate=args.lr,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=3,
        reg_lambda=1.0,
        scale_pos_weight=neg / pos if pos else 1.0,
        objective="binary:logistic",
        eval_metric="auc",
        early_stopping_rounds=40,
        tree_method="hist",
        random_state=SEED,
        n_jobs=-1,
    )
    print("[i] Training XGBoost...")
    model.fit(X_train_t, y_train, eval_set=[(X_val_t, y_val)], verbose=50)

    # ------------------------------------------------------------- report
    proba = model.predict_proba(X_val_t)[:, 1]
    preds = (proba >= 0.5).astype(int)
    auc = roc_auc_score(y_val, proba)
    print(f"\n[i] Validation ROC-AUC: {auc:.4f}")
    print(classification_report(y_val, preds, target_names=["low risk", "high risk"], zero_division=0))

    importances = sorted(
        zip(feature_names, model.feature_importances_), key=lambda kv: kv[1], reverse=True
    )
    print("[i] Top features:")
    for name, score in importances[:10]:
        print(f"    {name:<40} {score:.4f}")

    if auc > 0.98:
        print("\n[!] AUC is suspiciously high - the label may have leaked into the features.")

    # --------------------------------------------------------------- save
    model_path = os.path.join(HERE, "loan_model.joblib")
    prep_path = os.path.join(HERE, "loan_preprocessor.joblib")
    joblib.dump(model, model_path)
    joblib.dump(
        {
            "preprocessor": preprocessor,
            "numeric_features": NUMERIC_FEATURES,
            "categorical_features": CATEGORICAL_FEATURES,
            "feature_cols": FEATURE_COLS,
            "risk_bands": RISK_BANDS,
            "val_auc": float(auc),
            "label_is_synthetic": True,
        },
        prep_path,
    )
    print(f"\n[+] Saved {model_path}")
    print(f"[+] Saved {prep_path}")
    print(
        "\n[i] Inference contract for loan_routes.py - build a one-row DataFrame with columns:\n"
        f"    {FEATURE_COLS}\n"
        "    savings_consistency comes from the member's ledger history, not the request body.\n"
        "    proba = model.predict_proba(preprocessor.transform(df))[0][1]  ->  band via RISK_BANDS"
    )


if __name__ == "__main__":
    main()