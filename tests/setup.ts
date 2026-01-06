import { beforeAll, afterAll, beforeEach } from "vitest";
import { pool } from "../src/infra/db";
import { redis } from "../src/infra/redis";

// Global test setup

beforeAll(async () => {
  // Make sure DATABASE_URL points to a test database
  await pool.query("SELECT 1");

  // Connect to Redis
  if (!redis.isOpen) {
    await redis.connect();
  }

  console.log("✓ Test database connected");
});

afterAll(async () => {
  // Close connections
  await pool.end();
  await redis.quit();

  console.log("✓ Test connections closed");
});

beforeEach(async () => {
  // Clean up tables before each test (order matters for foreign keys)
  // Webhook deliveries must be deleted before webhooks (FK constraint)
  await pool.query("DELETE FROM webhook_deliveries").catch(() => {
    // Ignore if table doesn't exist (migration not run yet)
  });
  await pool.query("DELETE FROM webhooks").catch(() => {
    // Ignore if table doesn't exist (migration not run yet)
  });
  await pool.query("DELETE FROM email_verification_tokens").catch(() => {
    // Ignore if table doesn't exist (migration not run yet)
  });
  await pool.query("DELETE FROM api_keys");
  await pool.query("DELETE FROM apps");
  await pool.query("DELETE FROM user_sessions");
  await pool.query("DELETE FROM users");
  await pool.query("DELETE FROM posts");

  // Clear Redis
  await redis.flushDb();
});
