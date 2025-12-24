# Publier

Publier is a public, developer-first API for creating, scheduling, and managing content programmatically.
It is designed as a platform - not a product, that third-party developers can build on top of.

---

## Why Publier?

Most content publishing tools focus on end-user interfaces.
Publier explores the opposite approach: a clean, stable, and well-documented public API that external developers can reliably integrate with to build their own publishing tools, workflows, and automations.

The project is intentionally small in scope but deep in design, focusing on API contracts, versioning, developer experience, and long-term maintainability.

## Design Principles

- **Developer first API** - Every feature is designed from the perspective of an external developer.
- **Stability over novelty** - No breaking changes within a version.
- **Explicit over implicit** - Clear endpoints, predictable behavior, and consistent error responses.
- **Boring technology, thoughtful design** - Proven tools used deliberately.
- **Extensible by default** - Designed to support future integrations and plugins.

## Core Capabilities

- Create, update, and manage posts via a public API
- Schedule posts for future publishing
- Fetch publishing status and basic analytics
- Authenticate using scoped API keys
- Enforce rate limits and abuse protection
- Provide clear error contracts and versioned endpoints

## API Overview

All endpoints are versioned under `/v1`.

### Resources

- `/v1/apps` - Developer applications and API keys
- `/v1/posts` - Content creation and management
- `/v1/posts/{id}/schedule` - Scheduling posts
- `/v1/posts/{id}/analytics` - Basic engagement metrics

### System

- `/v1/health` – Readiness check for infrastructure (no auth required)

### Authentication

Publier uses API key-based authentication. API keys are issued per developer application and sent via the `Authorization` header:

`Authorization: Bearer pub_live_xyz`

Each key has scoped permissions such as:

- `posts:read`
- `posts:write`
- `analytics:read`

### Idempotent Requests

Publier supports idempotent write operations using the `Idempotency-Key` header to protect against duplicate submissions.

### Error Handling

Errors are designed to be both human-readable and machine-parseable. Publier uses a consistent error format across all endpoints:

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "scheduled_at must be in the future",
    "request_id": "req_abc123"
  }
}
```

### Versioning & Stability

- All APIs are versioned (`/v1`)
- No breaking changes within a version
- Deprecated fields and endpoints will be announced before removal
- Each response includes a request ID for traceability

## Developer Experience

- OpenAPI specification for all endpoints
- Example requests using curl
- Clear error messages and status codes
- A lightweight Node.js SDK (planned) to simplify integration

## Architecture (High-Level)

Publier is built using:

- Node.js + TypeScript
- PostgreSQL for persistent data
- Redis for rate limiting
- RESTful APIs following OpenAPI standards

The system is designed as a modular monolith to keep complexity low while allowing future service separation if needed.

## Development

Publier targets Node.js 22. Use `nvm use` to ensure the correct runtime version.

## Platform Guarantees

Publier makes the following guarantees to API consumers:

- Stable API contracts within a major version
- Clear error semantics
- Predictable rate limiting behavior
- Explicit communication of breaking changes

These guarantees are intentional and treated as part of the API design.

## Reliability & Safety

Publier is designed to be safe to integrate with:

- Idempotent write operations
- Consistent error contracts
- Request-level traceability

These guarantees are part of the platform’s public contract.

## What Publier Is Not

- A full publishing UI or dashboard
- A social network or content platform
- A real integration with external social networks
- A production-ready SaaS product

Publier is a design-focused project intended to demonstrate platform engineering principles.

## Future Work

- OAuth 2.0 for delegated user access
- GraphQL API alongside REST
- Webhooks for post lifecycle events
- Additional SDKs (Python, Ruby)
- Plugin registration and execution framework

## Author

Built by Pranay Patel as a platform-focused backend engineering project.
