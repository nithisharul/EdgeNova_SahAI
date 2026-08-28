# Running SahAI locally

For LDAP SSO and Keycloak troubleshooting, see [docs/SSO_TROUBLESHOOTING.md](docs/SSO_TROUBLESHOOTING.md).

One command from the repository root starts both halves:

```bash
python dev.py
```

| | |
|---|---|
| Backend | `http://localhost:5000` — FastAPI, API docs at `/docs` |
| Frontend | Expo dev server — press `w` for web |

Both hot-reload: editing a `.py` file restarts the API, editing a `.jsx` file
Fast Refreshes the app. `Ctrl+C` stops both.

First time only:

```bash
pip install -r requirements.txt
cd frontend && npm install && cd ..
python scripts/seed_demo.py     # optional: demo accounts and ledger history
```

Other options: `python dev.py --backend`, `--frontend`, `--web`, or
`--host 0.0.0.0` to reach the API from another device.

### Testing on a physical phone

`localhost` on a phone means the phone, so point the app at your machine's LAN
address. Create `frontend/.env.local` (gitignored):

```
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.7:5000
```

Use your own IP (`ipconfig` / `ifconfig`), start the backend with
`python dev.py --host 0.0.0.0`, and keep both devices on the same Wi-Fi. On web
and in emulators the address is detected automatically and this is unnecessary.

### Treasurer registration

Creating a treasurer account requires a shared secret, since a treasurer can
read every member's finances. Set it before starting:

```bash
SAHAI_SETUP_KEY=<your-key> python dev.py
```

Without it, treasurer registration is disabled — which is the safe default.

---

# Security & Authentication

This project uses a layered authentication and authorization system to protect user accounts, financial operations, ledgers, and portfolios.

## Security Features

### 1. Secure Password Hashing

User passwords are **never stored as plaintext**.

The application uses:

* **PBKDF2-SHA256** for password hashing
* A unique **salt** for each password
* A computationally expensive hashing process to make brute-force attacks more difficult

Conceptually:

```text
User Password
     ↓
PBKDF2-SHA256 + Unique Salt
     ↓
Password Hash
     ↓
Stored in SQLite
```

The existing password hashing implementation is maintained in `auth.py`.

---

### 2. JWT-Based Authentication

The application uses **JSON Web Tokens (JWT)** to authenticate users after login.

The `PyJWT` dependency is included in `requirements.txt`:

```text
PyJWT>=2.8.0
```

After successful authentication:

```text
Login
  ↓
Verify username + password
  ↓
Generate JWT
  ↓
Client receives token
  ↓
Token sent with protected API requests
  ↓
Server verifies token
```

### JWT Expiration

JWT tokens expire after **30 minutes**.

This limits the amount of time a stolen or compromised token can be used.

---

### 3. Environment-Based JWT Secret

The JWT signing key is loaded from the environment using:

```text
SAHAI_SECRET_KEY
```

The secret should **not be hardcoded in the source code or committed to GitHub**.

Example environment configuration:

```text
SAHAI_SECRET_KEY=<your-secret-key>
```

This keeps sensitive cryptographic credentials separate from the application source code.

---

## Authentication API

### `GET /auth/me`

The `/auth/me` endpoint identifies the currently authenticated user.

The client sends a valid JWT with the request:

```http
GET /auth/me
Authorization: Bearer <JWT>
```

The server:

1. Extracts the JWT.
2. Verifies the token.
3. Identifies the user.
4. Returns the authenticated user's information.

This allows the frontend and other parts of the application to determine which user is currently logged in.

---

# Role-Based Access Control

The application supports three primary roles:

```text
ADMIN
TREASURER
MEMBER
```

Authentication determines **who the user is**, while role-based authorization determines **what the user is allowed to do**.

### Role hierarchy

```text
ADMIN
  │
  ├── Admin operations
  │
  └── Treasurer operations

TREASURER
  │
  └── Treasurer operations

MEMBER
  │
  └── Member-level operations
```

Administrators have sufficient privileges to access treasurer-level operations.

---

## Protected Loan Requests

The `/request-loan` endpoint is protected by authentication and authorization checks.

```text
POST /request-loan
        ↓
   Authenticate user
        ↓
    Verify JWT
        ↓
   Check permissions
        ↓
   Process request
```

Unauthenticated or unauthorized users cannot access protected loan functionality.

---

# Ledger and Portfolio Protection

Financially sensitive resources remain protected by authorization checks.

### Ledger

Ledger-related operations require appropriate permissions and cannot be accessed by unauthorized users.

### Portfolio

Members are restricted to their **own portfolio data**.

For example:

```text
Member A
   │
   ├── Portfolio A ✅
   │
   └── Portfolio B ❌
```

This prevents a member from accessing another member's financial information simply by changing a portfolio or user ID in an API request.

This provides **object-level access control** in addition to normal role-based authorization.

---

# SQLite Database Migration

SQLite migration support has been added to ensure that existing databases can continue working after changes to the user table.

For example, an older database may contain:

```text
users
├── id
├── username
└── password
```

while the updated application may require additional user information such as:

```text
users
├── id
├── username
├── password
└── role
```

The migration logic updates existing user tables where necessary instead of requiring every developer to delete their existing database.

```text
Existing SQLite Database
          ↓
       Migration
          ↓
 Updated User Schema
          ↓
 Application Continues Running
```

This is particularly useful when upgrading an existing installation or when multiple developers have different versions of the local database.

---

# Security Architecture

The overall authentication and authorization flow is:

```text
                    ┌─────────────┐
                    │    User     │
                    └──────┬──────┘
                           │
                         Login
                           │
                           ▼
                  ┌─────────────────┐
                  │ Password Check  │
                  │ PBKDF2-SHA256   │
                  │ + Salt          │
                  └────────┬────────┘
                           │
                     Authentication
                           │
                           ▼
                    ┌─────────────┐
                    │     JWT     │
                    │ 30-min TTL  │
                    └──────┬──────┘
                           │
                    API Requests
                           │
                           ▼
                  ┌─────────────────┐
                  │ Verify JWT      │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Identify User   │
                  │ + Role          │
                  └────────┬────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Authorization   │
                  │ / Ownership     │
                  └────────┬────────┘
                           │
                    ┌──────┴──────┐
                    │             │
                  Allow          Deny
                    │             │
                    ▼             ▼
                 Resource       403/401
                  Access        Response
```

## Summary of Security Changes

| Change                       | Purpose                              |
| ---------------------------- | ------------------------------------ |
| `PyJWT>=2.8.0`               | JWT authentication                   |
| Salted PBKDF2-SHA256         | Secure password storage              |
| 30-minute JWT expiry         | Limits token lifetime                |
| `SAHAI_SECRET_KEY`           | Keeps JWT secret outside source code |
| `GET /auth/me`               | Identifies authenticated user        |
| Admin/Treasurer/Member roles | Role-based authorization             |
| `/request-loan` protection   | Prevents unauthorized loan requests  |
| Ledger protection            | Protects financial records           |
| Portfolio ownership checks   | Prevents cross-user portfolio access |
| Admin → Treasurer access     | Supports role hierarchy              |
| SQLite migrations            | Keeps existing databases compatible  |

### Key Security Principle

The application follows the principle:

> **Authentication verifies who the user is; authorization verifies what that user is allowed to access.**

This separation ensures that simply being logged in does not automatically grant access to sensitive financial operations or another user's data.
