import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import {
  uniqueEmail,
  testPassword,
  createTestUser,
  expectApiError,
} from "./helpers";

describe("Auth Endpoints", () => {
  // POST /v1/auth/register

  describe("POST /v1/auth/register", () => {
    it("should create a new user", async () => {
      const email = uniqueEmail();

      const response = await request(app)
        .post("/v1/auth/register")
        .send({
          email,
          password: testPassword,
          name: "Test User",
        })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.email).toBe(email);
      expect(response.body.name).toBe("Test User");
      expect(response.body.created_at).toBeDefined();
      // Password should never be returned
      expect(response.body.password).toBeUndefined();
      expect(response.body.password_hash).toBeUndefined();
    });

    it("should reject duplicate email", async () => {
      const email = uniqueEmail();

      // First registration
      await request(app)
        .post("/v1/auth/register")
        .send({ email, password: testPassword })
        .expect(201);

      // Second registration with same email
      const response = await request(app)
        .post("/v1/auth/register")
        .send({ email, password: testPassword })
        .expect(409);

      expectApiError(response, "CONFLICT");
    });

    it("should reject missing email", async () => {
      const response = await request(app)
        .post("/v1/auth/register")
        .send({ password: testPassword })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });

    it("should reject missing password", async () => {
      const response = await request(app)
        .post("/v1/auth/register")
        .send({ email: uniqueEmail() })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });

    it("should reject short password", async () => {
      const response = await request(app)
        .post("/v1/auth/register")
        .send({ email: uniqueEmail(), password: "short" })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
      expect(response.body.error.message).toContain("8 characters");
    });

    it("should reject invalid email format", async () => {
      const response = await request(app)
        .post("/v1/auth/register")
        .send({ email: "not-an-email", password: testPassword })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });
  });

  // POST /v1/auth/login

  describe("POST /v1/auth/login", () => {
    it("should return session token on valid credentials", async () => {
      const email = uniqueEmail();

      // Register first
      await request(app)
        .post("/v1/auth/register")
        .send({ email, password: testPassword })
        .expect(201);

      // Login
      const response = await request(app)
        .post("/v1/auth/login")
        .send({ email, password: testPassword })
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(response.body.token).toMatch(/^pub_session_/);
      expect(response.body.expires_at).toBeDefined();
      expect(response.body.user.email).toBe(email);
    });

    it("should reject wrong password", async () => {
      const email = uniqueEmail();

      await request(app)
        .post("/v1/auth/register")
        .send({ email, password: testPassword })
        .expect(201);

      const response = await request(app)
        .post("/v1/auth/login")
        .send({ email, password: "wrongpassword" })
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
      // Security: Same message for wrong email and wrong password
      expect(response.body.error.message).toBe("Invalid email or password");
    });

    it("should reject non-existent email", async () => {
      const response = await request(app)
        .post("/v1/auth/login")
        .send({ email: "nonexistent@example.com", password: testPassword })
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
      // Security: Same message as wrong password
      expect(response.body.error.message).toBe("Invalid email or password");
    });
  });

  // GET /v1/auth/me

  describe("GET /v1/auth/me", () => {
    it("should return current user with valid session", async () => {
      const user = await createTestUser();

      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(200);

      expect(response.body.id).toBe(user.id);
      expect(response.body.email).toBe(user.email);
    });

    it("should reject missing authorization", async () => {
      const response = await request(app).get("/v1/auth/me").expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });

    it("should reject invalid session token", async () => {
      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", "Bearer pub_session_invalid")
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });

    it("should reject API key (wrong auth type)", async () => {
      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", "Bearer pub_live_notasessiontoken")
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });
  });

  // POST /v1/auth/logout

  describe("POST /v1/auth/logout", () => {
    it("should invalidate session", async () => {
      const user = await createTestUser();

      // Logout
      await request(app)
        .post("/v1/auth/logout")
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(200);

      // Session should no longer work
      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", `Bearer ${user.sessionToken}`)
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });

    it("should require authentication", async () => {
      const response = await request(app).post("/v1/auth/logout").expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });
  });
});
