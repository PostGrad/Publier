# ADR-007: Update Semantics and Mutable Fields

## Status

Accepted

## Context

Publier exposes a PATCH endpoint for updating posts. We need to define which fields are mutable via direct update, and which require explicit action endpoints.

## Decision

We restrict PATCH to content-only updates. Status transitions (draft → scheduled → published) are handled through dedicated action endpoints like `/schedule`.

### Mutable via PATCH

- `content` — The post body text

### Immutable via PATCH

- `id` — Primary key
- `status` — Changed via action endpoints
- `scheduled_at` — Changed via `/schedule` endpoint
- `created_at` — Audit timestamp

## Rationale

- **Explicit state transitions** — Status changes often have side effects (scheduling jobs, sending notifications). Action endpoints make these transitions visible and controllable.
- **Prevents invalid states** — Clients cannot set `status: "published"` without going through proper validation.
- **Auditability** — Action endpoints can be logged and monitored separately.
- **API evolution** — Adding validation or side effects to status changes doesn't require modifying the PATCH endpoint.

## Trade-offs

- Clients must make multiple requests to update content and schedule in one flow.

## Future Considerations

If bulk operations are needed, a dedicated batch endpoint could be introduced
rather than relaxing PATCH semantics.
