# ADR-011: API Key Security

## Status

Accepted

## Context

Publier issues API keys for programmatic access. We need to balance security, performance, and developer experience.

## Decisions

### 1. Hashing Algorithm: SHA-256 (not Argon2)

**Decision:** Use SHA-256 for API key storage.

**Rationale:**

- API keys are high-entropy random strings (32+ bytes)
- Unlike passwords, they cannot be guessed or brute-forced
- SHA-256 is fast — critical for auth middleware on every request
- Argon2 would add 100ms+ latency per request

| Credential Type | Entropy            | Hashing         | Why                |
| --------------- | ------------------ | --------------- | ------------------ |
| User password   | Low (human-chosen) | Argon2id (slow) | Resist brute-force |
| API key         | High (random)      | SHA-256 (fast)  | Performance        |

### 2. Show Once Pattern

**Decision:** Raw API key is returned only at creation time.

**Rationale:**

- We never store the raw key
- If database is compromised, keys cannot be extracted
- Developers must store their key securely
- Lost keys require regeneration (like Stripe, GitHub)

### 3. Prefix Pattern

**Decision:** Keys use recognizable prefixes: `pub_live_`, `pub_test_`

**Format:** `pub_{env}_{24 bytes base64url}`

**Rationale:**

- Easy to identify in logs, configs, and support tickets
- Environment is immediately visible
- Industry standard (Stripe: `sk_live_`, GitHub: `ghp_`)

### 4. Scoped Permissions

**Decision:** Each key has explicit scopes.

**Available scopes:**

- `posts:read`
- `posts:write`
- `analytics:read`

**Rationale:**

- Least privilege principle
- A key for reading posts shouldn't be able to delete them
- Limits blast radius of compromised keys

### 5. Expiration Support

**Decision:** Keys can optionally have an expiration date.

**Rationale:**

- Enables short-lived keys for CI/CD
- Supports security policies requiring rotation
- Default: no expiration (developer convenience)

## Consequences

### Positive

- Fast authentication (SHA-256 lookup)
- Secure storage (no raw keys in database)
- Clear key identification (prefixes)
- Granular access control (scopes)

### Negative

- Lost keys cannot be recovered
- Developers must manage key storage

## References

- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Stripe API Key Design](https://stripe.com/docs/api/authentication)
