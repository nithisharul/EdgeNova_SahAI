# sahAI — From Field to Fund

AI-powered crop advisory + secure SHG portfolio management for rural India.

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## 1. Get the datasets (place in `data/raw/`)

| File | Source |
|---|---|
| `crop_recommendation.csv` | Kaggle: "Crop Recommendation Dataset" (Atharva Ingle) |
| `fertilizer_prediction.csv` | Kaggle: "Fertilizer Prediction" |
| `kiva_loans.csv` | Kaggle: "Data Science for Good: Kiva Crowdfunding" |

Also drop `fertilizer_prediction.csv` (Kaggle: "Fertilizer Prediction") into `data/raw/` for the fertilizer model below.

## 2. Train the models

```bash
python models/train_crop_model.py
python models/train_fertilizer_model.py
python models/train_loan_model.py
```

This saves `crop_model.pt`, `fertilizer_model.pt`, `loan_model.json`
(plus their scalers/encoders) into `models/`.

> Note: `train_fertilizer_model.py` expects columns like `Temparature,
> Humidity, Moisture, Soil Type, Crop Type, Nitrogen, Potassium,
> Phosphorous, Fertilizer Name` (typical for this Kaggle dataset, note
> the dataset's own spelling "Temparature"). It prints your actual CSV
> columns on first run — if they differ, edit the constants at the top
> of the script to match.

> Note: `train_loan_model.py` expects a `status` column in the Kiva CSV
> to derive a repayment label. Check your actual downloaded columns —
> Kiva's schema has varied across dataset versions — and adjust
> `build_target()` if needed. It also adds a **synthetic**
> `savings_consistency` feature since no public SHG-specific dataset
> exists; this is a documented, intentional simplification, not a bug.

## 3. Run the backend

```bash
uvicorn backend.app:app --reload --port 5000
```

Starts a FastAPI server on `http://localhost:5000`, with interactive
docs (Swagger UI) auto-generated at `http://localhost:5000/docs` —
open that in a browser to test every endpoint by hand before wiring
up the frontend. Endpoints:

- `POST /predict-crop` — crop recommendation (with a fallback lookup-table fertilizer note)
- `POST /recommend-fertilizer` — dedicated trained-model fertilizer recommendation (soil/crop specific)
- `POST /request-loan` — loan risk score (currently a lightweight
  placeholder formula — swap in `models/loan_model.json` for the real
  trained model before your demo)
- `POST /ledger/add` — add a savings/loan/repayment entry
- `GET /ledger/verify` — check the hash-chain hasn't been tampered with
- `GET /ledger/all` — view raw ledger
- `GET /member/<id>/portfolio` — one member's savings/loans/net position
- `GET /group/summary` — treasurer-level group totals

## 4. The security demo (this is your live "wow" moment)

```bash
python backend/ledger.py          # writes 3 sample entries, verifies chain
```

To show tamper-detection live:
1. Open `backend/database.db` in a SQLite browser (or via `sqlite3` CLI)
2. Manually edit any `amount` value in the `ledger` table
3. Hit `GET /ledger/verify` — it will return `valid: false` and the
   exact `broken_entry_id` where tampering was introduced

## Project status

- [x] Hash-chain ledger (tested — tamper detection confirmed working)
- [x] Crop MLP training script (needs dataset to run)
- [x] Fertilizer MLP training script (needs dataset to run)
- [x] Loan risk model training script (needs dataset to run)
- [x] Routes split into separate files per feature (backend/routes/)
- [x] Flask API wiring all pieces together
- [ ] Frontend (React Native / Flutter) — connect to the endpoints above
- [ ] Swap placeholder `/request-loan` formula for the trained XGBoost model
- [ ] Treasurer dashboard UI

## Future work (explicitly out of scope for this build)

Voice + fingerprint two-factor authentication, live weather/satellite
data, multilingual fertilizer chatbot, real NABARD bank-linkage sync.
