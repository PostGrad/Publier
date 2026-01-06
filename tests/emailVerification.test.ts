import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { createTestUser, expectApiError } from "./helpers";
import { pool } from "../src/infra/db";
import {
  generateVerificationToken,
  hashVerificationToken,
} from "../src/repositories/emailVerificationRepository";

describe("Email Verification", () => {
  describe("POST /v1/auth/register", () => {
    it("should send verification email on registration", async () => {
      const response = await request(app)
        .post("/v1/auth/register")
        .send({
          email: "verify-test@example.com",
          password: "secure123",
          name: "Test User",
        })
        .expect(201);

      expect(response.body.email_verified).toBe(false);
      expect(response.body._message).toContain("verify");

      // Check that token was created in database
      const tokenResult = await pool.query(
        "SELECT * FROM email_verification_tokens WHERE user_id = $1",
        [response.body.id]
      );

      expect(tokenResult.rows.length).toBe(1);
      expect(tokenResult.rows[0].expires_at).toBeDefined();
    });
  });

  describe("GET /v1/auth/verify-email", () => {
    it("should verify email with valid token", async () => {
      // Create user
      const userResponse = await request(app)
        .post("/v1/auth/register")
        .send({
          email: "verify1@example.com",
          password: "secure123",
        })
        .expect(201);

      const userId = userResponse.body.id;

      // Get token from database
      const tokenResult = await pool.query(
        "SELECT token_hash FROM email_verification_tokens WHERE user_id = $1",
        [userId]
      );

      // We can't get the plain token from DB (it's hashed)
      // So we'll create a new one for testing
      const token = generateVerificationToken();
      const tokenHash = hashVerificationToken(token);

      await pool.query(
        "UPDATE email_verification_tokens SET token_hash = $1 WHERE user_id = $2",
        [tokenHash, userId]
      );

      // Verify email
      const verifyResponse = await request(app)
        .get("/v1/auth/verify-email")
        .query({ token })
        .expect(200);

      expect(verifyResponse.body.message).toContain("verified");
      expect(verifyResponse.body.user_id).toBe(userId);

      // Check user is now verified
      const userResult = await pool.query(
        "SELECT email_verified, email_verified_at FROM users WHERE id = $1",
        [userId]
      );

      expect(userResult.rows[0].email_verified).toBe(true);
      expect(userResult.rows[0].email_verified_at).toBeTruthy();

      // Token should be deleted (single-use)
      const tokenCheck = await pool.query(
        "SELECT * FROM email_verification_tokens WHERE user_id = $1",
        [userId]
      );

      expect(tokenCheck.rows.length).toBe(0);
    });

    it("should reject missing token", async () => {
      const response = await request(app)
        .get("/v1/auth/verify-email")
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
      expect(response.body.error.message).toContain("token is required");
    });

    it("should reject invalid token", async () => {
      const response = await request(app)
        .get("/v1/auth/verify-email")
        .query({ token: "evt_invalid_token_xyz" })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
      expect(response.body.error.message).toContain("Invalid or expired");
    });

    it("should reject expired token", async () => {
      // Create user
      const userResponse = await request(app)
        .post("/v1/auth/register")
        .send({
          email: "verify2@example.com",
          password: "secure123",
        })
        .expect(201);

      const userId = userResponse.body.id;

      // Create expired token
      const token = generateVerificationToken();
      const tokenHash = hashVerificationToken(token);

      await pool.query(
        "UPDATE email_verification_tokens SET token_hash = $1, expires_at = now() - interval '1 hour' WHERE user_id = $2",
        [tokenHash, userId]
      );

      // Try to verify with expired token
      const response = await request(app)
        .get("/v1/auth/verify-email")
        .query({ token })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
      expect(response.body.error.message).toContain("Invalid or expired");
    });

    it("should not allow token reuse", async () => {
      // Create user
      const userResponse = await request(app)
        .post("/v1/auth/register")
        .send({
          email: "verify3@example.com",
          password: "secure123",
        })
        .expect(201);

      const userId = userResponse.body.id;

      // Create token
      const token = generateVerificationToken();
      const tokenHash = hashVerificationToken(token);

      await pool.query(
        "UPDATE email_verification_tokens SET token_hash = $1 WHERE user_id = $2",
        [tokenHash, userId]
      );

      // First verification - success
      await request(app)
        .get("/v1/auth/verify-email")
        .query({ token })
        .expect(200);

      // Second verification - should fail (token deleted)
      const response = await request(app)
        .get("/v1/auth/verify-email")
        .query({ token })
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
    });
  });

  describe("POST /v1/auth/resend-verification", () => {
    it("should resend verification email for unverified user", async () => {
      const user = await createTestUser();

      // Login to get session token
      const loginResponse = await request(app)
        .post("/v1/auth/login")
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      const sessionToken = loginResponse.body.token;

      // Resend verification
      const response = await request(app)
        .post("/v1/auth/resend-verification")
        .set("Authorization", `Bearer ${sessionToken}`)
        .expect(200);

      expect(response.body.message).toContain("sent");

      // Check that a new token was created
      const tokenResult = await pool.query(
        "SELECT * FROM email_verification_tokens WHERE user_id = $1",
        [user.id]
      );

      expect(tokenResult.rows.length).toBe(1);
    });

    it("should reject if email already verified", async () => {
      const user = await createTestUser();

      // Manually mark as verified
      await pool.query(
        "UPDATE users SET email_verified = true, email_verified_at = now() WHERE id = $1",
        [user.id]
      );

      // Login
      const loginResponse = await request(app)
        .post("/v1/auth/login")
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      const sessionToken = loginResponse.body.token;

      // Try to resend
      const response = await request(app)
        .post("/v1/auth/resend-verification")
        .set("Authorization", `Bearer ${sessionToken}`)
        .expect(400);

      expectApiError(response, "INVALID_REQUEST");
      expect(response.body.error.message).toContain("already verified");
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/v1/auth/resend-verification")
        .expect(401);

      expectApiError(response, "UNAUTHORIZED");
    });
  });

  describe("GET /v1/auth/me", () => {
    it("should include email_verified field", async () => {
      const user = await createTestUser();

      const loginResponse = await request(app)
        .post("/v1/auth/login")
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      const sessionToken = loginResponse.body.token;

      const response = await request(app)
        .get("/v1/auth/me")
        .set("Authorization", `Bearer ${sessionToken}`)
        .expect(200);

      expect(response.body.email_verified).toBe(false);
      expect(response.body.email_verified_at).toBeNull();
    });
  });

  describe("Token Management", () => {
    it("should replace old token when resending", async () => {
      const user = await createTestUser();

      // Login
      const loginResponse = await request(app)
        .post("/v1/auth/login")
        .send({
          email: user.email,
          password: user.password,
        })
        .expect(200);

      const sessionToken = loginResponse.body.token;

      // Resend first time
      await request(app)
        .post("/v1/auth/resend-verification")
        .set("Authorization", `Bearer ${sessionToken}`)
        .expect(200);

      const firstTokenResult = await pool.query(
        "SELECT token_hash FROM email_verification_tokens WHERE user_id = $1",
        [user.id]
      );

      const firstTokenHash = firstTokenResult.rows[0].token_hash;

      // Resend second time
      await request(app)
        .post("/v1/auth/resend-verification")
        .set("Authorization", `Bearer ${sessionToken}`)
        .expect(200);

      const secondTokenResult = await pool.query(
        "SELECT token_hash FROM email_verification_tokens WHERE user_id = $1",
        [user.id]
      );

      // Should only have one token
      expect(secondTokenResult.rows.length).toBe(1);

      // Token should be different
      expect(secondTokenResult.rows[0].token_hash).not.toBe(firstTokenHash);
    });
  });
});
