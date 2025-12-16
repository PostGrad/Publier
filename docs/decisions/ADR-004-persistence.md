# ADR-004: Persistence Strategy

## Status

Accepted

## Context

Publier requires durable storage for posts while keeping the platform easy to reason about and evolve.

## Decision

We use PostgreSQL with explicit SQL queries and manual migrations.

## Rationale

- Clear visibility into schema and queries
- Avoids premature ORM abstraction
- Easier to reason about performance and migrations

## Trade-offs

- Slightly more boilerplate than ORM
- Requires discipline around query reuse

## Future Considerations

An ORM or query builder may be introduced if domain complexity increases.
