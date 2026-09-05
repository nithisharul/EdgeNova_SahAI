# SahAI

SahAI is an agriculture-focused digital platform for self-help groups (SHGs), designed to combine crop guidance, fertilizer recommendations, financial tracking, and loan risk evaluation in one system.

It includes:
- a FastAPI backend for authentication, APIs, and ML-powered recommendations
- an Expo/React Native frontend for mobile and web use
- Keycloak + OpenLDAP support for enterprise identity integration
- a ledger-based financial audit trail for member savings and loans

---

## Features

### 1. Crop advisory
- Recommends suitable crops from agronomic inputs such as nitrogen, phosphorus, potassium, rainfall, humidity, and temperature.
- Uses a trained crop recommendation model.
- Provides explanation-style output for the recommended crop.

### 2. Fertilizer recommendation
- Recommends fertilizer types based on soil and crop conditions.
- Supports both fertilizer dataset crop names and crop-model crop names.
- Uses the trained fertilizer prediction pipeline.

### 3. Loan risk assessment
- Calculates a member's loan risk score based on requested amount and savings consistency.
- Uses a trained loan model and ledger-based financial signals.
- Helps the treasurer evaluate member eligibility for internal loans.

### 4. Ledger and portfolio management
- Records member transactions such as savings deposits, loan disbursements, and repayments.
- Maintains a hash-chained financial ledger for tamper detection.
- Provides portfolio summaries for individual members and group-level tracking.

### 5. Authentication and authorization
- Member, treasurer, and admin roles.
- JWT-based authentication for protected API endpoints.
- Basic ownership checks so members can only see their own portfolio data.
- Optional Keycloak/OpenLDAP single-sign-on integration.

### 6. Admin and treasurer tools
- Manage member roles.
- Review group summaries and portfolio data.
- Verify ledger integrity.
- Enable or disable treasurer setup flow based on environment configuration.

---

## Tech stack

- Backend: FastAPI, Uvicorn, PostgreSQL (SQLite fallback for local development), JWT, PyJWT
- Frontend: Expo, React Native, React
- ML: scikit-learn, XGBoost, pandas, numpy, joblib
- Identity: Keycloak, OpenLDAP, Docker Compose

---

## Project structure

```text
.
├── backend/
│   ├── app.py
│   ├── auth.py
│   ├── ledger.py
│   ├── models/
│   ├── routes/
│   └── services/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── contexts/
│   ├── services/
│   └── package.json
├── models/
│   ├── train_crop_model.py
│   ├── train_fertilizer_model.py
│   ├── train_loan_model.py
│   └── *.joblib / *.pth artifacts
├── scripts/
│   └── seed_demo.py
├── docs/
│   ├── KEYCLOAK_OPENLDAP.md
│   ├── SSO_TROUBLESHOOTING.md
│   └── SahAI_Frontend_Backend_Gap_Analysis.md
├── docker-compose.keycloak.yml
├── dev.py
├── requirements.txt
├── README.md
└── test.py
```

---

## Prerequisites

Before running the project, make sure you have:

- Python 3.10+ or 3.11+
- Node.js 18+ and npm
- Docker Desktop or Docker Engine with Compose support
- Git

Confirm installation:

```bash
python --version
node --version
npm --version
docker --version
docker compose version
```

---

## 1) Install dependencies

From the project root:

```bash
python -m venv .venv
```

On Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

Then install Python dependencies:

```bash
pip install -r requirements.txt
```

Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

---

## 2) Environment variables

Create local environment variables before running the backend:

```powershell
$env:SAHAI_SECRET_KEY = "your-secret-key"
$env:SAHAI_SETUP_KEY = "your-treasurer-secret"
$env:DATABASE_URL = "postgresql://user:password@host:5432/database"
```

On macOS/Linux:

```bash
export SAHAI_SECRET_KEY="your-secret-key"
export SAHAI_SETUP_KEY="your-treasurer-secret"
export DATABASE_URL="postgresql://user:password@host:5432/database"
```

Notes:
- `SAHAI_SECRET_KEY` is required for JWT signing.
- `SAHAI_SETUP_KEY` enables treasurer registration.
- `DATABASE_URL` points the backend to shared PostgreSQL. When it is omitted, the backend uses the local SQLite file.
- If you are using the Keycloak/OpenLDAP integration, additional environment values are defined in the Docker Compose file.

---

## 3) Run with Docker (Keycloak/OpenLDAP)

This project includes a Docker Compose setup for Keycloak and OpenLDAP.

### Start the identity stack

From the project root:

```bash
docker compose -f docker-compose.keycloak.yml up -d
```

### Access services

- Keycloak: http://localhost:8080
- OpenLDAP: localhost:389
- PostgreSQL: internal Keycloak database, not the app's shared production database

### Stop the stack

```bash
docker compose -f docker-compose.keycloak.yml down
```

To remove volumes as well:

```bash
docker compose -f docker-compose.keycloak.yml down -v
```

### Docker installation guidance

If Docker is not installed yet:

1. Install Docker Desktop for Windows from the official Docker site.
2. Enable WSL 2 if prompted.
3. Start Docker Desktop and confirm it is running.
4. Run the Docker Compose commands above.

If you are using a Linux machine:

```bash
sudo apt-get update
sudo apt-get install docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

---

### Important: Docker PostgreSQL versus shared PostgreSQL

The PostgreSQL service in `docker-compose.keycloak.yml` stores Keycloak's own
data and is reachable only inside the Docker network. It does not make SahAI
data live across other people's machines.

For shared live SahAI data, provision a hosted PostgreSQL database on Railway
and set the backend's `DATABASE_URL` to Railway's connection string. Docker can
still run Keycloak locally, but every deployed backend must point to the same
hosted database.

## 4) Deploy the backend with Railway PostgreSQL

Railway is the hosting platform; PostgreSQL is the database service. Create a
Railway project with a PostgreSQL service and a backend service connected to
this repository.

Set these variables on the backend service in Railway:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
SAHAI_SECRET_KEY=<long-random-production-secret>
SAHAI_SETUP_KEY=<private-treasurer-registration-secret>
SAHAI_AUTH_MODE=local
```

For deployed Keycloak/OIDC, keep `DATABASE_URL` and replace or add:

```text
SAHAI_AUTH_MODE=oidc
KEYCLOAK_ISSUER=https://<your-keycloak-host>/realms/sahai
KEYCLOAK_AUDIENCE=sahai-api
```

Use this Railway start command:

```bash
uvicorn backend.app:app --host 0.0.0.0 --port $PORT
```

Do not commit production secrets or a PostgreSQL connection string. Railway's
PostgreSQL variable reference keeps every backend instance connected to the
same database after redeployments.

For the Expo frontend, set the deployed API URL before building or starting it:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "https://<your-railway-backend-domain>"
```

## 5) Run the backend

### Option A: using the helper script

From the repository root:

```bash
python dev.py --backend
```

This starts the FastAPI service on:

- http://localhost:5000
- API docs: http://localhost:5000/docs

### Option B: direct FastAPI startup

```bash
python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 5000
```

---

## 6) Run the frontend

From the frontend directory:

```bash
cd frontend
npm start
```

For the browser version directly:

```bash
cd frontend
npm run web
```

This starts the Expo development server. Use the terminal prompts to open the app in a browser or emulator.

---

## 7) Run both together

From the repo root:

```bash
python dev.py
```

This starts both the backend and frontend in one command. The helper script supports:

```bash
python dev.py --backend
python dev.py --frontend
python dev.py --web
python dev.py --host 0.0.0.0
```

The default backend URL is:

```text
http://localhost:5000
```

---

## 8) Seed demo data

Optional demo data can be loaded to populate sample users, accounts, and ledger history.

```bash
python scripts/seed_demo.py
```

---

## 9) Connect a phone or another device on the same network

If you want to test the app from a phone, use your machine's local LAN IP instead of `localhost`.

Example:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "http://192.168.1.7:5000"
```

Then start the backend with:

```bash
python dev.py --host 0.0.0.0
```

Use the same Wi-Fi or LAN network for both devices.

---

## 10) Keycloak/SSO notes

This app supports OpenLDAP + Keycloak identity integration. If you are using the Docker setup, see the troubleshooting docs here:

- docs/KEYCLOAK_OPENLDAP.md
- docs/SSO_TROUBLESHOOTING.md

---

## 11) Common startup checklist

If the app does not start correctly, verify the following:

```bash
pip install -r requirements.txt
cd frontend
npm install
cd ..
python dev.py
```

If you are seeing backend issues:
- confirm `SAHAI_SECRET_KEY` is set
- confirm Python dependencies are installed
- check whether the app is running on port 5000

If frontend issues appear:
- confirm Node.js and npm are installed
- run `npm install` inside `frontend`
- confirm the backend is already running

---

## 12) Useful URLs

- Backend: http://localhost:5000
- API docs: http://localhost:5000/docs
- Keycloak admin UI: http://localhost:8080

---

## 13) Notes for contributors

- Use the backend API docs at `/docs` to quickly inspect endpoints while developing.
- Edit Python files and the backend auto-reloads via `uvicorn --reload`.
- Edit frontend files and Expo will hot-reload for faster iteration.
- Prefer running the stack with `python dev.py` during development.

---

## License

This project is intended for internal or project-based use. Add your license details here before public release or repository publication.
