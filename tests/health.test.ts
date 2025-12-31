import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app";
import { uniqueEmail } from "./helpers";

// Smoke test to verify test infrastructure works.

describe("GET /v1/health", () => {
  it("should return healthy status", async () => {
    const response = await request(app).get("/v1/health").expect(200);

    expect(response.body.status).toBe("healthy");
    expect(response.body.checks.database).toBe("healthy");
    expect(response.body.checks.cache).toBe("healthy");
  });

  it("should include timestamp", async () => {
    const response = await request(app).get("/v1/health").expect(200);

    expect(response.body.timestamp).toBeDefined();
  });

  it("helpers should generate unique values", () => {
    const email1 = uniqueEmail();
    const email2 = uniqueEmail();
    expect(email1).not.toBe(email2);
  });
});
