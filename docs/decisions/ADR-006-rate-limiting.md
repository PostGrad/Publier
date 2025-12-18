# ADR-006: Rate Limiting

## Status

Accepted

## Context

Publier exposes public APIs that must be protected against abuse.

## Decision

We enforce a per-API-key rate limit using Redis and a fixed time window.

## Rationale

- Simple implementation
- Predictable behavior
- Redis already in use

## Trade-offs

- Fixed window can cause burstiness
- Requires Redis availability

## Future Considerations

- Sliding window or token bucket
- Tier-based quotas
