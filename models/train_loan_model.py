"""
sahAI - SHG Loan Repayment Risk Model (XGBoost)  [v2]
=====================================================

Trains a binary classifier that scores how risky a proposed SHG loan is.

Dataset : "Kiva Loans" (Kaggle, public) - kiva_loans.csv

IMPORTANT - READ BEFORE THE DEMO
--------------------------------
The Kiva dataset contains NO repayment or default outcome column. There is no
ground-truth label to learn. This script constructs a *documented synthetic
risk label* from real Kiva signals, and trains on features the sahAI app can
actually supply at request time.

Because the label is synthetic, the model's feature importances are a readout
of the weights in LABEL_WEIGHTS below - NOT an empirical discovery about
lending. Say "we encoded a domain prior from SHG microfinance practice", never
"the model discovered that savings consistency matters".

WHAT CHANGED FROM v1
--------------------
1. All label terms are now z-scored before weighting. In v1, savings_consistency
   was weighted on its raw 0-1 scale (std ~0.16) while loan_amount and term were
   weighted on z-scores (std 1.0), so it was ~2.5x underweighted by a units
   mismatch rather than by intent. Weights are now directly comparable.
2. Added three engineered features the app can compute at request time:
   monthly_installment, loan_per_borrower, log_loan_amount. Affordability per
   period is closer to what actually strains a household than headline size.
3. Dropped scale_pos_weight in favour of tuning the decision threshold on the
   validation set. scale_pos_weight distorts predicted probabilities, which
   matters because the treasurer UI shows a probability, not just a flag.
   Raw probabilities are now roughly calibrated and the threshold does the
   precision/recall trade explicitly.
4. Risk bands are derived from validation quantiles around the tuned threshold
   instead of hardcoded 0.35 / 0.65.

Usage (from the sahAI project root):
    python models/train_loan_model.py
    python models/train_loan_model.py --max-rows 0 --noise 0.55

Outputs (written to models/):
    loan_model.joblib          - trained XGBClassifier
    loan_preprocessor.joblib   - ColumnTransformer + threshold + band metadata
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
from sklearn.metrics import (
    brier_score_loss,
    classification_report,
    precision_recall_curve,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

SEED = 42
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(HERE)
RAW_DIR = os.path.join(PROJECT_ROOT, "data", "raw")

USECOLS = [
    "funded_amount",
    "loan_amount",
    "sector",
    "term_in_months",
    "lender_count",
    "repayment_interval",
    "borrower_genders",
]

# ---------------------------------------------------------------------------
# Label weights. Every term is z-scored first, so these numbers are directly
# comparable to each other: a weight of 0.70 pushes risk twice as hard as 0.35.
# This block IS the domain prior. Change it deliberately and state it out loud.
# ---------------------------------------------------------------------------
LABEL_WEIGHTS = {
    "loan_amount": 0.45,           # bigger loans strain repayment capacity
    "term_in_months": 0.30,        # longer exposure, more chance of a shock
    "funded_shortfall": 0.50,      # crowd confidence; weak in Kiva (see note below)
    "savings_consistency": -0.70,  # DOMINANT protective factor - the SHG's own signal
    "installment_burden": 0.35,    # per-period affordability
    "sector": 0.25,
}
NOISE_SIGMA_DEFAULT = 0.55  # irreducible noise; lowering this inflates AUC artificially
POSITIVE_RATE = 0.25

# What the model trains on == what POST /request-loan must be able to build.
NUMERIC_FEATURES = [
    "loan_amount",
    "log_loan_amount",
    "term_in_months",
    "monthly_installment",
    "loan_per_borrower",
    "num_borrowers",
    "female_ratio",
    "savings_consistency",
]
CATEGORICAL_FEATURES = ["sector", "repayment_interval"]
FEATURE_COLS = NUMERIC_FEATURES + CATEGORICAL_FEATURES

SECTOR_BASE_RATES = {
    "Agriculture": 0.25, "Food": 0.10, "Retail": 0.05, "Services": 0.00,
    "Clothing": 0.05, "Housing": 0.30, "Education": 0.20, "Health": 0.15,
    "Arts": 0.15, "Transportation": 0.10, "Construction": 0.30,
    "Manufacturing": 0.15, "Personal Use": 0.35, "Entertainment": 0.25,
    "Wholesale": 0.10,
}


def find_csv(explicit):
    if explicit:
        if not os.path.exists(explicit):
            sys.exit(f"[!] CSV not found: {explicit}")
        return explicit
    hits = [c for c in glob.glob(os.path.join(RAW_DIR, "*.csv"))
            if "kiva" in os.path.basename(c).lower()
            and "theme" not in os.path.basename(c).lower()]
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        sys.exit("[!] Multiple Kiva CSVs found, pass one with --csv:\n    " + "\n    ".join(hits))
    sys.exit(f"[!] No kiva_loans.csv found in {RAW_DIR}. Pass --csv <path>.")


def parse_borrower_genders(series):
    split = series.fillna("").astype(str).str.lower().str.split(",")
    num = split.apply(lambda parts: sum(1 for p in parts if p.strip())).replace(0, 1)
    fem = split.apply(lambda parts: sum(1 for p in parts if p.strip() == "female"))
    return pd.DataFrame({"num_borrowers": num, "female_ratio": (fem / num).clip(0, 1)})


def zscore(s):
    s = pd.Series(np.asarray(s, dtype=float))
    std = s.std()
    return (s - s.mean()) / (std if std and std > 0 else 1.0)


def engineer_features(df):
    """Derived features. Every one is computable from a loan request at API time."""
    df = df.copy()
    df["log_loan_amount"] = np.log1p(df["loan_amount"])
    df["monthly_installment"] = df["loan_amount"] / df["term_in_months"].clip(lower=1)
    df["loan_per_borrower"] = df["loan_amount"] / df["num_borrowers"].clip(lower=1)
    return df


def build_risk_label(df, rng, noise_sigma):
    """Synthesise a defensible risk label. See module docstring."""
    funded_ratio = (df["funded_amount"] / df["loan_amount"].replace(0, np.nan)).fillna(0).clip(0, 1)
    sector_effect = df["sector"].map(SECTOR_BASE_RATES).fillna(0.0)

    w = LABEL_WEIGHTS
    latent = (
        w["loan_amount"] * zscore(np.log1p(df["loan_amount"]))
        + w["term_in_months"] * zscore(df["term_in_months"])
        + w["funded_shortfall"] * zscore(1.0 - funded_ratio)
        + w["savings_consistency"] * zscore(df["savings_consistency"])
        + w["installment_burden"] * zscore(np.log1p(df["monthly_installment"]))
        + w["sector"] * zscore(sector_effect)
        + rng.normal(0, noise_sigma, len(df))
    )
    threshold = np.quantile(latent, 1.0 - POSITIVE_RATE)
    return (latent >= threshold).astype(int).values, funded_ratio


def tune_threshold(y_true, proba):
    """Pick the decision threshold that maximises F1 on the high-risk class."""
    prec, rec, thr = precision_recall_curve(y_true, proba)
    f1 = np.divide(2 * prec * rec, prec + rec, out=np.zeros_like(prec), where=(prec + rec) > 0)
    if len(thr) == 0:
        return 0.5, 0.0
    best = int(np.argmax(f1[:-1]))
    return float(thr[best]), float(f1[best])


def main():
    p = argparse.ArgumentParser(description="Train the sahAI loan risk model.")
    p.add_argument("--csv", default=None)
    p.add_argument("--max-rows", type=int, default=200_000, help="0 = use all rows")
    p.add_argument("--n-estimators", type=int, default=800)
    p.add_argument("--max-depth", type=int, default=6)
    p.add_argument("--lr", type=float, default=0.05)
    p.add_argument("--noise", type=float, default=NOISE_SIGMA_DEFAULT,
                   help="label noise sigma; lowering this inflates AUC and is not a real gain")
    args = p.parse_args()

    rng = np.random.default_rng(SEED)

    csv_path = find_csv(args.csv)
    print(f"[i] Reading {csv_path} (this file is large, give it a moment)")
    df = pd.read_csv(csv_path, usecols=lambda c: c.strip() in USECOLS, low_memory=False)
    df.columns = [c.strip() for c in df.columns]

    missing = [c for c in USECOLS if c not in df.columns]
    if missing:
        sys.exit(f"[!] Missing expected Kiva columns: {missing}")

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
    df["savings_consistency"] = rng.beta(5, 2, len(df)).round(3)
    df = engineer_features(df)

    y, funded_ratio = build_risk_label(df, rng, args.noise)
    print(f"[i] Synthetic label balance: high-risk {y.mean():.1%} / low-risk {1 - y.mean():.1%}")
    print(f"[i] funded_ratio mean {funded_ratio.mean():.3f} "
          f"(std {funded_ratio.std():.3f}) - label only, NOT a feature")
    if funded_ratio.std() < 0.10:
        print("[!] funded_ratio has very little variance in this dataset, so it carries")
        print("    less real signal than its weight implies. Most unpredictability in the")
        print("    label comes from the noise term. Be upfront about this if asked.")

    X = df[FEATURE_COLS]
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=SEED, stratify=y
    )

    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), NUMERIC_FEATURES),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
    ])
    X_train_t = preprocessor.fit_transform(X_train)
    X_val_t = preprocessor.transform(X_val)
    feature_names = list(preprocessor.get_feature_names_out())
    print(f"[i] Feature vector width after encoding: {X_train_t.shape[1]}")

    # NOTE: no scale_pos_weight - we want calibrated probabilities and tune the
    # threshold instead. See module docstring, change 3.
    model = xgb.XGBClassifier(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        learning_rate=args.lr,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=5,
        reg_lambda=1.5,
        gamma=0.1,
        objective="binary:logistic",
        eval_metric="auc",
        early_stopping_rounds=50,
        tree_method="hist",
        random_state=SEED,
        n_jobs=-1,
    )
    print("[i] Training XGBoost...")
    model.fit(X_train_t, y_train, eval_set=[(X_val_t, y_val)], verbose=100)

    proba = model.predict_proba(X_val_t)[:, 1]
    auc = roc_auc_score(y_val, proba)
    brier = brier_score_loss(y_val, proba)
    thr, best_f1 = tune_threshold(y_val, proba)

    print(f"\n[i] Validation ROC-AUC : {auc:.4f}")
    print(f"[i] Brier score        : {brier:.4f}  (lower = better calibrated probabilities)")
    print(f"[i] Tuned threshold    : {thr:.3f}  (default 0.500), best F1 {best_f1:.4f}")

    print("\n--- at default threshold 0.50 ---")
    print(classification_report(y_val, (proba >= 0.5).astype(int),
                                target_names=["low risk", "high risk"], zero_division=0))
    print("--- at tuned threshold (what the API will use) ---")
    print(classification_report(y_val, (proba >= thr).astype(int),
                                target_names=["low risk", "high risk"], zero_division=0))

    # Bands: anchor MEDIUM around the tuned threshold using validation quantiles.
    low_cut = float(np.quantile(proba, 0.60))
    risk_bands = [(round(min(low_cut, thr * 0.75), 3), "LOW"),
                  (round(thr, 3), "MEDIUM"),
                  (1.01, "HIGH")]
    print(f"[i] Risk bands: {risk_bands}")

    importances = sorted(zip(feature_names, model.feature_importances_),
                         key=lambda kv: kv[1], reverse=True)
    print("\n[i] Top features:")
    for name, score in importances[:10]:
        print(f"    {name:<40} {score:.4f}")

    sc_rank = [i for i, (n, _) in enumerate(importances) if "savings_consistency" in n]
    if sc_rank and sc_rank[0] > 2:
        print(f"\n[!] savings_consistency ranked #{sc_rank[0] + 1}. It is meant to be a")
        print("    dominant factor - check LABEL_WEIGHTS if that looks wrong.")
    if auc > 0.98:
        print("\n[!] AUC suspiciously high - check for label leakage into features.")

    model_path = os.path.join(HERE, "loan_model.joblib")
    prep_path = os.path.join(HERE, "loan_preprocessor.joblib")
    joblib.dump(model, model_path)
    joblib.dump({
        "preprocessor": preprocessor,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "feature_cols": FEATURE_COLS,
        "risk_bands": risk_bands,
        "decision_threshold": thr,
        "val_auc": float(auc),
        "val_brier": float(brier),
        "label_weights": LABEL_WEIGHTS,
        "label_is_synthetic": True,
    }, prep_path)

    print(f"\n[+] Saved {model_path}")
    print(f"[+] Saved {prep_path}")
    print("\n[i] Inference contract for loan_routes.py:")
    print("    Build a one-row DataFrame with these columns:")
    print(f"    {FEATURE_COLS}")
    print("    log_loan_amount / monthly_installment / loan_per_borrower are DERIVED -")
    print("    import engineer_features from this module or recompute identically.")
    print("    savings_consistency comes from the member's ledger history.")
    print("    proba = model.predict_proba(preprocessor.transform(row))[0][1]")
    print("    flag  = proba >= meta['decision_threshold']   # not 0.5")


if __name__ == "__main__":
    main()