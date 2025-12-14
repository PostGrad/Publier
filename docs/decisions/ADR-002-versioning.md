# ADR-002: API Versioning Strategy

## Status

Accepted

## Context

Publier exposes a public API intended for long-lived third-party integrations. We need a versioning strategy that balances evolution with stability.

## Decision

We will use URL-based major versioning (e.g. `/v1`) and guarantee no breaking changes within a major version.

## Rationale

- Clear and explicit for API consumers
- Avoids hidden or implicit breaking changes
- Common and well-understood approach for public APIs

## Trade-offs

- Requires maintaining multiple versions concurrently
- Adds operational overhead when deprecating older versions

## Future Considerations

If the API surface grows significantly, finer-grained versioning or schema-based approaches may be evaluated.
