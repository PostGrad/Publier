# ADR-003: Error Handling and Idempotency Strategy

## Status

Accepted

## Context

Publier exposes a public API intended for use by external developers. We need predictable error behavior and protection against duplicate requests.

## Decision

We will use a single canonical error format and support idempotency for write operations via an Idempotency-Key header.

## Rationale

- Simplifies client-side error handling
- Enables safe retries
- Improves system reliability

## Trade-offs

- Requires additional storage for idempotency keys
- Adds implementation complexity

## Future Considerations

Idempotency storage may be optimized or expired based on usage patterns.
