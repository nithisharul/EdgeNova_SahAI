# SahAI — Frontend ↔ Backend Gap Analysis

**Repository:** `EdgeNova_SahAI`
**Branch analysed:** `secure-connect-prototype` @ `3e34621` ("Secure Development")
**Date:** 27 August 2026
**Status:** Analysis only — no code was modified, committed or pushed.

> **Branch naming note.** No branch named exactly `SecureConnectPrototype` exists on the
> remote. Two branches exist at the **same commit** `3e34621`:
> `secure-connect-prototype` and `secure_prototype`. Because both point at identical
> code there is no ambiguity about *what* was analysed. This report uses
> `secure-connect-prototype`. **No new branch was created.** The team should agree on
> one canonical name and delete the duplicate.

---

## 1. Executive Summary

The frontend and backend are both individually functional, but **they have never been
connected**. This is not a case of small field mismatches on top of a working
integration — there is currently no integration at all.

### The five findings that matter

| # | Finding | Severity |
|---|---------|----------|
| 1 | The frontend contains **zero HTTP calls**. `grep` for `fetch(` / `axios` across `app/`, `components/` and `services/` returns nothing. Every service resolves canned data. | **BLOCKER** |
| 2 | The frontend has **no authentication code whatsoever** — no login, no token storage, no `Authorization` header, no 401 handling. Six backend endpoints require a JWT. | **BLOCKER** |
| 3 | The **crop model artifacts are not committed**. `.gitignore` excludes `models/*.pt` and `models/*.pkl`, which is exactly what the crop model saves. A fresh clone cannot serve `/predict-crop`. | **BLOCKER** |
| 4 | **Six of the fifteen data-backed screens have no backend endpoint at all** — members list, transactions list, loans list, finance summary, crop health, my land. | **BLOCKER** |
| 5 | The endpoint paths configured in the frontend **do not match any backend route**, and the port differs from the documented one. | **HIGH** |

### What is genuinely in good shape

- The **backend is coherent and complete for what it covers**: real PBKDF2 password
  hashing, real JWT with role-based access, a real SHA-256 hash-chained ledger, and
  two working ML pipelines with a carefully written crop→fertilizer vocabulary bridge.
- The **frontend is internally consistent**. Its mock modules cross-import from single
  sources rather than copy-pasting figures, so there is no drift *within* the frontend.
- The **crop recommendation form already matches the model's technical contract**
  (see §8.1). The farmer-friendly redesign that this analysis was asked to check for
  **has not been applied on this branch**.

### Scale of the gap

| Measure | Count |
|---|---|
| Backend endpoints implemented | 13 |
| Backend endpoints the frontend is configured to call | 4 (all paths wrong) |
| Backend endpoints the frontend actually calls | **0** |
| Frontend screens with a data dependency | 15 |
| Frontend screens backed by a real endpoint today | **0** |
| Frontend screens for which *no* backend endpoint exists | 6 |

---

## 2. Current System Architecture

### As it exists today

```
┌────────────────────────────────────────────┐
│  React Native / Expo frontend              │
│                                            │
│  Screens (app/)                            │
│        ↓                                   │
│  Services (services/*.js)                  │
│        ↓                                   │
│  Mock modules (data/mock*.js)              │
│                                            │
│  Config.USE_MOCK_DATA = true               │
│  fetch() calls: NONE                       │
└────────────────────────────────────────────┘

              ✗  NO CONNECTION  ✗
        (no HTTP client, no auth, no
         matching endpoint paths)

┌────────────────────────────────────────────┐
│  FastAPI backend (backend/app.py)          │
│                                            │
│  13 routes across 6 routers                │
│        ↓                                   │
│  ┌───────────┬───────────┬──────────────┐  │
│  │ SQLite    │ ML models │ ledger.py    │  │
│  │ users,    │ crop*,    │ SHA-256      │  │
│  │ ledger    │ fert,loan │ chain        │  │
│  └───────────┴───────────┴──────────────┘  │
└────────────────────────────────────────────┘

* crop model artifacts are NOT in the repository
```

### Target architecture

```
React Native / Expo frontend
        ↓
Service layer  (adapters: snake_case ↔ camelCase)
        ↓
Auth layer     (login → JWT → Bearer header → 401 retry)
        ↓
FastAPI
        ↓
┌──────────────┬──────────────┬──────────────┐
│  SQLite      │  ML models   │  ledger.py   │
│  users,      │  crop,       │  SHA-256     │
│  ledger      │  fertilizer, │  chain +     │
│              │  loan risk   │  verify      │
└──────────────┴──────────────┴──────────────┘
```

### Repository structure (actual)

| Path | Present | Contents |
|---|---|---|
| `frontend/` | Yes | Expo app — `app/`, `components/`, `services/`, `data/`, `constants/`, `utils/` |
| `backend/` | Yes | FastAPI — `app.py`, `auth.py`, `ledger.py`, `models/`, `routes/`, `services/` |
| `models/` | Yes | 3 training scripts; fertilizer + loan artifacts committed, **crop artifacts not** |
| `data/` | Yes | `raw/README.md` and `.gitkeep` only — **no datasets committed** (`data/raw/*.csv` is gitignored) |
| `docs/` | Yes | `.gitkeep` only (this report is the first document) |
| `notebooks/` | Yes | `.gitkeep` only |
| `hardware/` | **No** | Does not exist. No ESP32 or IoT code in the repository. |

---

## 3. Frontend Feature Inventory

Data source per screen, read from the actual imports on this branch.

| Screen | Route file | Service used | Current data source |
|---|---|---|---|
| Home | `app/(tabs)/home.jsx` | — | `data/mockHomeData` (hardcoded) |
| Farm hub | `app/(tabs)/farm.jsx` | — | Static navigation only — no data dependency |
| Finance dashboard | `app/(tabs)/finance.jsx` | `financeService` | Mock service |
| Assistant | `app/(tabs)/assistant.jsx` | `assistantService` | Mock service + `mockAssistantData` |
| Crop Recommendation | `app/crop-recommendation.jsx` | `cropService` | Mock service |
| Fertilizer Advice | `app/fertilizer-advice.jsx` | `fertilizerService` | Mock service |
| Loan Risk | `app/loan-risk.jsx` | `loanService`, `memberService` | Mock service |
| Secure Ledger | `app/ledger.jsx` | `ledgerService` | Mock service |
| Ledger Record | `app/ledger-record.jsx` | `ledgerService` | Mock service + `mockLedgerData` |
| Transactions | `app/transactions.jsx` | `financeService` | Mock service + `mockFinanceData` |
| Members | `app/members.jsx` | `memberService` | Mock service (module-level array) |
| Member Details | `app/member-details.jsx` | `memberService` | Mock service + `mockFinanceData` |
| Add Member | `app/add-member.jsx` | `memberService` | **Local state only** — lost on reload |
| Savings | `app/savings.jsx` | `financeService`, `memberService` | Mock service; write is a no-op |
| Loans | `app/loans.jsx` | `financeService` | Mock service |
| My Land | `app/my-land.jsx` | — | `data/mockLandData` (hardcoded) |
| Crop Health | `app/crop-health.jsx` | — | `data/mockCropHealthData` (hardcoded) |
| Reports | `app/reports.jsx` | — | `data/mockReportData` (hardcoded) |
| Authentication | *(none)* | *(none)* | **Not implemented in the frontend** |

**Frontend configuration** (`constants/Config.js`):

```js
API_BASE_URL: 'http://localhost:8000'
USE_MOCK_DATA: true
ENDPOINTS: {
  cropRecommendation:       '/predict/crop',
  fertilizerRecommendation: '/predict/fertilizer',
  loanRisk:                 '/predict/loan-risk',
  ledgerVerify:             '/ledger/verify',
}
```

Three of those four paths do not exist on the backend. See §7.

---

## 4. Backend API Inventory

All 13 endpoints, read from `backend/routes/`.

| # | Method | Path | Auth required | Request fields | Key response fields |
|---|---|---|---|---|---|
| 1 | POST | `/auth/register` | None | `member_id`, `name`, `password`, `role` (`member`\|`treasurer`) | `member_id`, `role`, `token` |
| 2 | POST | `/auth/login` | None | `member_id`, `password` | `member_id`, `role`, `token` |
| 3 | GET | `/auth/me` | Any authenticated | — | JWT claims (`member_id`, `role`, `exp`) |
| 4 | POST | `/predict-crop` | **None** | `N`, `P`, `K`, `temperature`, `humidity`, `ph`, `rainfall` (all float) | `recommended_crop`, `confidence`, `alternatives[]`, `fertilizer_available` |
| 5 | POST | `/crop-advisory` | **None** | crop fields + `soil_type`, `moisture`, `fert_nitrogen`, `fert_potassium`, `fert_phosphorous` | `crop{}`, `mapped_crop_type`, `fertilizer{}`, `needs_soil_test` |
| 6 | GET | `/fertilizer/options` | **None** | — | `soil_types[]`, `crop_types[]`, `fertilizer_classes[]`, `guideline_only_crops[]` |
| 7 | POST | `/recommend-fertilizer` | **None** | `temperature`, `humidity`, `moisture`, `nitrogen`, `potassium`, `phosphorous`, `soil_type`, `crop_type` | `recommended_fertilizer`, `confidence`, (`source`, `note`, `soil_note` on guideline path) |
| 8 | POST | `/request-loan` | Any authenticated | `amount`, `term_in_months`, `sector`, `repayment_interval`, `member_id?` | `risk_score`, `risk_label`, `flagged_high_risk`, `decision_threshold`, `savings_consistency`, `savings_consistency_detail`, `request`, `model`, `note` |
| 9 | POST | `/ledger/add` | Any authenticated (self, or treasurer for others) | `member_id`, `entry_type`, `amount` | `id`, `member_id`, `entry_type`, `amount`, `timestamp`, `entry_hash` |
| 10 | GET | `/ledger/verify` | **Treasurer / admin** | — | `valid`, `broken_entry_id` |
| 11 | GET | `/ledger/all` | **Treasurer / admin** | — | array of raw ledger rows |
| 12 | GET | `/member/{member_id}/portfolio` | Self, or treasurer/admin | path param | `member_id`, `total_savings`, `total_loans_outstanding`, `net_position`, `history[]` |
| 13 | GET | `/group/summary` | **Treasurer / admin** | — | `member_count`, `total_corpus`, `total_outstanding_loans`, `members[]` |

**Startup:** `uvicorn backend.app:app --reload --port 5000` (per `backend/app.py` docstring).
**CORS:** `allow_origins=["*"]`, all methods and headers — permissive enough for development.

### Endpoints that do NOT exist

| Needed by | Missing endpoint |
|---|---|
| Members screen | `GET` members list |
| Add Member screen | `POST` create member (only `/auth/register` exists, which takes no phone/village) |
| Transactions screen | `GET` transactions list (only treasurer-gated `/ledger/all`) |
| Loans screen | `GET` loans list |
| Finance dashboard | `GET` finance summary in the frontend's shape |
| Ledger Record screen | `GET` single ledger record by id |
| Any client | `GET /health` |
| Crop Health, My Land | anything at all |

---

## 5. Authentication Comparison

| Aspect | Backend | Frontend |
|---|---|---|
| Password hashing | PBKDF2-SHA256, per-user salt, 100,000 iterations | n/a |
| Token type | JWT, `HS256` | **Not implemented** |
| Secret | `SAHAI_SECRET_KEY` env var, with a dev fallback default | n/a |
| Login endpoint | `POST /auth/login` → `{member_id, role, token}` | **No login screen, no login call** |
| Header scheme | `Authorization: Bearer <token>` via `HTTPBearer` | **Never sent** |
| Expiry | 30 minutes (`TOKEN_EXPIRY_SECONDS = 60 * 30`) | **No refresh logic** |
| 401 behaviour | `"Token expired, please log in again."` / `"Invalid token."` | **No handler** |
| 403 behaviour | `"This action requires treasurer or admin access."` | **No handler** |
| Roles | `admin`, `treasurer`, `member`; `STAFF_ROLES = {admin, treasurer}` | **No role concept** |
| Token storage | n/a | **Nowhere** |

**Verdict: BLOCKER.** Six endpoints (`/request-loan`, `/ledger/add`, `/ledger/verify`,
`/ledger/all`, `/member/{id}/portfolio`, `/group/summary`) are unreachable from the
frontend as it stands. The frontend has no way to obtain, store or send a token, and
no screen exists for a user to enter credentials.

A further design question the team must answer: **who is the app logged in as?**
The ledger and portfolio endpoints are scoped per member, and verification is
treasurer-only. The frontend currently assumes a single anonymous operator.

---

## 6. Database Schema Summary

SQLite at `backend/database.db`. Two tables, both created on startup.

### `users`

| Column | Type | Constraints |
|---|---|---|
| `member_id` | TEXT | PRIMARY KEY |
| `name` | TEXT | NOT NULL |
| `password_hash` | TEXT | NOT NULL |
| `role` | TEXT | NOT NULL, CHECK IN (`member`, `treasurer`, `admin`) |

### `ledger`

| Column | Type | Constraints |
|---|---|---|
| `id` | INTEGER | PRIMARY KEY AUTOINCREMENT |
| `member_id` | TEXT | NOT NULL (no FK constraint declared) |
| `entry_type` | TEXT | NOT NULL — `savings_deposit` \| `loan_disbursed` \| `loan_repayment` |
| `amount` | REAL | NOT NULL |
| `timestamp` | REAL | NOT NULL (epoch seconds) |
| `prev_hash` | TEXT | NOT NULL |
| `entry_hash` | TEXT | NOT NULL |

### Tables that do not exist

`members` (as a profile table), `transactions`, `loans`, `savings`, `land`,
`crop_health`, `reports`.

**Everything financial is derived from the `ledger` table**, not stored:

| Concept | How the backend produces it |
|---|---|
| Member savings | Sum of `savings_deposit` rows for that member |
| Outstanding loan | Sum of `loan_disbursed` − sum of `loan_repayment` |
| Group corpus | Sum of all `savings_deposit` rows |
| Member list | Distinct `member_id` values in `ledger` (`build_group_summary`) — **not** from `users` |

**Two additional notes:**

1. `DB_PATH = "backend/database.db"` is a **relative** path in both `backend/ledger.py`
   and `backend/models/user.py`. Started from any directory other than the repository
   root, SQLite silently creates a *new, empty* database instead of failing.
2. The database is gitignored. A fresh clone starts with **zero rows**, so every
   finance screen would legitimately render empty even after integration.

---

## 7. Frontend ↔ Backend Master Gap Matrix

| Feature | Frontend file | Frontend service | Backend endpoint | Auth? | Frontend has, backend missing | Backend has, frontend missing | Naming / type mismatch | Status | Severity | Recommended resolution |
|---|---|---|---|---|---|---|---|---|---|---|
| **Authentication** | *(none)* | *(none)* | `/auth/login`, `/auth/register`, `/auth/me` | — | Login UI, token store, Bearer header, 401 retry | Roles, 30-min expiry, register | — | Not connected | **BLOCKER** | Add an auth layer before anything else |
| **Crop Recommendation** | `crop-recommendation.jsx` | `cropService` | `POST /predict-crop` | No | `message` string | `alternatives[]`, `fertilizer_available` | `nitrogen`→`N`, `phosphorus`→`P`, `potassium`→`K`; `confidence` 0-100 int vs 0-1 float; `factors[]` vs `alternatives[]` | Mock only | **BLOCKER** | Wire it; rename 3 fields; scale confidence ×100 |
| **Fertilizer Advice** | `fertilizer-advice.jsx` | `fertilizerService` | `POST /recommend-fertilizer` | No | `quantity`, `quantityUnit`, `estimatedSaving`, `actions[]` | `temperature`, `humidity`, `moisture`, `soil_type` (all **required**), `confidence`, `source` | `phosphorus`→`phosphorous`; frontend `ph` not accepted | Mock only; **form cannot satisfy the API** | **BLOCKER** | Add 4 missing inputs to the form; drop `quantity`/`estimatedSaving` |
| **Loan Risk** | `loan-risk.jsx` | `loanService` | `POST /request-loan` | **Yes** | `repaymentProbability`, `recommendation`, `reasons[]` | `flagged_high_risk`, `decision_threshold`, `savings_consistency_detail`, `model{}` | `requestedAmount`→`amount`; `durationMonths`→`term_in_months`; `riskScore` 0-100 vs 0-1; `Low`/`Medium`/`High` vs `LOW`/`MEDIUM`/`HIGH` | Mock only | **BLOCKER** | Needs auth first; 3 frontend inputs have no backend feature |
| **Members list** | `members.jsx` | `memberService` | **none** | — | Whole feature | — | — | Mock only | **BLOCKER** | New endpoint required |
| **Member details** | `member-details.jsx` | `memberService` | `GET /member/{id}/portfolio` (partial) | **Yes** | `name`, `phone`, `village`, `joinedAt`, `repaymentStatus` | `net_position` | `savings`→`total_savings`; `outstandingLoan`→`total_loans_outstanding` | Mock only | **HIGH** | Extend portfolio, or new endpoint |
| **Add Member** | `add-member.jsx` | `memberService` | `POST /auth/register` (partial) | No | `phone`, `village`, `initialSavings` | `password`, `role` | — | **Local state only** | **BLOCKER** | Backend cannot store phone/village — schema change needed |
| **Savings** | `savings.jsx` | `financeService` | `POST /ledger/add` (write) | **Yes** | Savings totals endpoint, per-member breakdown | Hash-chained write | `type: 'savings'` → `entry_type: 'savings_deposit'` | Mock; write is a no-op | **BLOCKER** | Wire write to `/ledger/add`; add read endpoint |
| **Transactions** | `transactions.jsx` | `financeService` | `GET /ledger/all` (treasurer only) | **Yes** | `description`, `status`, `statusTone`, member **name**, `expense` type | `prev_hash`, `entry_hash` | `type` enum differs on all values; `date` display string vs epoch float | Mock only | **BLOCKER** | New non-treasurer endpoint; enum + name mapping |
| **Loans** | `loans.jsx` | `financeService` | **none** | — | Whole feature: `durationMonths`, `purpose`, `principal`, `remaining`, `status` | — | — | Mock only | **BLOCKER** | Derive from ledger, or add a loans table |
| **Finance dashboard** | `(tabs)/finance.jsx` | `financeService` | `GET /group/summary` (partial) | **Yes** | `availableBalance`, `savingsThisMonth`, `savingsDelta`, `recentTransactions` | `members[]` | `totalSavings`→`total_corpus`; `activeMembers`→`member_count`; `outstandingLoans`→`total_outstanding_loans` | Mock only | **HIGH** | Extend `/group/summary` or add a summary endpoint |
| **Secure Ledger** | `ledger.jsx` | `ledgerService` | `GET /ledger/all` + `/ledger/verify` | **Yes** | `memberName`, `note`, `direction`, per-record `verified`, summary counts | — | `entry_type` vs `type`/`kind`; `prev_hash`→`previousHash`; epoch float vs ISO string; `valid`→`verified` | Mock only | **BLOCKER** | Wire both; adapt shapes in the service |
| **Ledger Record** | `ledger-record.jsx` | `ledgerService` | **none** | — | Single-record lookup | — | — | Mock only | **MEDIUM** | Filter client-side from `/ledger/all`, or add endpoint |
| **Home dashboard** | `(tabs)/home.jsx` | *(none)* | **none** | — | Every metric | — | — | Hardcoded | **HIGH** | Compose from other services once they work |
| **Assistant** | `(tabs)/assistant.jsx` | `assistantService` | **none** | — | All answers | — | — | Mock only | **HIGH** | Re-point answers at real services |
| **Reports** | `reports.jsx` | *(none)* | **none** | — | Every figure | — | — | Hardcoded | **MEDIUM** | Derive from real services |
| **Crop Health** | `crop-health.jsx` | *(none)* | **none** | — | Whole feature | — | — | Hardcoded | **LOW** | No backend exists — decide scope |
| **My Land** | `my-land.jsx` | *(none)* | **none** | — | Whole feature | — | — | Hardcoded | **LOW** | No backend exists — decide scope |

### Endpoint path mismatches

| `Config.ENDPOINTS` value | Actual backend route | Match? |
|---|---|---|
| `/predict/crop` | `/predict-crop` | **No** |
| `/predict/fertilizer` | `/recommend-fertilizer` | **No** |
| `/predict/loan-risk` | `/request-loan` | **No** |
| `/ledger/verify` | `/ledger/verify` | Yes |

`API_BASE_URL` is `http://localhost:8000`; `backend/app.py` documents `--port 5000`.
**Port mismatch — severity HIGH.** Also note that on a physical phone `localhost`
resolves to the phone itself, so a LAN address will be needed for device testing.

---

## 8. Detailed Data Contract Comparisons

### 8.1 Crop Recommendation

**Request**

| Frontend field | FE type | Req? | Backend field | BE type | Req? | Match? | Problem |
|---|---|---|---|---|---|---|---|
| `nitrogen` | number | Yes | `N` | float | Yes | Rename | Naming only |
| `phosphorus` | number | Yes | `P` | float | Yes | Rename | Naming only |
| `potassium` | number | Yes | `K` | float | Yes | Rename | Naming only |
| `temperature` | number | Yes | `temperature` | float | Yes | **Yes** | — |
| `humidity` | number | Yes | `humidity` | float | Yes | **Yes** | — |
| `ph` | number | Yes | `ph` | float | Yes | **Yes** | — |
| `rainfall` | number | Yes | `rainfall` | float | Yes | **Yes** | — |

**Response**

| Frontend expects | FE type | Backend returns | BE type | Match? | Problem |
|---|---|---|---|---|---|
| `crop` | string `"Rice"` | `recommended_crop` | string `"rice"` | Rename | Also lower-case vs title-case |
| `confidence` | int `94` | `confidence` | float `0.8674` | **No** | **Scale differs — 0-100 vs 0-1** |
| `message` | string | — | — | **No** | Frontend-only prose |
| `factors[]` | string[] | `alternatives[]` | `[{crop, confidence}]` | **No** | Different meaning and shape |
| — | — | `fertilizer_available` | bool | — | Backend-only, unused |

> **§11 finding — the hypothesised farmer-friendly mismatch does NOT exist on this branch.**
> The brief asked whether the frontend now collects *District, Soil Type, Growing Time,
> Water Availability, Watering Method, Previous Crop, Land Size*. It does **not**. The
> form on `secure-connect-prototype` collects the seven technical values above, which
> align with the trained model almost exactly. If a farmer-friendly redesign exists, it
> is on another branch and was not analysed here.
>
> **Consequence:** crop recommendation is one of the *easiest* integrations, not one of
> the hardest — three renames and one ×100 scaling.

> **Blocking caveat:** the crop model artifacts (`crop_model.pt`, `crop_scaler.pkl`,
> `crop_label_encoder.pkl`) are **not committed**, because `.gitignore` excludes
> `models/*.pt` and `models/*.pkl`. On a fresh clone this endpoint returns
> `503 "Crop model not trained yet."` regardless of any frontend work.

---

### 8.2 Fertilizer Recommendation

**Request**

| Frontend field | FE type | Req? | Backend field | BE type | Req? | Match? | Problem |
|---|---|---|---|---|---|---|---|
| `crop` | string | Yes | `crop_type` | string | Yes | Rename | Backend maps crop-model names itself |
| `nitrogen` | number | Yes | `nitrogen` | float | Yes | **Yes** | — |
| `potassium` | number | Yes | `potassium` | float | Yes | **Yes** | — |
| `phosphorus` | number | Yes | `phosphorous` | float | Yes | Rename | **Different spelling** |
| `ph` | number | Yes | — | — | — | **No** | **Backend does not use pH at all** |
| — | — | `temperature` | float | **Yes** | **No** | **Not collected by the form** |
| — | — | `humidity` | float | **Yes** | **No** | **Not collected by the form** |
| — | — | `moisture` | float | **Yes** | **No** | **Not collected by the form** |
| — | — | `soil_type` | string | **Yes** | **No** | **Not collected by the form** |

**Response**

| Frontend expects | FE type | Backend returns | Match? | Problem |
|---|---|---|---|---|
| `fertilizer` | string | `recommended_fertilizer` | Rename | — |
| `quantity` | number `35` | — | **No** | **Backend has no dosage output** |
| `quantityUnit` | string `kg/ha` | — | **No** | Backend has no dosage output |
| `estimatedSaving` | number `1200` | — | **No** | **Backend has no savings output** |
| `message` | string | — | **No** | Frontend-only prose |
| `actions[]` | string[] | `note`, `soil_note` (guideline path only) | Partial | Different shape |
| — | — | `confidence` | — | Backend-only, unused |
| — | — | `source` (`model` \| `guideline_table`) | — | Backend-only, unused |

> **§12 finding.** This is the **worst contract mismatch in the project**. The form is
> missing **four required backend fields**, so a request built from the current form
> would be rejected with `422` before reaching the model. Additionally, three of the six
> values the result screen displays (`quantity`, `quantityUnit`, `estimatedSaving`)
> have **no backend source at all** — the model returns a fertilizer *grade* only.
>
> Known backend vocabularies (from `GET /fertilizer/options`):
> soil types `Black, Clayey, Loamy, Red, Sandy`;
> crop types `Barley, Cotton, Ground Nuts, Maize, Millets, Oil seeds, Paddy, Pulses, Sugarcane, Tobacco, Wheat`.
> The frontend's quick-pick chips are `Rice, Wheat, Maize, Cotton, Sugarcane` — **`Rice`
> is not a backend crop type** (the backend maps `rice → Paddy` internally, so this one
> happens to work, but only via that bridge).
>
> **No conversion from pH to the missing fields exists or should be invented.**

---

### 8.3 Members

| Frontend field | FE type | Backend source | BE type | Match? | Problem |
|---|---|---|---|---|---|
| `id` | string `MEM-001` | `users.member_id` | TEXT | Rename | — |
| `name` | string | `users.name` | TEXT | **Yes** | — |
| `phone` | string | — | — | **No** | **No column exists** |
| `village` | string | — | — | **No** | **No column exists** |
| `savings` | number | derived from ledger | REAL | Derived | Not a stored column |
| `outstandingLoan` | number | derived from ledger | REAL | Derived | Not a stored column |
| `repaymentStatus` | string `On Track` | — | — | **No** | **No backend concept** |
| `joinedAt` | date string | — | — | **No** | **No column exists** |
| — | — | `users.role` | TEXT | — | Backend-only, unused by frontend |

**Endpoint:** none for a members list. `build_group_summary()` returns `members[]` as
**member IDs only**, and derives them from the `ledger` table — so a registered member
with no transactions would not appear.

---

### 8.4 Savings

| Question | Frontend | Backend |
|---|---|---|
| Representation | A `savings` number on each member, plus `financeSummary.totalSavings` | Derived by summing `savings_deposit` ledger rows |
| Storage | Mock array in `data/mockMembers.js` | No savings table, no savings column |
| Write path | `recordSavings()` returns a fabricated object; nothing persists | `POST /ledger/add` writes a real hash-chained row |
| Monthly figure | `savingsThisMonth: 7500` hardcoded | **Not implemented** — no endpoint computes this |
| Trend / delta | `savingsDelta: '+8.2%'` hardcoded | **Not implemented** |

**Verdict:** the models are compatible in principle (both treat savings as a sum of
deposits), but the frontend has no way to read or write them today, and two displayed
figures have no backend equivalent.

---

### 8.5 Transactions

| Frontend field | FE type | Backend field | BE type | Match? | Problem |
|---|---|---|---|---|---|
| `id` | string `TXN-001` | `id` | INTEGER | **No** | String vs integer |
| `type` | enum (below) | `entry_type` | enum (below) | **No** | **Every value differs** |
| `description` | string `Savings Deposit` | — | — | **No** | Not stored |
| `member` | **name** string | `member_id` | TEXT | **No** | Needs a join the API does not do |
| `amount` | number | `amount` | REAL | **Yes** | — |
| `date` | display string `Today` | `timestamp` | REAL epoch | **No** | Formatting vs raw |
| `status` | `Completed` | — | — | **No** | No backend concept |
| `statusTone` | `success` | — | — | **No** | Presentation only |
| — | — | `prev_hash`, `entry_hash` | TEXT | — | Backend-only, unused |

**Enum mismatch — every value differs:**

| Frontend `type` | Backend `entry_type` | Match? |
|---|---|---|
| `savings` | `savings_deposit` | **No** |
| `disbursement` | `loan_disbursed` | **No** |
| `repayment` | `loan_repayment` | **No** |
| `expense` | *(no equivalent)* | **No — backend cannot represent this** |

The frontend's Transactions screen also offers an **Expenses** filter, which no
backend entry type can ever populate.

---

### 8.6 Loans

| Frontend field | FE type | Backend equivalent | Match? | Problem |
|---|---|---|---|---|
| `id` | string `LN-001` | — | **No** | No loan entity |
| `memberId` | string | `ledger.member_id` | Partial | Only via ledger rows |
| `member` | name string | — | **No** | Requires a join |
| `principal` | number | sum of `loan_disbursed` | Derived | Not stored |
| `remaining` | number | disbursed − repaid | Derived | Not stored |
| `durationMonths` | number `12` | — | **No** | **Not recorded anywhere** |
| `status` | `On Track` / `Delayed` | — | **No** | No backend concept |
| `purpose` | `Crop inputs` | — | **No** | **Not recorded anywhere** |

**There is no loans table and no loans endpoint.** A loan exists only as a pair of
ledger entry types. Loan *term* and *purpose* are captured nowhere in the backend, even
though `/request-loan` accepts `term_in_months` as an input — it is used for scoring and
then discarded, not persisted.

---

### 8.7 Loan Risk

**Request**

| Frontend field | FE type | Req? | Backend field | BE type | Req? | Match? | Problem |
|---|---|---|---|---|---|---|---|
| `requestedAmount` | number (₹) | Yes | `amount` | float (₹) | Yes | Rename | Backend converts ₹→USD at `INR_PER_USD = 83.0` |
| `durationMonths` | number | Yes | `term_in_months` | int | Yes | Rename | — |
| `memberId` | string | Yes | `member_id` | string | Optional | Rename | Treasurer-only for other members |
| `monthlyIncome` | number | Yes | — | — | — | **No** | **Model has no income feature** |
| `existingLoan` | number | Yes | — | — | — | **No** | **Model has no existing-debt feature** |
| `repaymentScore` | number (%) | Yes | — | — | — | **No** | Backend derives `savings_consistency` from the ledger instead |
| — | — | `sector` | string | Optional | **No** | Not collected (defaults `Agriculture`) |
| — | — | `repayment_interval` | string | Optional | **No** | Not collected (defaults `monthly`) |

**Response**

| Frontend expects | FE type | Backend returns | BE type | Match? | Problem |
|---|---|---|---|---|---|
| `riskLevel` | `Low`/`Medium`/`High` | `risk_label` | `LOW`/`MEDIUM`/`HIGH` | **No** | Case differs |
| `riskScore` | int `18` (%) | `risk_score` | float `0.009` | **No** | **Scale differs** |
| `repaymentProbability` | int `82` | — | — | **No** | Derivable as `1 − risk_score` |
| `recommendation` | string | — | — | **No** | Frontend-only prose |
| `reasons[]` | string[] | — | — | **No** | **Model returns no attribution** |
| — | — | `flagged_high_risk`, `decision_threshold` | bool, float | — | Backend-only |
| — | — | `savings_consistency` + `_detail` | float, object | — | **The product's key differentiator, unused** |
| — | — | `model.label_is_synthetic` | bool | — | **Honesty flag the UI should surface** |

**Auth: required.** This endpoint is unreachable until the frontend can log in.

> **Notable:** the backend deliberately refuses to accept `savings_consistency` from the
> client and computes it from the member's own hash-chained deposit history, so a member
> cannot inflate her own score. The frontend's `repaymentScore` input is therefore not
> just unmapped — it is *philosophically opposed* to how the backend scores. The team
> should decide whether to remove that field.

---

### 8.8 Secure Ledger

**Record shape**

| Frontend field | FE type | Backend field | BE type | Match? | Problem |
|---|---|---|---|---|---|
| `id` | `TXN-024` | `id` | INTEGER | **No** | String vs int |
| `sequence` | number | `id` | INTEGER | Partial | Same value, different name |
| `memberName` | string | `member_id` | TEXT | **No** | Backend returns no name |
| `type` | `Savings Deposit` | `entry_type` | `savings_deposit` | **No** | Display vs enum |
| `kind` | `savings` | `entry_type` | `savings_deposit` | **No** | Second enum, also differs |
| `amount` | number | `amount` | REAL | **Yes** | — |
| `direction` | `in`/`out` | — | — | **No** | Derivable from `entry_type` |
| `timestamp` | ISO string | `timestamp` | REAL epoch | **No** | Format differs |
| `note` | string | — | — | **No** | **Not stored** |
| `verified` | bool per record | — | — | **No** | Backend verifies the **whole chain**, not rows |
| `currentHash` | string | `entry_hash` | TEXT | Rename | — |
| `previousHash` | string | `prev_hash` | TEXT | Rename | — |

**Verification**

| Frontend expects | Backend returns | Match? |
|---|---|---|
| `verified` | `valid` | Rename |
| `totalRecords` | — | **No** — count client-side from `/ledger/all` |
| `checkedRecords` | — | **No** |
| `tamperedRecordId` (`TXN-017`) | `broken_entry_id` (int) | Rename + type |
| `verifiedAt` | — | **No** |

**Endpoints:** `GET /ledger/all` and `GET /ledger/verify` both require **treasurer or
admin**. There is **no single-record endpoint**, so `ledger-record.jsx` has no backend
source. The frontend's `?demo=tampered` / `empty` / `error` modes simulate states the
backend would otherwise report.

---

### 8.9 Assistant

| Question | Answer |
|---|---|
| Uses a language model? | **No** — and none should be added |
| How it works | Keyword matcher over `intentKeywords`, returning entries from a fixed `assistantResponses` table |
| Data source | `data/mockAssistantData.js` |
| Can it reflect real backend data today? | **No** |

`mockAssistantData.js` imports from `cropService`, `fertilizerService`, `loanService`,
`mockFinanceData` and `mockLedgerData` — so its answers are consistent *with the mocks*.
Once those services return real data, the Assistant's figures would follow **only if**
the answers are rebuilt at query time; today they are assembled once at module load,
which would freeze whatever the first values were.

**No backend chat/assistant endpoint exists.**

---

### 8.10 Crop Health / My Land / Reports

| Feature | Backend support | Current source | Notes |
|---|---|---|---|
| **Crop Health** | **None** — no table, no route | `data/mockCropHealthData.js` | Health %, plot scores and issues have no backend concept |
| **My Land** | **None** — no table, no route | `data/mockLandData.js` | Farm name, acreage, plots, soil type, irrigation all frontend-only |
| **Reports** | **Partial (indirect)** | `data/mockReportData.js` | Fund half is derivable from the ledger; field half depends on Crop Health and My Land, so it is **not** derivable |

None of these three will work after backend integration without new backend work or a
decision to descope them.

---

## 9. Frontend Features With No Backend Support

| Feature | Nature | Notes |
|---|---|---|
| Crop Health | mock-only | No table, no endpoint |
| My Land | mock-only | No table, no endpoint |
| Reports (field half) | mock-only | Depends on the two above |
| Home dashboard | hardcoded | Every metric; composable once other services work |
| Assistant answers | mock-only | No backend endpoint |
| Add Member (`phone`, `village`, `initialSavings`) | local-state-only | Lost on reload; backend has no columns for phone/village |
| Loans list (`durationMonths`, `purpose`, `status`) | mock-only | No loans table |
| Transaction `expense` type | mock-only | Backend enum cannot represent it |
| Transaction `status` / `statusTone` | UI-only | Presentation, not data — fine to keep |
| Ledger `note` field | mock-only | Not stored |
| Ledger per-record `verified` | mock-only | Backend verifies the whole chain |
| Fertilizer `quantity`, `estimatedSaving` | mock-only | Model outputs a grade only |
| Loan risk `reasons[]`, `recommendation` | mock-only | Model gives no attribution |
| `savingsThisMonth`, `savingsDelta` | mock-only | No endpoint computes either |
| Authentication UI | not implemented | Backend is ready and waiting |

---

## 10. Backend Features Not Yet Used By The Frontend

Capabilities that already exist and need **no backend work** — only frontend wiring.

| Backend capability | Endpoint | Why it matters |
|---|---|---|
| User registration and login | `/auth/register`, `/auth/login` | Complete JWT auth is already built |
| Role-based access control | `require_treasurer`, `require_admin` | Treasurer vs member views are already enforceable |
| Current-user lookup | `/auth/me` | — |
| Crop→fertilizer advisory chain | `POST /crop-advisory` | One call does crop **and** fertilizer, including the vocabulary bridge |
| Fertilizer vocabularies | `GET /fertilizer/options` | Would let the form populate real dropdowns instead of hardcoded chips |
| Guideline fertilizer table | inside `/recommend-fertilizer` | Covers 10 fruit/plantation crops the model cannot handle |
| Ranked crop alternatives | `alternatives[]` | Richer than the frontend's `factors[]` |
| Ledger-derived savings consistency | inside `/request-loan` | **The product's core differentiator — currently invisible in the UI** |
| Model honesty metadata | `model.label_is_synthetic`, `val_auc` | Should be surfaced to the treasurer |
| Member portfolio | `GET /member/{id}/portfolio` | Covers much of Member Details |
| Group summary | `GET /group/summary` | Covers part of the Finance dashboard |
| Hash-chained writes | `POST /ledger/add` | Every savings/loan write should go through this |

---

## 11. Duplicate Data / Source-of-Truth Problems

**Important nuance:** the frontend mocks are **not** copy-pasted. They cross-import from
single sources — `mockHomeData` imports `financeSummary` from `mockFinanceData`,
`mockCropHealthData` imports `MOCK_RECOMMENDATION` from `cropService`, and so on. The
frontend is internally consistent by construction.

The duplication problem is therefore **across the frontend/backend boundary**, not
within the frontend.

| Value | Frontend source | Backend source | Risk |
|---|---|---|---|
| Group savings total | `mockFinanceData.financeSummary.totalSavings` = `48500` | `build_group_summary().total_corpus` (sum of ledger rows) | Two authorities; will disagree the moment the DB has different rows |
| Outstanding loans | `financeSummary.outstandingLoans` = `18000` | `total_outstanding_loans` (derived) | Same |
| Member count | `financeSummary.activeMembers` = `12` | `member_count` (distinct ledger member IDs) | **Definitions differ** — frontend counts the roster, backend counts members *with transactions* |
| Member savings | `mockMembers[].savings` | Derived from ledger | Same |
| Crop recommendation | `cropService.MOCK_RECOMMENDATION` = `Rice, 94%` | Model output (e.g. `rice, 0.8674`) | Frontend value is fixed; model value varies per input |
| Ledger record count | `mockLedgerData.ledgerSummary.totalRecords` = `24` | `COUNT(*)` on `ledger` | Same |
| Ledger verified state | `verifiedResult` (always true) | `verify_chain()` | **Frontend can display VERIFIED without the backend having checked anything** |

**The most serious duplication risk** is the last row: the ledger's entire value
proposition is that verification is real. A frontend that can render "VERIFIED" from a
constant undermines that claim. After integration, that badge must come only from
`GET /ledger/verify`.

---

## 12. Integration Blockers

Issues that genuinely prevent integration, in order of severity.

### B1 — The frontend has no HTTP client *(BLOCKER)*
There is not a single `fetch()` or `axios` call anywhere in `app/`, `components/` or
`services/`. `Config.USE_MOCK_DATA` is `true` and no service branches on it to make a
real request. Nothing can be integrated until an HTTP layer exists.

### B2 — The frontend cannot authenticate *(BLOCKER)*
No login screen, no credential entry, no token storage, no `Authorization` header, no
401 handling. Six endpoints are gated. Until this is solved, Loan Risk, Ledger,
Transactions, Savings writes, Member Portfolio and Group Summary are all unreachable.
The team must also decide **who the app is logged in as**, since ledger reads and
verification are treasurer-only.

### B3 — Crop model artifacts are not in the repository *(BLOCKER)*
`.gitignore` excludes `models/*.pt`, `models/*.pkl` and `models/*.json`. The crop
training script saves exactly `crop_model.pt`, `crop_scaler.pkl` and
`crop_label_encoder.pkl`. The fertilizer and loan models survived only because they use
`.pth` and `.joblib`, which the rule does not cover. On a fresh clone `/predict-crop`
and `/crop-advisory` both return `503`.
*Also:* no datasets are committed (`data/raw/*.csv` is gitignored), so the model cannot
simply be retrained from the repository either.

### B4 — Six screens have no backend endpoint *(BLOCKER)*
Members list, Add Member (with phone/village), Transactions list, Loans list, Crop
Health and My Land. These require **new backend work**, not frontend wiring.

### B5 — The fertilizer form cannot satisfy its own API *(BLOCKER)*
The form collects `crop`, `nitrogen`, `phosphorus`, `potassium`, `ph`. The endpoint
requires `temperature`, `humidity`, `moisture` and `soil_type` as well, and does not
accept `ph`. A request built from the current form fails validation with `422`. Four new
inputs must be added to the form — no conversion from pH exists or should be invented.

### B6 — Endpoint paths and port do not match *(HIGH)*
Three of four configured paths point at routes that do not exist, and `API_BASE_URL`
uses port `8000` while `backend/app.py` documents port `5000`.

### B7 — Transaction type enums are entirely incompatible *(HIGH)*
No frontend `type` value equals any backend `entry_type` value, and the frontend's
`expense` category has no backend representation at all.

### B8 — The database is empty and its path is fragile *(HIGH)*
The database is gitignored, so a fresh clone starts with zero rows and every finance
screen would legitimately render empty. Separately, `DB_PATH` is relative in both
`backend/ledger.py` and `backend/models/user.py`: starting `uvicorn` from any directory
other than the repository root silently creates a *new, empty* database rather than
failing loudly.

### B9 — Response scales differ silently *(MEDIUM)*
`confidence` and `risk_score` are `0–1` floats from the backend and `0–100` integers in
the frontend. This will not raise an error — it will render "1% match" for a 94%
confident prediction. Silent numeric bugs are more dangerous than crashes.

---

## 13. Recommended Integration Order

Derived from the actual dependencies in this repository, not a generic template.

| # | Step | Why this position | Est. effort |
|---|---|---|---|
| 0 | **Commit the crop model artifacts** (adjust `.gitignore` or `git add -f`) | Nothing about crop can be tested until a fresh clone has them | Trivial |
| 1 | **Fix `DB_PATH`** to resolve from `backend/` | Prevents an entire class of "why is it empty?" debugging | Trivial |
| 2 | **Build the frontend HTTP layer** (one API client: base URL, timeout, error mapping) | B1 — every later step depends on it | Small |
| 3 | **Build the auth layer** (login, token store, Bearer header, 401 retry) | B2 — six endpoints are gated | Medium |
| 4 | **Fix `Config.ENDPOINTS` paths and the port** | B6 — cheap, and blocks everything otherwise | Trivial |
| 5 | **Wire Crop Recommendation** | Simplest real contract: 3 renames + one ×100 | Small |
| 6 | **Add the missing fertilizer inputs, then wire it** | B5 — needs a form change first | Medium |
| 7 | **Wire the Ledger** (list + verify) | Highest demo value; the chain is already real | Medium |
| 8 | **Add members / transactions / loans / summary endpoints** | B4 — new backend work; unblocks four screens at once | Large |
| 9 | **Wire Savings writes to `POST /ledger/add`** | Makes the app genuinely persistent | Small |
| 10 | **Wire Loan Risk** | Depends on auth (step 3) and members (step 8) | Medium |
| 11 | **Rebuild Home from the working services** | Depends on almost everything above | Small |
| 12 | **Re-point the Assistant at live services** | Depends on the services being real | Small |
| 13 | **Decide the fate of Crop Health / My Land / Reports** | Product decision, not an engineering one | TBD |

**Steps 0, 1 and 4 are trivial and unblock disproportionate amounts of later work — do
them first.**

---

## 14. Recommended Future Sources Of Truth

Architecture guidance only. **Not implemented in this task.**

| Data | Future source of truth | Notes |
|---|---|---|
| Members (identity) | `users` table | Needs `phone`, `village`, `joined_at` columns added |
| Member savings | Backend aggregation over `ledger` | Never a stored column — keep it derived |
| Outstanding loans | Backend aggregation over `ledger` | Same |
| Group corpus / summary | Backend aggregation | One endpoint, so Home and Finance cannot disagree |
| Transactions | `ledger` table | The ledger *is* the transaction log — do not add a second table |
| Loans | `ledger` table, or a new `loans` table **if** term and purpose must persist | Product decision |
| Loan risk | ML model + ledger-derived `savings_consistency` | Never computed in the frontend |
| Ledger verification | `backend/ledger.py::verify_chain()` | **The UI must never be able to show VERIFIED on its own** |
| Crop recommendation | Trained crop model via `/predict-crop` | Latest result held in frontend session state for display only |
| Fertilizer advice | Trained fertilizer model + guideline table | Keep the `source` tag visible |
| Assistant answers | Composed at query time from the above services | No second copy of any figure |
| Crop Health | **TBD** — no backend exists | Descope, or design a table |
| My Land | **TBD** — no backend exists | Descope, or design a table |
| Reports | Backend aggregation for the fund half | Field half blocked on the two above |
| Group name / branding | Frontend config | Genuinely presentation, not data |

---

## 15. Final Summary

The backend is in better shape than the frontend's readiness to use it. The FastAPI
service has real authentication, a real tamper-evident ledger and two working ML
pipelines, and several of its best capabilities — the crop→fertilizer advisory chain,
ledger-derived savings consistency, ranked crop alternatives — are not surfaced anywhere
in the app.

The frontend is complete and polished as a **prototype**, but it was built against
mocks and has no HTTP or auth layer at all. The gap is therefore mostly *frontend
wiring plus a handful of new endpoints*, rather than a deep architectural conflict.

**Three corrections to expectations set before this analysis:**

1. **The crop form does *not* need a farmer-friendly conversion.** On this branch it
   already collects the seven technical values the model expects. Crop is one of the
   easiest integrations, not one of the hardest.
2. **The frontend's mocks are not duplicated.** They cross-import from single sources.
   The duplication risk is across the frontend/backend boundary only.
3. **Fertilizer, not crop, is the worst mismatch.** The form is missing four *required*
   API fields and displays three values the model never produces.

**Highest-value quick wins:** commit the crop artifacts, fix `DB_PATH`, and correct the
four endpoint paths. All three are trivial and each unblocks work that is otherwise
impossible to test.

---

## 16. Next Stage — Hardware + Software Integration

Informational only. **No hardware work was designed, started or implemented in this task.**

Once the frontend/backend contracts above are aligned, the next project stage will
combine the hardware and software sides of SahAI.

Current position:

- The repository contains **no `hardware/` directory** and no embedded, ESP32 or IoT
  code of any kind.
- No API endpoint currently accepts sensor input.
- No database table currently stores device readings.

Two observations worth carrying into that stage — stated as context, not as a design:

1. Several values the ML models require are exactly the kind a field sensor measures —
   soil `moisture`, `temperature` and `humidity` are all required by
   `/recommend-fertilizer` and are currently the fields the form cannot supply (§8.2).
2. The ledger's hash-chain design is append-only and already validates every write, so
   any future device-sourced record would need the same treatment as a human-entered one.

Detailed hardware/software design should begin only after this report is reviewed and
the contract gaps above are resolved.

---

*Prepared from a direct read of `secure-connect-prototype` @ `3e34621`. Where the
repository does not answer a question, this report says so explicitly rather than
inferring. No code was modified, committed or pushed.*
