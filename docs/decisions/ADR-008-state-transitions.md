# ADR-008: Post State Machine

## Status

Accepted

## Context

Posts have a lifecycle with multiple states. We need to define valid transitions and how they are triggered.

## Decision

We define a simple state machine for posts:

draft → scheduled → published

↓

failed

### Transition Rules

| From      | To        | Trigger                          |
| --------- | --------- | -------------------------------- |
| draft     | scheduled | POST /posts/{id}/schedule        |
| scheduled | published | Background job (future)          |
| scheduled | failed    | Background job on error (future) |

### Enforcement

- State transitions are enforced at the database level via WHERE clauses
- Invalid transitions return 409 Conflict
- Each transition has a dedicated action endpoint

## Rationale

- Explicit state machine prevents invalid states
- Action endpoints make transitions auditable
- Database-level enforcement prevents race conditions

## Trade-offs

- More endpoints to maintain
- Clients must understand the state machine

## Future Considerations

- Add `POST /posts/{id}/publish` for immediate publishing
- Add `POST /posts/{id}/cancel` to revert scheduled → draft
