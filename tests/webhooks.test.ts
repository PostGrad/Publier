import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { pool } from "../src/infra/db";
import {
  createTestUser,
  createTestApp,
  expectApiError,
  setupTestContext,
} from "./helpers";

describe("Webhooks Endpoints", () => {
  // Cleanup is handled globally in tests/setup.ts

  describe("POST /v1/apps/:appId/webhooks", () => {
    it("should create a webhook with all events", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          url: "https://example.com/webhook",
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.url).toBe("https://example.com/webhook");
      expect(response.body.events).toEqual([]);
      expect(response.body.enabled).toBe(true);
      expect(response.body.secret).toMatch(/^whsec_/);
      expect(response.body._warning).toContain("Store the secret securely");
    });

    it("should create a webhook with specific events", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          url: "https://example.com/webhook",
          events: ["post.created", "post.published"],
        })
        .expect(201);

      expect(response.body.events).toEqual(["post.created", "post.published"]);
    });

    it("should reject non-HTTPS URLs", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          url: "http://example.com/webhook",
        })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
      expect(response.body.error.message).toContain("HTTPS");
    });

    it("should reject invalid URLs", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          url: "not-a-url",
        })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });

    it("should reject invalid event types", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          url: "https://example.com/webhook",
          events: ["invalid.event"],
        })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
      expect(response.body.error.message).toContain("Invalid events");
    });

    it("should reject missing URL", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({})
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });

    it("should reject without authentication", async () => {
      const response = await request(app)
        .post("/v1/apps/123e4567-e89b-12d3-a456-426614174000/webhooks")
        .send({
          url: "https://example.com/webhook",
        })
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });

    it("should reject for non-existent app", async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post("/v1/apps/123e4567-e89b-12d3-a456-426614174000/webhooks")
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          url: "https://example.com/webhook",
        })
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });

    it("should reject for app owned by another user", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const testApp = await createTestApp(user1.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user2.sessionToken}`)
        .send({
          url: "https://example.com/webhook",
        })
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });
  });

  describe("GET /v1/apps/:appId/webhooks", () => {
    it("should list webhooks for an app", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      // Create two webhooks
      await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ url: "https://example.com/webhook1" })
        .expect(201);

      await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ url: "https://example.com/webhook2" })
        .expect(201);

      const response = await request(app)
        .get(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      // Should not include secret in list response
      expect(response.body.data[0].secret).toBeUndefined();
    });

    it("should return empty list for app with no webhooks", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .get(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it("should not list webhooks from other apps", async () => {
      const user = await createTestUser();
      const testApp1 = await createTestApp(user.sessionToken);
      const testApp2 = await createTestApp(user.sessionToken);

      // Create webhook in app1
      await request(app)
        .post(`/v1/apps/${testApp1.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ url: "https://example.com/webhook1" })
        .expect(201);

      // List webhooks for app2
      const response = await request(app)
        .get(`/v1/apps/${testApp2.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
    });
  });

  describe("PATCH /v1/apps/:appId/webhooks/:webhookId", () => {
    it("should disable a webhook", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const createRes = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ url: "https://example.com/webhook" })
        .expect(201);

      const response = await request(app)
        .patch(`/v1/apps/${testApp.id}/webhooks/${createRes.body.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ enabled: false })
        .expect(200);

      expect(response.body.enabled).toBe(false);
    });

    it("should enable a disabled webhook", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const createRes = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ url: "https://example.com/webhook" })
        .expect(201);

      // Disable
      await request(app)
        .patch(`/v1/apps/${testApp.id}/webhooks/${createRes.body.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ enabled: false })
        .expect(200);

      // Enable
      const response = await request(app)
        .patch(`/v1/apps/${testApp.id}/webhooks/${createRes.body.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ enabled: true })
        .expect(200);

      expect(response.body.enabled).toBe(true);
    });

    it("should reject non-boolean enabled value", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const createRes = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ url: "https://example.com/webhook" })
        .expect(201);

      const response = await request(app)
        .patch(`/v1/apps/${testApp.id}/webhooks/${createRes.body.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ enabled: "yes" })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });

    it("should return 404 for non-existent webhook", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .patch(
          `/v1/apps/${testApp.id}/webhooks/123e4567-e89b-12d3-a456-426614174000`
        )
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ enabled: false })
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });
  });

  describe("DELETE /v1/apps/:appId/webhooks/:webhookId", () => {
    it("should delete a webhook", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const createRes = await request(app)
        .post(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ url: "https://example.com/webhook" })
        .expect(201);

      await request(app)
        .delete(`/v1/apps/${testApp.id}/webhooks/${createRes.body.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(204);

      // Verify it's deleted
      const listRes = await request(app)
        .get(`/v1/apps/${testApp.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(200);

      expect(listRes.body.data).toHaveLength(0);
    });

    it("should return 404 for non-existent webhook", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .delete(
          `/v1/apps/${testApp.id}/webhooks/123e4567-e89b-12d3-a456-426614174000`
        )
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });

    it("should not delete webhook from another app", async () => {
      const user = await createTestUser();
      const testApp1 = await createTestApp(user.sessionToken);
      const testApp2 = await createTestApp(user.sessionToken);

      const createRes = await request(app)
        .post(`/v1/apps/${testApp1.id}/webhooks`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ url: "https://example.com/webhook" })
        .expect(201);

      // Try to delete from wrong app
      const response = await request(app)
        .delete(`/v1/apps/${testApp2.id}/webhooks/${createRes.body.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });
  });

  describe("Webhook Delivery Integration", () => {
    it("should create delivery record when post is created", async () => {
      const ctx = await setupTestContext();

      // Create a webhook for the app
      await request(app)
        .post(`/v1/apps/${ctx.app.id}/webhooks`)
        .set("Authorization", `Bearer ${ctx.user.sessionToken}`)
        .send({
          url: "https://example.com/webhook",
          events: ["post.created"],
        })
        .expect(201);

      // Create a post (this should trigger webhook)
      await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "Test post for webhook" })
        .expect(201);

      // Give async webhook dispatch time to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check delivery was created
      const result = await pool.query(
        "SELECT * FROM webhook_deliveries WHERE event_type = 'post.created'"
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
      expect(result.rows[0].event_type).toBe("post.created");
    });

    it("should create delivery record when post is scheduled", async () => {
      const ctx = await setupTestContext();

      // Create a webhook for the app
      await request(app)
        .post(`/v1/apps/${ctx.app.id}/webhooks`)
        .set("Authorization", `Bearer ${ctx.user.sessionToken}`)
        .send({
          url: "https://example.com/webhook",
          events: ["post.scheduled"],
        })
        .expect(201);

      // Create a draft post first
      const postRes = await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "Test post for scheduling" })
        .expect(201);

      // Schedule the post
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      await request(app)
        .post(`/v1/posts/${postRes.body.id}/schedule`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ scheduled_at: futureDate })
        .expect(200);

      // Give async webhook dispatch time to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check delivery was created
      const result = await pool.query(
        "SELECT * FROM webhook_deliveries WHERE event_type = 'post.scheduled'"
      );

      expect(result.rows.length).toBeGreaterThanOrEqual(1);
    });

    it("should not trigger disabled webhooks", async () => {
      const ctx = await setupTestContext();

      // Create and disable a webhook
      const webhookRes = await request(app)
        .post(`/v1/apps/${ctx.app.id}/webhooks`)
        .set("Authorization", `Bearer ${ctx.user.sessionToken}`)
        .send({
          url: "https://example.com/webhook",
          events: ["post.created"],
        })
        .expect(201);

      await request(app)
        .patch(`/v1/apps/${ctx.app.id}/webhooks/${webhookRes.body.id}`)
        .set("Authorization", `Bearer ${ctx.user.sessionToken}`)
        .send({ enabled: false })
        .expect(200);

      // Create a post
      await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "Test post" })
        .expect(201);

      // Give async webhook dispatch time to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check no delivery was created
      const result = await pool.query("SELECT * FROM webhook_deliveries");

      expect(result.rows.length).toBe(0);
    });

    it("should only trigger webhooks subscribed to specific events", async () => {
      const ctx = await setupTestContext();

      // Create webhook only for post.published (not post.created)
      await request(app)
        .post(`/v1/apps/${ctx.app.id}/webhooks`)
        .set("Authorization", `Bearer ${ctx.user.sessionToken}`)
        .send({
          url: "https://example.com/webhook",
          events: ["post.published"],
        })
        .expect(201);

      // Create a draft post
      await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "Test post" })
        .expect(201);

      // Give async webhook dispatch time to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check no delivery was created (post.created not subscribed)
      const result = await pool.query("SELECT * FROM webhook_deliveries");

      expect(result.rows.length).toBe(0);
    });
  });
});

