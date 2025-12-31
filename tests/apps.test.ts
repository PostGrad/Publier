import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import {
  createTestUser,
  createTestApp,
  uniqueAppName,
  expectApiError,
} from "./helpers";

describe("Apps Endpoints", () => {
  // POST /v1/apps

  describe("POST /v1/apps", () => {
    it("should create an app", async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post("/v1/apps")
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({
          name: uniqueAppName(),
          description: "My test app",
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBeDefined();
      expect(response.body.description).toBe("My test app");
      expect(response.body.environment).toBe("development");
    });

    it("should reject duplicate app name for same user", async () => {
      const user = await createTestUser();
      const name = uniqueAppName();

      // Create first app
      await request(app)
        .post("/v1/apps")
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ name })
        .expect(201);

      // Try to create another with same name
      const response = await request(app)
        .post("/v1/apps")
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ name })
        .expect(409);

      expectApiError(response, "CONFLICT");
    });

    it("should allow same app name for different users", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();
      const name = uniqueAppName();

      await request(app)
        .post("/v1/apps")
        .set("Authorization", `Bearer ${user1.sessionToken}`)
        .send({ name })
        .expect(201);

      // Different user, same name - should work
      await request(app)
        .post("/v1/apps")
        .set("Authorization", `Bearer ${user2.sessionToken}`)
        .send({ name })
        .expect(201);
    });

    it("should reject without authentication", async () => {
      const response = await request(app)
        .post("/v1/apps")
        .send({ name: uniqueAppName() })
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });

    it("should reject short name", async () => {
      const user = await createTestUser();

      const response = await request(app)
        .post("/v1/apps")
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .send({ name: "A" })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });
  });

  // GET /v1/apps

  describe("GET /v1/apps", () => {
    it("should list user apps", async () => {
      const user = await createTestUser();
      await createTestApp(user.sessionToken, "App 1");
      await createTestApp(user.sessionToken, "App 2");

      const response = await request(app)
        .get("/v1/apps")
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(2);
    });

    it("should not show other users apps", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      await createTestApp(user1.sessionToken, "User1 App");

      // User2 should see empty list
      const response = await request(app)
        .get("/v1/apps")
        .set("Authorization", `Bearer ${user2.sessionToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  // GET /v1/apps/:id

  describe("GET /v1/apps/:id", () => {
    it("should return app details", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      const response = await request(app)
        .get(`/v1/apps/${testApp.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(200);

      expect(response.body.id).toBe(testApp.id);
      expect(response.body.name).toBe(testApp.name);
    });

    it("should not return other users app", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const testApp = await createTestApp(user1.sessionToken);

      // User2 tries to access User1's app
      const response = await request(app)
        .get(`/v1/apps/${testApp.id}`)
        .set("Authorization", `Bearer ${user2.sessionToken}`)
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });
  });

  // DELETE /v1/apps/:id

  describe("DELETE /v1/apps/:id", () => {
    it("should delete an app", async () => {
      const user = await createTestUser();
      const testApp = await createTestApp(user.sessionToken);

      await request(app)
        .delete(`/v1/apps/${testApp.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(204);

      // Verify it's gone
      await request(app)
        .get(`/v1/apps/${testApp.id}`)
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(404);
    });

    it("should not delete other users app", async () => {
      const user1 = await createTestUser();
      const user2 = await createTestUser();

      const testApp = await createTestApp(user1.sessionToken);

      const response = await request(app)
        .delete(`/v1/apps/${testApp.id}`)
        .set("Authorization", `Bearer ${user2.sessionToken}`)
        .expect(404);

      expectApiError(response, "NOT_FOUND");
    });
  });
});
