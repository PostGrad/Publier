# Idempotency

Publier supports idempotent requests for write operations to protect against duplicate submissions and retries.

## Supported Endpoints

- POST /v1/posts
- POST /v1/posts/{id}/schedule

## How It Works

Clients may send an `Idempotency-Key` header with a unique value. If the same request is received again with the same key, the original response is returned without re-processing the request.

## Rationale

Idempotency is critical for:

- Network retries
- At-least-once delivery guarantees
- Safe automation and background jobs
