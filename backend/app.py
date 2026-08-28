"""Run with: uvicorn backend.app:app --reload --port 5000
Interactive API docs auto-generated at: http://localhost:5000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.ledger import init_db
from backend.models.user import init_users_db
from backend.routes import auth_routes, crop_routes, fertilizer_routes, loan_routes, ledger_routes, portfolio_routes

app = FastAPI(title="sahAI API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    # Expo may select any available local port. The app uses bearer headers,
    # not browser cookies, so wildcard CORS is sufficient for local dev.
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    init_users_db()


app.include_router(auth_routes.router)
app.include_router(crop_routes.router)
app.include_router(fertilizer_routes.router)
app.include_router(loan_routes.router)
app.include_router(ledger_routes.router)
app.include_router(portfolio_routes.router)