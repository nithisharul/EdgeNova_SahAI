# Loan Risk Score — Regression Model (PBL 1)

Regression counterpart to the XGBoost classifier. Predicts a continuous **risk score 0–100**, then maps it to LOW / MEDIUM / HIGH.

## Run
```bash
python models/train_loan_regression.py            # uses data/processed/ if present, else builds it from data/raw/kiva_loans.csv
python models/train_loan_regression.py --rebuild  # force re-preprocessing
```
Pipeline: `kiva_loans.csv → feature engineering + target → data/processed/kiva_loans_risk_regression.csv.gz → train/val/test → models/loan_risk_regressor.joblib`

## Results (200,000 rows; 140k train / 30k val / 30k test; test set used once)
| Model | R² | MAE | RMSE |
|---|---|---|---|
| Mean baseline | -0.0001 | 24.50 | 28.39 |
| Ridge (linear) | 0.7354 | 11.23 | 14.61 |
| **XGBoost Regressor** | **0.7481** | **10.78** | **14.25** |

Bands (from training-target quantiles): LOW < 46.5 ≤ MEDIUM < 72.5 ≤ HIGH (HIGH = top 25%, same positive rate as the classifier).
Band agreement with target band: 74.1%; LOW↔HIGH confusions: 1.23%.
Regressor used as HIGH-risk detector: ROC-AUC 0.929, precision 0.811, recall 0.668, F1 0.732.

Retrained with XGBoost 3.4 so the saved model loads on current XGBoost (the earlier 3.2 pickle did not); data and target are unchanged, and Baseline/Ridge are identical to the earlier run. The first ML-PBL run reported XGBoost R² 0.7476 / MAE 10.79 / RMSE 14.26.

Plot: `docs/loan_regression_pred_vs_actual.png`. Raw numbers: `models/loan_regression_metrics.json`.

## API
`POST /request-loan` keeps every existing field and adds a `regression` block:
`risk_score_100`, `risk_band`, `band_cutoffs`, and model test metrics. It is `null` if the regressor has not been trained.

## Limitations (say these in the viva)
* Kiva has no repayment/default column. The target is the same domain-prior latent used by the classifier (`LABEL_WEIGHTS`), mapped to 0–100 with a normal CDF. R² measures recovery of that domain score, **not** real default prediction.
* `savings_consistency` is randomly generated (Beta(5,2)) in training; at inference it comes from the member's ledger.
* The target includes label noise and a `funded_shortfall` term that are unavailable at request time, so R² is capped well below 1.0 by design. Ridge being close to XGBoost shows the target is nearly linear in the features.
* Feature importances mirror `LABEL_WEIGHTS`; they are not discoveries about lending.
