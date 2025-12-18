# Rate Limits

Publier enforces rate limits per API key.

## Default Limits

- 100 requests per minute per API key

## Behavior

- Limits apply across all endpoints
- Burst traffic beyond the limit is rejected

## Error Response

HTTP 429 with structured error payload.

## Future Considerations

- Tiered plans
- Per-endpoint limits
- Dynamic quotas
