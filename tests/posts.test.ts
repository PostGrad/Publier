import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { setupTestContext, createTestPost, expectApiError } from "./helpers";

describe("Posts Endpoints", () => {
  // POST /v1/posts

  describe("POST /v1/posts", () => {
    it("should create a draft post", async () => {
      const ctx = await setupTestContext();

      const response = await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "Hello world" })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.content).toBe("Hello world");
      expect(response.body.status).toBe("draft");
      expect(response.body.scheduled_at).toBeNull();
    });

    it("should create a scheduled post", async () => {
      const ctx = await setupTestContext();
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // +1 day

      const response = await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "Scheduled post", scheduled_at: futureDate })
        .expect(201);

      expect(response.body.status).toBe("scheduled");
      expect(response.body.scheduled_at).toBeDefined();
    });

    it("should reject past scheduled_at", async () => {
      const ctx = await setupTestContext();
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // -1 day

      const response = await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "Test", scheduled_at: pastDate })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
      expect(response.body.error.message).toContain("future");
    });

    it("should reject missing content", async () => {
      const ctx = await setupTestContext();

      const response = await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({})
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });

    it("should reject without auth", async () => {
      const response = await request(app)
        .post("/v1/posts")
        .send({ content: "Test" })
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });

    it("should reject with wrong scope", async () => {
      const ctx = await setupTestContext(["posts:read"]); // No write scope

      const response = await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "Test" })
        .expect(403);

      expectApiError(response, "FORBIDDEN");
    });
  });

  // GET /v1/posts

  describe("GET /v1/posts", () => {
    it("should list posts", async () => {
      const ctx = await setupTestContext();
      await createTestPost(ctx.apiKey.key, "Post 1");
      await createTestPost(ctx.apiKey.key, "Post 2");

      const response = await request(app)
        .get("/v1/posts")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.has_next_page).toBe(false);
    });

    it("should filter by status", async () => {
      const ctx = await setupTestContext();
      await createTestPost(ctx.apiKey.key, "Draft post");

      const response = await request(app)
        .get("/v1/posts?status=draft")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.every((p: any) => p.status === "draft")).toBe(
        true
      );
    });

    it("should respect limit", async () => {
      const ctx = await setupTestContext();
      await createTestPost(ctx.apiKey.key, "Post 1");
      await createTestPost(ctx.apiKey.key, "Post 2");
      await createTestPost(ctx.apiKey.key, "Post 3");

      const response = await request(app)
        .get("/v1/posts?limit=2")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination.has_next_page).toBe(true);
      expect(response.body.pagination.next_cursor).toBeDefined();
    });

    it("should reject invalid limit", async () => {
      const ctx = await setupTestContext();

      const response = await request(app)
        .get("/v1/posts?limit=-1")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });
  });

  // GET /v1/posts/:id

  describe("GET /v1/posts/:id", () => {
    it("should return a post", async () => {
      const ctx = await setupTestContext();
      const post = await createTestPost(ctx.apiKey.key, "Test content");

      const response = await request(app)
        .get(`/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .expect(200);

      expect(response.body.id).toBe(post.id);
      expect(response.body.content).toBe("Test content");
    });

    it("should return 404 for non-existent post", async () => {
      const ctx = await setupTestContext();
      const fakeId = "00000000-0000-0000-0000-000000000000";

      const response = await request(app)
        .get(`/v1/posts/${fakeId}`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });

    it("should reject invalid UUID", async () => {
      const ctx = await setupTestContext();

      const response = await request(app)
        .get("/v1/posts/not-a-uuid")
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });
  });

  // PATCH /v1/posts/:id

  describe("PATCH /v1/posts/:id", () => {
    it("should update content", async () => {
      const ctx = await setupTestContext();
      const post = await createTestPost(ctx.apiKey.key, "Original");

      const response = await request(app)
        .patch(`/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "Updated" })
        .expect(200);

      expect(response.body.content).toBe("Updated");
    });

    it("should reject empty content", async () => {
      const ctx = await setupTestContext();
      const post = await createTestPost(ctx.apiKey.key, "Original");

      const response = await request(app)
        .patch(`/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ content: "" })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });

    it("should reject no fields", async () => {
      const ctx = await setupTestContext();
      const post = await createTestPost(ctx.apiKey.key, "Original");

      const response = await request(app)
        .patch(`/v1/posts/${post.id}`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({})
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });
  });

  // POST /v1/posts/:id/schedule

  describe("POST /v1/posts/:id/schedule", () => {
    it("should schedule a draft post", async () => {
      const ctx = await setupTestContext();
      const post = await createTestPost(ctx.apiKey.key, "To schedule");
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      const response = await request(app)
        .post(`/v1/posts/${post.id}/schedule`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ scheduled_at: futureDate })
        .expect(200);

      expect(response.body.status).toBe("scheduled");
      expect(response.body.scheduled_at).toBeDefined();
    });

    it("should reject scheduling non-draft post", async () => {
      const ctx = await setupTestContext();
      const post = await createTestPost(ctx.apiKey.key, "To schedule");
      const futureDate = new Date(Date.now() + 86400000).toISOString();

      // Schedule it first
      await request(app)
        .post(`/v1/posts/${post.id}/schedule`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ scheduled_at: futureDate })
        .expect(200);

      // Try to schedule again
      const response = await request(app)
        .post(`/v1/posts/${post.id}/schedule`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ scheduled_at: futureDate })
        .expect(409);

      expectApiError(response, "CONFLICT");
    });

    it("should reject past date", async () => {
      const ctx = await setupTestContext();
      const post = await createTestPost(ctx.apiKey.key, "To schedule");
      const pastDate = new Date(Date.now() - 86400000).toISOString();

      const response = await request(app)
        .post(`/v1/posts/${post.id}/schedule`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .send({ scheduled_at: pastDate })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });
  });

  // GET /v1/posts/:id/analytics

  describe("GET /v1/posts/:id/analytics", () => {
    it("should return analytics for post", async () => {
      const ctx = await setupTestContext();
      const post = await createTestPost(ctx.apiKey.key, "Test");

      const response = await request(app)
        .get(`/v1/posts/${post.id}/analytics`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .expect(200);

      expect(response.body.post_id).toBe(post.id);
      expect(response.body.status).toBeDefined();
    });

    it("should require analytics:read scope", async () => {
      const ctx = await setupTestContext(["posts:read", "posts:write"]); // No analytics
      const post = await createTestPost(ctx.apiKey.key, "Test");

      const response = await request(app)
        .get(`/v1/posts/${post.id}/analytics`)
        .set("Authorization", `Bearer ${ctx.apiKey.key}`)
        .expect(403);

      expectApiError(response, "FORBIDDEN");
    });
  });
});
