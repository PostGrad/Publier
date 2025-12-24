# Error Model

Publier uses a consistent error response format across all endpoints. Errors are designed to be human-readable and machine-parseable.

## Error Response Format

```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "scheduled_at must be in the future",
    "request_id": "req_abc123"
  }
}
```

## Error Codes

| Code                | Description                                   |
| ------------------- | --------------------------------------------- |
| UNAUTHORIZED        | Missing or invalid API key                    |
| FORBIDDEN           | Insufficient permissions                      |
| INVALID_REQUEST     | Validation or semantic error                  |
| NOT_FOUND           | Resource does not exist                       |
| CONFLICT            | Request conflicts with current resource state |
| RATE_LIMIT_EXCEEDED | Too many requests                             |
| INTERNAL_ERROR      | Unexpected server error                       |

## Design Principles

- Error codes are stable and documented
- Messages are safe to show to end users
- No internal stack traces are exposed
- Every error includes a request_id for traceability
