# Testing & Coverage

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (for development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage
```

## Test Structure

We use **integration tests** with a real test database to ensure end-to-end correctness:

```
tests/
├── setup.ts              # Global setup/teardown, database cleanup
├── helpers.ts            # Test utilities (create users, apps, API keys)
├── health.test.ts        # Health endpoint smoke tests
├── auth.test.ts          # Developer authentication flow
├── apps.test.ts          # App management
├── apiKeys.test.ts       # API key generation & auth
├── posts.test.ts         # Core posts API
├── webhooks.test.ts      # Webhook management & delivery
└── emailVerification.test.ts  # Email verification flow
```

## Coverage Report

### Current Coverage (as of last run)

| Metric     | Coverage | Threshold | Status |
| ---------- | -------- | --------- | ------ |
| Lines      | 81.32%   | 80%       | Pass   |
| Functions  | 87.73%   | 85%       | Pass   |
| Branches   | 67.98%   | 65%       | Pass   |
| Statements | 81.41%   | 80%       | Pass   |

### Coverage Exclusions

The following files are **intentionally excluded** from coverage:

- **`src/server.ts`** - Server startup (not unit-testable)
- **`src/app.ts`** - App assembly (tested via integration tests)
- **`src/infra/**`** - External infrastructure (DB, Redis connections)

### Viewing Coverage

After running `pnpm test:coverage`, open the HTML report:

```bash
# Linux/Mac
open coverage/index.html

# Or manually navigate to
coverage/index.html
```

The HTML report shows:

- **File-by-file** coverage breakdown
- **Line-by-line** highlighting (green = covered, red = uncovered)
- **Branch coverage** for conditionals
- **Function coverage** for each method

### Low Coverage Areas (Opportunities for Improvement)

Based on the last run, these areas could use more tests:

1. **`src/middleware/idempotency.ts` (22.22%)** - Currently only tested indirectly

   - Add explicit tests for duplicate requests with same Idempotency-Key
   - Test TTL expiration scenarios
2. **`src/repositories/appsRepository.ts` (44%)** - Missing edge cases

   - Test pagination edge cases
   - Test soft-delete scenarios
3. **`src/repositories/emailVerificationRepository.ts` (75.75%)** - Partial coverage

   - Test token collision handling
   - Test concurrent token requests
4. **`src/routes/apps.ts` (59.37%)** - Many branches untested

   - Add tests for error paths (validation failures)
   - Test pagination edge cases
5. **`src/routes/posts.ts` (77.27%)** - Missing edge cases

   - Test timezone handling in scheduling
   - Test concurrent update scenarios

## Coverage Philosophy

### What We Test

**Business logic** - All API endpoints, repositories, authentication
**Error handling** - Invalid inputs, unauthorized access, not found
**Edge cases** - Empty lists, pagination boundaries, expired tokens
**Security** - Scope validation, token expiration, HMAC verification
**State transitions** - Post lifecycle (draft → scheduled → published)

### What We Don't Test

**External services** - We mock/stub third-party APIs
**Database internals** - We trust PostgreSQL's correctness
**Framework code** - Express middleware is battle-tested
**Infrastructure** - Connection pooling, Redis clustering

### Why Integration Tests?

We chose **integration tests over unit tests** because:

1. **Higher confidence** - Tests actual database interactions
2. **Realistic scenarios** - Tests the system as developers will use it
3. **Simpler maintenance** - No complex mocking required
4. **Regression protection** - Catches database migration issues

See [ADR-012: Testing Strategy](./decisions/ADR-012-testing-strategy.md) for the full rationale.

## Test Isolation

Each test file runs **sequentially** to avoid database conflicts:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    fileParallelism: false, // Run test FILES one at a time
    sequence: {
      concurrent: false,    // Run tests within files one at a time
    },
  },
});
```

The `beforeEach` hook in `tests/setup.ts` **cleans all tables** before each test:

```typescript
beforeEach(async () => {
  // Truncate all tables in dependency order
  await query("DELETE FROM webhook_deliveries");
  await query("DELETE FROM webhooks");
  await query("DELETE FROM api_keys");
  await query("DELETE FROM apps");
  await query("DELETE FROM user_sessions");
  await query("DELETE FROM email_verification_tokens");
  await query("DELETE FROM posts");
  await query("DELETE FROM users");
});
```

This ensures **every test starts with a clean slate**.

## Writing New Tests

### Template for API Endpoint Tests

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import app from "../src/app";
import { setupTestContext, assertApiError } from "./helpers";

describe("Feature Name", () => {
  let ctx: Awaited<ReturnType<typeof setupTestContext>>;

  beforeEach(async () => {
    ctx = await setupTestContext(["scope1:read", "scope2:write"]);
  });

  describe("POST /v1/resource", () => {
    it("should create resource", async () => {
      const response = await request(app)
        .post("/v1/resource")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ field: "value" })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.field).toBe("value");
    });

    it("should reject without auth", async () => {
      await request(app)
        .post("/v1/resource")
        .send({ field: "value" })
        .expect(401);
    });

    it("should reject with wrong scope", async () => {
      const wrongCtx = await setupTestContext(["other:read"]);

      const response = await request(app)
        .post("/v1/resource")
        .set("Authorization", `Bearer ${wrongCtx.apiKey.key}`)
        .send({ field: "value" })
        .expect(403);

      assertApiError(response.body, "FORBIDDEN");
    });

    it("should validate input", async () => {
      const response = await request(app)
        .post("/v1/resource")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ field: "" }) // Invalid
        .expect(400);

      assertApiError(response.body, "INVALID_REQUEST");
    });
  });
});
```

### Best Practices

1. **Use `setupTestContext()`** - Creates user, app, and API key with specified scopes
2. **Test the happy path first** - Ensure basic functionality works
3. **Test auth & authorization** - Missing token, expired token, wrong scope
4. **Test validation** - Missing fields, invalid formats, out-of-range values
5. **Test edge cases** - Empty lists, pagination boundaries, concurrent requests
6. **Use `assertApiError()`** - Validates error response format
7. **Clean assertions** - Test one thing per `it()` block

## CI/CD Integration

Coverage reports are generated automatically in CI (see `.github/workflows/test.yml`):

```yaml
- name: Run tests with coverage
  run: pnpm test:coverage

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/coverage-final.json
```

This ensures:

- Coverage thresholds are enforced on every PR
- Coverage trends are tracked over time
- PRs that reduce coverage are flagged

## Future Improvements

### Short Term

- [ ] Add explicit idempotency middleware tests
- [ ] Increase branch coverage to 70%+
- [ ] Add tests for rate limiting edge cases

### Long Term

- [ ] Add performance/load tests (k6, Artillery)
- [ ] Add mutation testing (Stryker)
- [ ] Add contract testing for API spec (Pact, Dredd)
- [ ] Add end-to-end tests with real email sending

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
- [ADR-012: Testing Strategy](./decisions/ADR-012-testing-strategy.md)
