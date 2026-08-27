"""
sahAI backend -- FastAPI entrypoint.

This file only wires the app together. Actual endpoint logic lives in
backend/routes/:
  auth_routes.py        -> POST /auth/register, POST /auth/login
  crop_routes.py        -> POST /predict-crop
  fertilizer_routes.py  -> POST /recommend-fertilizer
  loan_routes.py         -> POST /request-loan
  ledger_routes.py       -> POST /ledger/add, GET /ledger/verify, GET /ledger/all
  portfolio_routes.py    -> GET /member/{id}/portfolio, GET /group/summary
  app_routes.py          -> GET /health, GET/POST /api/members,
                            GET /api/finance/summary, /api/transactions, /api/loans

Ledger verify/all and group summary are treasurer-only (see backend/auth.py).

Run with: uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
Interactive API docs auto-generated at: http://localhost:8000/docs

--host 0.0.0.0 matters for the phone demo: Expo Go reaches this over the
laptop's LAN address, and the default loopback bind refuses those.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.ledger import init_db
from backend.models.user import init_users_db
from backend.models.member_directory import ensure_profile_columns
from backend.routes import (
    app_routes,
    auth_routes,
    crop_routes,
    fertilizer_routes,
    loan_routes,
    ledger_routes,
    portfolio_routes,
)

app = FastAPI(title="sahAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    init_users_db()
    # Adds the member profile columns if they are absent. Additive and
    # idempotent -- safe to run against an existing database.
    ensure_profile_columns()


app.include_router(auth_routes.router)
app.include_router(crop_routes.router)
app.include_router(fertilizer_routes.router)
app.include_router(loan_routes.router)
app.include_router(ledger_routes.router)
app.include_router(portfolio_routes.router)
app.include_router(app_routes.router)