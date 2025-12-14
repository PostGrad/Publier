# Rate Limiting Strategy

Publier enforces rate limits to protect platform stability and ensure fair usage across developer applications.

## Limits

- Rate limits are applied per API key
- Default limit: 100 requests per minute
- Burst traffic is allowed within a short window

## Headers

Responses include standard rate limit headers:

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `Retry-After` (when limit is exceeded)

## Error Response

When a limit is exceeded, the API returns:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry later."
  }
}
```
