# Keycloak + OpenLDAP

This project supports two authentication modes:

- `local` (default): local PBKDF2 passwords and HS256 JWTs.
- `oidc`: Keycloak access tokens, with Keycloak federating users from OpenLDAP.

## Start the local identity services

```powershell
docker compose --env-file .env -f docker-compose.keycloak.yml up -d
```

Keycloak is available at `http://localhost:8080` and OpenLDAP is bound only to
localhost. Do not expose LDAP ports to the public internet.

## Configure Keycloak

1. Create a realm named `sahai`.
2. Create a client named `sahai-api`.
   - Client authentication: off (the Expo app is a public client).
   - Standard flow: on.
   - Direct access grants: off unless explicitly needed.
3. Add an LDAP user federation provider:
   - Connection URL: `ldap://openldap:389`
   - Bind DN: `cn=admin,dc=sahai,dc=local`
   - Users DN: `ou=users,dc=sahai,dc=local`
   - Edit mode: `READ_ONLY` or `WRITABLE` according to your policy.
4. Create Keycloak groups named `sahai-admins`, `sahai-treasurers`, and
   `sahai-members`.
5. Assign each user exactly the group that represents the user's application
   role. The backend maps these names to `admin`, `treasurer`, and `member`.
6. Add a groups mapper/client scope to `sahai-api` so group claims are included
   in access tokens. Do not add `groups` as a requested OAuth scope unless that
   client scope has been created in Keycloak. Realm roles with the same names
   are also accepted.
7. Add an audience mapper for `sahai-api` so the access token contains
   `aud: sahai-api`.
8. Add these redirect URIs to the client while developing:
   - Web: `http://localhost:8081/login`
   - Native: `sahai://login`

## Run the backend in OIDC mode

Set these variables before starting FastAPI:

```powershell
$env:SAHAI_AUTH_MODE = "oidc"
$env:KEYCLOAK_ISSUER = "http://localhost:8080/realms/sahai"
$env:KEYCLOAK_AUDIENCE = "sahai-api"
$env:SAHAI_SECRET_KEY = "use-a-random-secret-for-local-fallbacks"
uvicorn backend.app:app --reload --port 5000
```

In OIDC mode, `/auth/login` and `/auth/register` are disabled. The frontend
must obtain a Keycloak access token and send it as:

```http
Authorization: Bearer <keycloak-access-token>
```

`GET /auth/me` and all existing protected endpoints then use the verified
Keycloak claims. The backend validates the issuer, audience, expiry, signature,
and RS256 algorithm using Keycloak's JWKS endpoint.

## Run the frontend in OIDC mode

Create `frontend/.env.local` (it is gitignored):

```text
EXPO_PUBLIC_AUTH_MODE=oidc
EXPO_PUBLIC_KEYCLOAK_ISSUER=http://localhost:8080/realms/sahai
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=sahai-api
```

The login screen uses Authorization Code + PKCE. After Keycloak redirects back,
the frontend sends the access token to `GET /auth/me`; the backend derives the
SahAI role from the verified `groups` or `realm_access.roles` claim. Do not use
Direct Access Grants or put an LDAP password in the frontend.

## Production requirements

- Use HTTPS for Keycloak, FastAPI, and the frontend.
- Use a private network for LDAP and allow only Keycloak to reach it.
- Replace the development Keycloak and LDAP passwords.
- Set `SAHAI_SECRET_KEY` through a secret manager, not source control.
- Restrict Keycloak redirect URIs to the real frontend origins.
- Use PostgreSQL instead of SQLite for a multi-instance deployment.
- Keep application authorization in FastAPI; never trust frontend roles.
