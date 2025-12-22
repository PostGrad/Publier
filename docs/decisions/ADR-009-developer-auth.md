# ADR-010: Developer Account Authentication

## Status

Accepted

## Context

Publier has two authentication layers:

| Layer | Purpose | Mechanism |
|-------|---------|-----------|
| API Authentication | Third-party apps calling Publier's API | API Keys (ADR-001) |
| Developer Authentication | Developers managing their account/apps | Sessions (this ADR) |

Before developers can create API keys, they need to register and log in to Publier. This ADR covers the session-based authentication for developer accounts.

## Decision

### Authentication Flow

1. Developer registers with email + password
2. Developer logs in, receives a session token
3. Session token is used for account management endpoints
4. Developer creates apps and API keys
5. API keys are used for programmatic API access

### Password Storage

- Algorithm: **Argon2id**
- Memory: 64 MB
- Iterations: 3
- Parallelism: 4

Argon2id is the current recommendation from OWASP and winner of the Password Hashing Competition.

### Session Tokens

- Format: `pub_session_{random}`
- Storage: SHA-256 hash in database
- Expiry: 7 days
- Shown once at login (never stored raw)

### Why Two Auth Mechanisms?

| Concern | Session Token | API Key |
|---------|--------------|---------|
| Used for | Account management | API calls |
| Expiry | 7 days | Long-lived |
| Scope | Full account access | Granular scopes |
| Revocation | Logout | Explicit revoke |

Keeping them separate follows the principle of least privilege — API keys can be scoped to only what's needed, while session tokens are for trusted account management.

## Consequences

### Positive
- Clear separation between management and API access
- API keys can be scoped and rotated independently
- Session compromise doesn't expose API keys (and vice versa)

### Negative
- Two token types to understand
- Developers must manage both

## Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/v1/auth/register` | POST | None | Create account |
| `/v1/auth/login` | POST | None | Get session token |
| `/v1/auth/logout` | POST | Session | End session |
| `/v1/auth/me` | GET | Session | Get current user |