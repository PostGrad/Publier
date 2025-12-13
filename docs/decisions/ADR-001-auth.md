# ADR-001: API Authentication Strategy

## Status

Accepted

## Context

This platform exposes a public API intended for third-party developers.
We need a secure, simple authentication mechanism that supports scoped access and is easy to rotate if compromised.

## Decision

We will use API key–based authentication with scoped permissions.
Each developer application is issued a unique API key, sent via the Authorization header as a Bearer token.

## Rationale

- API keys are simple to understand and widely supported
- Suitable for server-to-server integrations
- Easier to implement and document than OAuth for an early platform
- Allows fine-grained scope control (e.g. posts:read)

## Trade-offs

- Less suitable for end-user delegated access
- Requires careful handling and rotation

## Future Considerations

If the platform expands to user-facing integrations, OAuth 2.0 may be introduced alongside API keys.
