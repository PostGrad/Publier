# ADR-010: Apps as an Abstraction Layer

## Status

Accepted

## Context

Developers need to access Publier's API programmatically. We could issue API keys directly to developer accounts, but this limits flexibility and creates security risks.

## Decision

We introduce an **App** abstraction between developers and API keys:

Developer Account → Apps → API Keys → API Access

Each App represents one integration or product built on Publier.

## Why Not Issue Keys Directly to Developers?

| Approach                    | Problem                                       |
| --------------------------- | --------------------------------------------- |
| One key per developer       | Can't scope or revoke individual integrations |
| Multiple keys per developer | No logical grouping, hard to manage           |
| Apps with keys              | Clean isolation, per-integration control      |

## What Apps Enable

1. **Isolation:** Each app has its own keys, scopes, and rate limits
2. **Revocation**: Compromise one app, revoke only that app's keys
3. **Multiple products**: One developer can build several integrations
4. **Environment separation**: Development and production keys (future)
5. **Metrics**: Per-app usage tracking (future)
6. **OAuth compatibility**: Apps become OAuth clients (future)

## Trade-offs

- Extra step for developers (must create an app before getting keys)
- Slightly more complex data model

## Real-World Precedent

This pattern is used by:

- Stripe (Applications)
- GitHub (OAuth Apps)
- Auth0 (Applications)
- Supabase (Projects)

## Consequences

- API keys belong to Apps, not Users
- Deleting an App cascades to delete its API keys
- All API access is traceable to a specific App
