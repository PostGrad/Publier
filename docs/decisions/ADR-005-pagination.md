# ADR-005: Pagination Strategy

## Status
Accepted

## Context
Publier exposes list endpoints expected to scale with high write throughput.

## Decision
Cursor-based pagination using `created_at` as the cursor.

## Rationale
- Stable under concurrent inserts
- Better performance than offset pagination
- Predictable ordering guarantees

## Trade-offs
- Cursor values are opaque to clients
- Slightly more complex implementation

## Future Considerations
Cursor abstraction could evolve to encoded cursors.
