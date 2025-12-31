import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import {
  createTestUser,
  createTestApp,
  createTestApiKey,
  expectApiError,
} from "./helpers";

describe("API Keys Endpoints", () => {
  // POST /v1/apps/:appId/keys

  describe("POST /v1/apps/:appId/keys", () => {
    it("should create an API key", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/keys`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          name: "Production Key",
          scopes: ["posts:read", "posts:write"],
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.key).toBeDefined();
      expect(response.body.key).toMatch(/^pub_test_/); // development env
      expect(response.body.scopes).toContain("posts:read");
      expect(response.body._warning).toBeDefined();
    });

    it("should reject invalid scopes", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/keys`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          name: "Bad Key",
          scopes: ["invalid:scope"],
        })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
      expect(response.body.error.message).toContain("Invalid scopes");
    });

    it("should reject empty scopes", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .post(`/v1/apps/${testApp.id}/keys`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          name: "Empty Scopes Key",
          scopes: [],
        })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });

    it("should reject for non-existent app", async () => {
      const user = await createTestUser();
      const fakeAppId = "00000000-0000-0000-0000-000000000000";

      const response = await request(app)
        .post(`/v1/apps/${fakeAppId}/keys`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          name: "Key",
          scopes: ["posts:read"],
        })
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });
  });

  // GET /v1/apps/:appId/keys

  describe("GET /v1/apps/:appId/keys", () => {
    it("should list API keys without exposing full key", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);
      await createTestApiKey(user.sessionToken, testApp.id);

      const response = await request(app)
        .get(`/v1/apps/${testApp.id}/keys`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].key_preview).toBeDefined();
      // Key preview is a prefix, not the full key
      expect(response.body.data[0].key_preview.length).toBeLessThan(40);
      // Full key should NOT be returned
      expect(response.body.data[0].key).toBeUndefined();
    });
  });

  // DELETE /v1/apps/:appId/keys/:keyId

  describe("DELETE /v1/apps/:appId/keys/:keyId", () => {
    it("should revoke an API key", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);
      const apiKey = await createTestApiKey(user.sessionToken, testApp.id);

      // Revoke the key
      await request(app)
        .delete(`/v1/apps/${testApp.id}/keys/${apiKey.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(204);

      // Key should no longer work for API access
      const response = await request(app)
        .get("/v1/posts")
        .set("Authorization", `Bearer ${apiKey.key}`)
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });

    it("should not revoke other users key", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const testApp = await createTestApp(user1.sessionToken);
      const apiKey = await createTestApiKey(user1.sessionToken, testApp.id);

      // User2 tries to revoke User1's key
      const response = await request(app)
        .delete(`/v1/apps/${testApp.id}/keys/${apiKey.id}`)
        .set("Authorization", `Bearer ${user2.sessionToken}`)
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });
  });

  // API Key Authentication Tests

  describe("API Key Authentication", () => {
    it("should authenticate with valid API key", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);
      const apiKey = await createTestApiKey(user.sessionToken, testApp.id, [
        "posts:read",
      ]);

      await request(app)
        .get("/v1/posts")
        .set("Authorization", `Bearer ${apiKey.key}`)
        .expect(200);
    });

    it("should reject invalid API key", async () => {
      const response = await request(app)
        .get("/v1/posts")
        .set("Authorization", "Bearer pub_test_invalidkey")
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });

    it("should enforce scopes", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);
      const apiKey = await createTestApiKey(user.sessionToken, testApp.id, [
        "posts:read", // No write scope
      ]);

      // Read should work
      await request(app)
        .get("/v1/posts")
        .set("Authorization", `Bearer ${apiKey.key}`)
        .expect(200);

      // Write should fail
      const response = await request(app)
        .post("/v1/posts")
        .set("Authorization", `Bearer ${apiKey.key}`)
        .send({ content: "Test" })
        .expect(403);

      expectApiError(response, "FORBIDDEN");
    });
  });
});
