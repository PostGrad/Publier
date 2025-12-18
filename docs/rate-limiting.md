# Rate Limiting Strategy

Publier enforces rate limits to protect platform stability and ensure fair usage across developer applications.

## Limits

- Rate limits are applied per API key
- Default limit: 100 requests per minute
- Burst traffic is allowed within a short window

## Behavior

- Limits apply across all endpoints
- Burst traffic beyond the limit is rejected

## Headers

Responses include standard rate limit headers:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `Retry-After` (when limit is exceeded)

## Error Response

When a limit is exceeded, the API returns HTTP 429 with structured error payload:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry later."
  }
}
```

## Future Considerations

- Tiered plans
- Per-endpoint limits
- Dynamic quotas
