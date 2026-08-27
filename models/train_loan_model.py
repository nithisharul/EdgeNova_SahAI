"""
Train a loan repayment-risk classifier.

Dataset: Kiva Loans Dataset (Kaggle: "Data Science for Good: Kiva Crowdfunding")
Place the CSV at: data/raw/kiva_loans.csv

NOTE: Kiva's public dataset does not include an SHG-specific "savings
consistency" feature -- we simulate one synthetically on top of real
loan records, and say so explicitly in the pitch. This is a documented
limitation, not something to hide.

Run with: python models/train_loan_model.py
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report
import xgboost as xgb

DATA_PATH = os.path.join("data", "raw", "kiva_loans.csv")
MODEL_OUT = os.path.join("models", "loan_model.json")
ENCODER_OUT = os.path.join("models", "loan_sector_encoder.pkl")

RANDOM_STATE = 42


def load_data():
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"Couldn't find {DATA_PATH}. Download kiva_loans.csv from Kaggle "
            f"('Data Science for Good: Kiva Crowdfunding') and place it there."
        )
    df = pd.read_csv(DATA_PATH, low_memory=False)
    return df


def build_target(df):
    """
    Kiva doesn't ship a clean binary 'defaulted' label out of the box in
    every version of the dataset. If your download has a `status` column
    (funded / expired / etc.) or a repayment-related field, adapt this
    function to derive a binary on-time-repayment label from it.
    Here we fall back to a reasonable proxy if `status` exists.
    """
    if "status" in df.columns:
        df = df[df["status"].isin(["funded", "expired"])].copy()
        df["target"] = (df["status"] == "funded").astype(int)
    else:
        raise ValueError(
            "No 'status' column found. Check your Kiva CSV's columns and "
            "adjust build_target() to derive a repayment/risk label."
        )
    return df


def engineer_features(df):
    df = df.copy()

    keep_cols = ["loan_amount", "term_in_months", "lender_count", "sector", "repayment_interval"]
    keep_cols = [c for c in keep_cols if c in df.columns]
    df = df.dropna(subset=keep_cols + ["target"])

    # Synthetic savings-consistency feature (0-1), simulating an SHG
    # member's contribution regularity. Documented assumption -- not
    # present in the real Kiva data.
    rng = np.random.default_rng(RANDOM_STATE)
    df["savings_consistency"] = rng.beta(a=5, b=2, size=len(df))  # skewed toward consistent savers

    sector_encoder = LabelEncoder()
    if "sector" in df.columns:
        df["sector_enc"] = sector_encoder.fit_transform(df["sector"].astype(str))
    else:
        df["sector_enc"] = 0

    if "repayment_interval" in df.columns:
        df["repayment_interval_enc"] = LabelEncoder().fit_transform(df["repayment_interval"].astype(str))
    else:
        df["repayment_interval_enc"] = 0

    feature_cols = [c for c in ["loan_amount", "term_in_months", "lender_count",
                                 "sector_enc", "repayment_interval_enc",
                                 "savings_consistency"] if c in df.columns]

    return df, feature_cols, sector_encoder


def main():
    df = load_data()
    df = build_target(df)
    df, feature_cols, sector_encoder = engineer_features(df)

    print(f"Training on {len(df)} rows with features: {feature_cols}")

    X = df[feature_cols].values
    y = df["target"].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    # class weighting to handle imbalance
    pos = y_train.sum()
    neg = len(y_train) - pos
    scale_pos_weight = neg / max(pos, 1)

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
        random_state=RANDOM_STATE,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=["High/Med Risk", "Low Risk"]))

    os.makedirs("models", exist_ok=True)
    model.save_model(MODEL_OUT)
    joblib.dump(sector_encoder, ENCODER_OUT)
    print(f"\nSaved model -> {MODEL_OUT}")
    print(f"Saved sector encoder -> {ENCODER_OUT}")


if __name__ == "__main__":
    main()
