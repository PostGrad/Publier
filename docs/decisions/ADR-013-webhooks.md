# ADR-013: Webhook System

## Status

Accepted

## Context

Third-party apps need real-time notifications when posts change status. Polling is inefficient and doesn't scale.

## Decision

We implement a webhook system that:

1. Allows apps to register webhook URLs
2. Sends signed HTTP POST requests on events
3. Retries failed deliveries with exponential backoff

### Events

| Event            | Trigger                       |
| ---------------- | ----------------------------- |
| `post.created`   | New post created              |
| `post.scheduled` | Post scheduled for publishing |
| `post.published` | Post successfully published   |
| `post.failed`    | Post publishing failed        |

### Payload Format

```
{
  "id": "evt_123",
  "type": "post.scheduled",
  "created_at": "2025-01-01T10:00:00Z",
  "data": {
    "post_id": "post_456",
    "status": "scheduled",
    "scheduled_at": "2025-01-02T09:00:00Z"
  }
}
```

### Security

- Each webhook has a secret
- Payloads are signed with HMAC-SHA256
- Signature sent in `X-Publier-Signature` header
- Receivers must verify signatures

### Delivery

- Async (non-blocking to main request)
- Timeout: 10 seconds
- Retries: 3 attempts with exponential backoff
- Failed deliveries logged for debugging

## Rationale

- Industry standard for platform extensibility
- Enables real-time integrations
- Reduces API polling load
- Similar to Stripe, GitHub, Twilio webhooks

## Trade-offs

- Requires reliable delivery infrastructure
- Receivers must handle duplicates (at-least-once delivery)
- Secret management complexity

## Future Considerations

- Webhook event logs/history
- Manual retry UI
- Filtering by event type
