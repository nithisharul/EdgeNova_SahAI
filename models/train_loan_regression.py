"""
sahAI - SHG Loan Risk SCORE Model (XGBoost Regression)
=======================================================

Companion to models/train_loan_model.py.

    train_loan_model.py        -> CLASSIFICATION : P(high risk), Low / High
    train_loan_regression.py   -> REGRESSION     : continuous risk score 0-100

Pipeline (PBL 1, Unit 1 & 2)
----------------------------
    data/raw/kiva_loans.csv
        |  stage 1: preprocess + feature engineering + continuous target
        v
    data/processed/kiva_loans_risk_regression.csv.gz      <-- "preprocessed data"
        |  stage 2: train / validate / test
        v
    models/loan_risk_regressor.joblib        (XGBRegressor)
    models/loan_risk_regressor_meta.joblib   (preprocessor, bands, metrics)
    models/loan_regression_metrics.json      (numbers for the Slide-20 table)

Stage 2 reads ONLY the processed file. Stage 1 runs automatically if the
processed file is missing (or with --rebuild).

IMPORTANT - READ BEFORE THE VIVA
--------------------------------
Kiva has no repayment / default column, so the regression target is NOT an
observed outcome. It is the SAME documented domain-prior latent risk used by
the classifier (LABEL_WEIGHTS in train_loan_model.py, same seed, same noise
draw, same rows), mapped onto 0-100:

    risk_score = 100 * Phi( (latent - mean) / std )        Phi = normal CDF

Consequences, stated honestly:
Usage (from the project root):
    python models/train_loan_regression.py
    python models/train_loan_regression.py --rebuild --max-rows 0
"""

import argparse
import json
import os
import sys

import joblib
import numpy as np
import pandas as pd
import xgboost as xgb
from scipy.stats import norm
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import (
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# Reuse the classifier's definitions so both models share one source of truth.
import train_loan_model as base  # noqa: E402  (import after sys.path tweak)

PROJECT_ROOT = base.PROJECT_ROOT
PROCESSED_DIR = os.path.join(PROJECT_ROOT, "data", "processed")
PROCESSED_PATH = os.path.join(PROCESSED_DIR, "kiva_loans_risk_regression.csv.gz")
DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")

SEED = base.SEED
NUMERIC_FEATURES = base.NUMERIC_FEATURES
CATEGORICAL_FEATURES = base.CATEGORICAL_FEATURES
FEATURE_COLS = base.FEATURE_COLS
TARGET = "risk_score"

# Band quantiles of the risk-score distribution. HIGH = top POSITIVE_RATE (25%),
# identical to the classifier's positive class; LOW = bottom half.
LOW_QUANTILE = 0.50


# --------------------------------------------------------------------------
# Stage 1 - preprocessing
# --------------------------------------------------------------------------
def continuous_latent(df, rng, noise_sigma):
    """Same latent as base.build_risk_label, but returned continuous.

    Must consume `rng` in the same order as the classifier (beta -> normal) so
    the noise draw, and therefore the rows' risk, is identical.
    """
    funded_ratio = (df["funded_amount"] / df["loan_amount"].replace(0, np.nan)).fillna(0).clip(0, 1)
    sector_effect = df["sector"].map(base.SECTOR_BASE_RATES).fillna(0.0)
    w = base.LABEL_WEIGHTS
    z = base.zscore
    latent = (
        w["loan_amount"] * z(np.log1p(df["loan_amount"]))
        + w["term_in_months"] * z(df["term_in_months"])
        + w["funded_shortfall"] * z(1.0 - funded_ratio)
        + w["savings_consistency"] * z(df["savings_consistency"])
        + w["installment_burden"] * z(np.log1p(df["monthly_installment"]))
        + w["sector"] * z(sector_effect)
        + rng.normal(0, noise_sigma, len(df))
    )
    return np.asarray(latent, dtype=float), funded_ratio


def build_processed(args):
    rng = np.random.default_rng(SEED)
    csv_path = base.find_csv(args.csv)
    print(f"[1/2] Reading raw Kiva data: {csv_path}")
    df = pd.read_csv(csv_path, usecols=lambda c: c.strip() in base.USECOLS, low_memory=False)
    df.columns = [c.strip() for c in df.columns]
    missing = [c for c in base.USECOLS if c not in df.columns]
    if missing:
        sys.exit(f"[!] Missing expected Kiva columns: {missing}")

    n_raw = len(df)
    df = df.dropna(subset=["loan_amount", "funded_amount", "term_in_months", "sector"])
    df = df[(df["loan_amount"] > 0) & (df["term_in_months"] > 0)]
    print(f"      raw rows {n_raw:,} -> usable {len(df):,}")

    if args.max_rows and len(df) > args.max_rows:
        df = df.sample(args.max_rows, random_state=SEED)
        print(f"      subsampled to {len(df):,} rows (same rows as the classifier)")

    df = df.reset_index(drop=True)
    df["repayment_interval"] = df["repayment_interval"].fillna("unknown").astype(str).str.strip()
    df["sector"] = df["sector"].astype(str).str.strip()
    df = pd.concat([df, base.parse_borrower_genders(df["borrower_genders"])], axis=1)
    df["savings_consistency"] = rng.beta(5, 2, len(df)).round(3)   # synthetic - see docstring
    df = base.engineer_features(df)

    latent, funded_ratio = continuous_latent(df, rng, args.noise)
    mu, sd = float(latent.mean()), float(latent.std())
    df["risk_latent"] = latent
    df[TARGET] = 100.0 * norm.cdf((latent - mu) / sd)
    df["funded_ratio"] = funded_ratio.values

    out = df[FEATURE_COLS + ["risk_latent", TARGET]].copy()
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    out.to_csv(PROCESSED_PATH, index=False, compression="gzip", float_format="%.5f")
    joblib.dump({"latent_mean": mu, "latent_std": sd, "noise_sigma": args.noise},
                os.path.join(PROCESSED_DIR, "kiva_loans_risk_regression.meta.joblib"))
    print(f"      saved processed dataset -> {os.path.relpath(PROCESSED_PATH, PROJECT_ROOT)} "
          f"({len(out):,} rows, {os.path.getsize(PROCESSED_PATH) / 1e6:.1f} MB)")
    return out, mu, sd


def load_processed():
    df = pd.read_csv(PROCESSED_PATH)
    meta = joblib.load(os.path.join(PROCESSED_DIR, "kiva_loans_risk_regression.meta.joblib"))
    return df, meta["latent_mean"], meta["latent_std"], meta["noise_sigma"]


# --------------------------------------------------------------------------
# Stage 2 - training / evaluation
# --------------------------------------------------------------------------
def reg_metrics(y_true, y_pred):
    return {
        "r2": float(r2_score(y_true, y_pred)),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
    }


def band_for_score(score, bands):
    for cutoff, label in bands:
        if score < cutoff:
            return label
    return bands[-1][1]


def make_plot(y_true, y_pred, path):
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except Exception:
        print("[i] matplotlib not available - skipping plot")
        return False
    fig, ax = plt.subplots(1, 2, figsize=(11, 4.4))
    idx = np.random.default_rng(0).choice(len(y_true), min(4000, len(y_true)), replace=False)
    ax[0].scatter(y_true[idx], y_pred[idx], s=5, alpha=0.35)
    ax[0].plot([0, 100], [0, 100], "r--", lw=1)
    ax[0].set_xlabel("Actual risk score (domain target)")
    ax[0].set_ylabel("Predicted risk score")
    ax[0].set_title("Predicted vs actual (test set)")
    ax[1].hist(y_true - y_pred, bins=60, color="#4a7")
    ax[1].set_xlabel("Residual (actual - predicted)")
    ax[1].set_title("Residual distribution")
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)
    return True


def main():
    p = argparse.ArgumentParser(description="Train the sahAI loan risk-score regressor.")
    p.add_argument("--csv", default=None, help="raw Kiva CSV (only used when (re)building)")
    p.add_argument("--rebuild", action="store_true", help="re-run preprocessing even if processed file exists")
    p.add_argument("--max-rows", type=int, default=200_000, help="0 = use all rows")
    p.add_argument("--noise", type=float, default=base.NOISE_SIGMA_DEFAULT)
    p.add_argument("--n-estimators", type=int, default=800)
    p.add_argument("--max-depth", type=int, default=5)
    p.add_argument("--lr", type=float, default=0.05)
    args = p.parse_args()

    meta_file = os.path.join(PROCESSED_DIR, "kiva_loans_risk_regression.meta.joblib")
    if args.rebuild or not (os.path.exists(PROCESSED_PATH) and os.path.exists(meta_file)):
        df, mu, sd = build_processed(args)
        noise = args.noise
    else:
        print(f"[1/2] Using existing processed data: {os.path.relpath(PROCESSED_PATH, PROJECT_ROOT)}")
        df, mu, sd, noise = load_processed()

    print(f"[2/2] Training on {len(df):,} preprocessed rows")
    X, y = df[FEATURE_COLS], df[TARGET].values
    print(f"      target risk_score: mean {y.mean():.1f}  std {y.std():.1f}  "
          f"min {y.min():.1f}  max {y.max():.1f}")

    # 70 / 15 / 15 : train (fit) / val (early stopping) / test (reported once)
    X_tr, X_tmp, y_tr, y_tmp = train_test_split(X, y, test_size=0.30, random_state=SEED)
    X_val, X_te, y_val, y_te = train_test_split(X_tmp, y_tmp, test_size=0.50, random_state=SEED)
    print(f"      split: train {len(X_tr):,} / val {len(X_val):,} / test {len(X_te):,}")

    preprocessor = ColumnTransformer([
        ("num", StandardScaler(), NUMERIC_FEATURES),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
    ])
    Xtr_t = preprocessor.fit_transform(X_tr)       # fit on train only - no leakage
    Xval_t = preprocessor.transform(X_val)
    Xte_t = preprocessor.transform(X_te)
    feature_names = list(preprocessor.get_feature_names_out())
    print(f"      encoded feature width: {Xtr_t.shape[1]}")

    # ---- baselines -------------------------------------------------------
    mean_model = DummyRegressor(strategy="mean").fit(Xtr_t, y_tr)
    ridge = Ridge(alpha=1.0).fit(Xtr_t, y_tr)

    # ---- XGBoost regressor ----------------------------------------------
    model = xgb.XGBRegressor(
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        learning_rate=args.lr,
        subsample=0.85,
        colsample_bytree=0.85,
        min_child_weight=5,
        reg_lambda=1.5,
        gamma=0.1,
        objective="reg:squarederror",
        eval_metric="rmse",
        early_stopping_rounds=50,
        tree_method="hist",
        random_state=SEED,
        n_jobs=-1,
    )
    print("      training XGBRegressor...")
    model.fit(Xtr_t, y_tr, eval_set=[(Xval_t, y_val)], verbose=100)

    results = {}
    for name, m in [("Mean baseline", mean_model), ("Ridge (linear)", ridge), ("XGBoost Regressor", model)]:
        pred = np.clip(m.predict(Xte_t), 0, 100)
        results[name] = reg_metrics(y_te, pred)
    pred_te = np.clip(model.predict(Xte_t), 0, 100)
    pred_val = np.clip(model.predict(Xval_t), 0, 100)

    print("\n=== TEST-SET REGRESSION METRICS (risk score, 0-100 scale) ===")
    print(f"{'Model':<22}{'R2':>9}{'MAE':>9}{'RMSE':>9}")
    for name, r in results.items():
        print(f"{name:<22}{r['r2']:>9.4f}{r['mae']:>9.3f}{r['rmse']:>9.3f}")

    # ---- risk bands from the TRAINING target distribution ----------------
    low_cut = float(np.quantile(y_tr, LOW_QUANTILE))
    high_cut = float(np.quantile(y_tr, 1.0 - base.POSITIVE_RATE))
    bands = [(round(low_cut, 1), "LOW"), (round(high_cut, 1), "MEDIUM"), (100.01, "HIGH")]
    print(f"\n[i] Risk bands (from train target quantiles): {bands}")

    true_band = np.array([band_for_score(s, bands) for s in y_te])
    pred_band = np.array([band_for_score(s, bands) for s in pred_te])
    band_acc = float((true_band == pred_band).mean())
    order = {"LOW": 0, "MEDIUM": 1, "HIGH": 2}
    off_by_two = float((np.abs(np.vectorize(order.get)(true_band)
                               - np.vectorize(order.get)(pred_band)) == 2).mean())
    print(f"[i] Band agreement (pred vs true band): {band_acc:.1%}   "
          f"LOW<->HIGH confusions: {off_by_two:.2%}")

    # ---- classification view of the regressor (HIGH vs not) --------------
    y_te_high = (y_te >= high_cut).astype(int)
    pred_high = (pred_te >= high_cut).astype(int)
    cls = {
        "roc_auc": float(roc_auc_score(y_te_high, pred_te)),
        "precision": float(precision_score(y_te_high, pred_high, zero_division=0)),
        "recall": float(recall_score(y_te_high, pred_high, zero_division=0)),
        "f1": float(f1_score(y_te_high, pred_high, zero_division=0)),
    }
    print(f"[i] Regressor used as HIGH-risk detector (score >= {high_cut:.1f}): "
          f"AUC {cls['roc_auc']:.4f}  P {cls['precision']:.3f}  R {cls['recall']:.3f}  F1 {cls['f1']:.3f}")

    # ---- feature importance ---------------------------------------------
    importances = sorted(zip(feature_names, model.feature_importances_), key=lambda kv: kv[1], reverse=True)
    print("\n[i] Top features (reflect LABEL_WEIGHTS, not a real-world discovery):")
    for n, s in importances[:8]:
        print(f"    {n:<40} {s:.4f}")

    # ---- noise ceiling: R2 achievable if the model knew everything except noise
    # Informational: share of target variance that is irreducible given the
    # features the API can supply (noise + funded_shortfall).
    print(f"\n[i] Best iteration: {getattr(model, 'best_iteration', 'n/a')}")
    if results["XGBoost Regressor"]["r2"] > 0.995:
        print("[!] R2 suspiciously high - check for leakage of target inputs into features.")

    # ---- save ------------------------------------------------------------
    model_path = os.path.join(HERE, "loan_risk_regressor.joblib")
    meta_path = os.path.join(HERE, "loan_risk_regressor_meta.joblib")
    metrics_path = os.path.join(HERE, "loan_regression_metrics.json")

    metrics = {
        "n_rows": int(len(df)),
        "split": {"train": int(len(X_tr)), "val": int(len(X_val)), "test": int(len(X_te))},
        "target": {"mean": float(y.mean()), "std": float(y.std()),
                   "min": float(y.min()), "max": float(y.max())},
        "test_regression": results,
        "risk_bands": bands,
        "band_agreement": band_acc,
        "low_high_confusion_rate": off_by_two,
        "regressor_as_high_risk_classifier": cls,
        "best_iteration": int(getattr(model, "best_iteration", -1)),
        "top_features": [(n, float(s)) for n, s in importances[:10]],
        "label_is_synthetic": True,
    }
    joblib.dump(model, model_path)
    joblib.dump({
        "preprocessor": preprocessor,
        "numeric_features": NUMERIC_FEATURES,
        "categorical_features": CATEGORICAL_FEATURES,
        "feature_cols": FEATURE_COLS,
        "risk_bands": bands,
        "score_range": (0.0, 100.0),
        "latent_mean": mu,
        "latent_std": sd,
        "noise_sigma": noise,
        "test_metrics": results["XGBoost Regressor"],
        "label_weights": base.LABEL_WEIGHTS,
        "label_is_synthetic": True,
    }, meta_path)
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)

    os.makedirs(DOCS_DIR, exist_ok=True)
    plot_path = os.path.join(DOCS_DIR, "loan_regression_pred_vs_actual.png")
    plotted = make_plot(y_te, pred_te, plot_path)

    print(f"\n[+] Saved {model_path}")
    print(f"[+] Saved {meta_path}")
    print(f"[+] Saved {metrics_path}")
    if plotted:
        print(f"[+] Saved {plot_path}")
    print("\n[i] Inference contract: same 10 feature columns as the classifier;")
    print("    score = clip(model.predict(preprocessor.transform(row))[0], 0, 100)")


if __name__ == "__main__":
    main()
