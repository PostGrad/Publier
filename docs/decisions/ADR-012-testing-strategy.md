# ADR-012: Testing Strategy

## Status

Accepted

## Context

Publier needs automated tests to ensure reliability and enable confident deployments.
We need to decide what types of tests to write and how to structure them.

## Decision

We use **integration tests** over unit tests, testing the API through HTTP requests
against a real database.

## Rationale

### Why Integration Tests?

| Approach          | Pros            | Cons                                  |
| ----------------- | --------------- | ------------------------------------- |
| Unit tests        | Fast, isolated  | Miss real bugs (DB, middleware, auth) |
| Integration tests | Catch real bugs | Slower, need database                 |

For an API-focused project, integration tests provide more value:

- Test actual HTTP behavior, not internal functions
- Catch SQL errors, constraint violations, auth issues
- Serve as living documentation of API behavior

### Why Real Database (Not Mocks)?

Mocks hide bugs. A mock might return success while the real query fails due to:

- Typos in column names
- Missing indexes
- Constraint violations
- Transaction issues

Real database tests catch these before production.

### Test Isolation

Each test runs in a clean database state:

- Tables are truncated before each test
- Tests don't depend on each other
- Order doesn't matter

## Consequences

### Positive

- High confidence in API correctness
- Tests serve as API documentation
- Catches real integration bugs

### Negative

- Tests are slower than unit tests
- Requires test database setup
- CI/CD needs database service

## Test Categories

| Category   | Purpose              | Examples                 |
| ---------- | -------------------- | ------------------------ |
| Smoke      | Verify setup         | Health check             |
| Auth       | Authentication flows | Register, login, session |
| CRUD       | Resource operations  | Posts create/read/update |
| Errors     | Error handling       | 400, 401, 403, 404, 409  |
| Edge cases | Boundary conditions  | Rate limits, expiration  |
