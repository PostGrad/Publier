import request from "supertest";
import { expect } from "vitest";
import { app } from "../src/app";

// Utilities to reduce boilerplate in tests and make test code more readable and maintainable.

// DATA FACTORIES

let counter = 0;

/*
Generates unique test data to avoid conflicts between tests.
Using counters instead of random values makes tests deterministic and easier to debug.
*/

export function uniqueEmail(): string {
  return `test${++counter}@example.com`;
}

export function uniqueAppName(): string {
  return `Test App ${++counter}`;
}

export const testPassword = "securepass123";

// AUTH HELPERS

interface TestUser {
  id: string;
  email: string;
  sessionToken: string;
}

/*
Creates a user and logs them in, returning the session token.
Most common setup for tests that need authentication.
*/
export async function createTestUser(
  email: string = uniqueEmail()
): Promise<TestUser> {
  // Register
  const registerRes = await request(app)
    .post("/v1/auth/register")
    .send({
      email,
      password: testPassword,
      name: "Test User",
    })
    .expect(201);

  // Login
  const loginRes = await request(app)
    .post("/v1/auth/login")
    .send({
      email,
      password: testPassword,
    })
    .expect(200);

  return {
    id: registerRes.body.id,
    email,
    sessionToken: loginRes.body.token,
  };
}

// APP HELPERS

interface TestApp {
  id: string;
  name: string;
}

// Creates an app for a user

export async function createTestApp(
  sessionToken: string,
  name: string = uniqueAppName()
): Promise<TestApp> {
  const res = await request(app)
    .post("/v1/apps")
    .set("Authorization", `Bearer ${sessionToken}`)
    .send({
      name,
      description: "Test app for automated testing",
    })
    .expect(201);

  return {
    id: res.body.id,
    name: res.body.name,
  };
}

// API KEY HELPERS

interface TestApiKey {
  id: string;
  key: string;
  scopes: string[];
}

// Creates an API key with specified scopes

export async function createTestApiKey(
  sessionToken: string,
  appId: string,
  scopes: string[] = ["posts:read", "posts:write"]
): Promise<TestApiKey> {
  const res = await request(app)
    .post(`/v1/apps/${appId}/keys`)
    .set("Authorization", `Bearer ${sessionToken}`)
    .send({
      name: "Test Key",
      scopes,
    })
    .expect(201);

  return {
    id: res.body.id,
    key: res.body.key,
    scopes: res.body.scopes,
  };
}

// FULL SETUP HELPER

interface TestContext {
  user: TestUser;
  app: TestApp;
  apiKey: TestApiKey;
}

/*
Complete test context: user, app, and API key.

Most common setup for API tests.

Usage:
  const ctx = await setupTestContext();
  await request(app)
    .post("/v1/posts")
    .set("Authorization", `Bearer ${ctx.apiKey.key}`)
    .send({ content: "Hello" });
*/
export async function setupTestContext(
  scopes: string[] = ["posts:read", "posts:write", "analytics:read"]
): Promise<TestContext> {
  const user = await createTestUser();
  const testApp = await createTestApp(user.sessionToken);
  const apiKey = await createTestApiKey(user.sessionToken, testApp.id, scopes);

  return {
    user,
    app: testApp,
    apiKey,
  };
}

// POST HELPERS

interface TestPost {
  id: string;
  content: string;
  status: string;
}

// Creates a test post.

export async function createTestPost(
  apiKey: string,
  content: string = "Test post content"
): Promise<TestPost> {
  const res = await request(app)
    .post("/v1/posts")
    .set("Authorization", `Bearer ${apiKey}`)
    .send({ content })
    .expect(201);

  return {
    id: res.body.id,
    content: res.body.content,
    status: res.body.status,
  };
}

// ASSERTION HELPERS

// Asserts that a response is a valid API error.

export function expectApiError(
  response: request.Response,
  expectedCode: string
): void {
  expect(response.body.error).toBeDefined();
  expect(response.body.error.code).toBe(expectedCode);
  expect(response.body.error.message).toBeDefined();
  expect(response.body.error.request_id).toBeDefined();
}
