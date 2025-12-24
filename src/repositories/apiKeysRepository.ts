import { pool } from "../infra/db";
import { randomUUID, randomBytes, createHash } from "crypto";

/*
 * Manages API keys for apps. Keys are hashed before storage
 * the raw key is shown only once at creation.
 */

export interface ApiKey {
  id: string;
  app_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Valid scopes that can be assigned to API keys
export const VALID_SCOPES = [
  "posts:read",
  "posts:write",
  "analytics:read",
] as const;

export type Scope = (typeof VALID_SCOPES)[number];

/*
 * Generates a new API key with a recognizable prefix.
 * Format: pub_live_{32 random chars}
 * The prefix makes keys easy to identify in logs, environment variables, and support tickets.
 * Same pattern used by Stripe (sk_live_), GitHub (ghp_), etc.
 */
export function generateApiKey(
  environment: "development" | "production"
): string {
  const prefix = environment === "production" ? "pub_live_" : "pub_test_";
  const random = randomBytes(24).toString("base64url");
  return `${prefix}${random}`;
}

export function getKeyPrefix(key: string): string {
  return key.slice(0, 16);
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

interface CreateApiKeyParams {
  appId: string;
  name: string;
  scopes: string[];
  environment: "development" | "production";
  expiresAt?: Date;
}

export async function createApiKey({
  appId,
  name,
  scopes,
  environment,
  expiresAt,
}: CreateApiKeyParams): Promise<{ key: string; record: ApiKey }> {
  const id = randomUUID();
  const key = generateApiKey(environment);
  const keyPrefix = getKeyPrefix(key);
  const keyHash = hashApiKey(key);

  const result = await pool.query(
    `
    INSERT INTO api_keys (id, app_id, name, key_prefix, key_hash, scopes, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, app_id, name, key_prefix, scopes, last_used_at, expires_at, created_at
    `,
    [id, appId, name, keyPrefix, keyHash, scopes, expiresAt || null]
  );

  return {
    key, // Raw key — shown only once!
    record: result.rows[0],
  };
}

export async function listApiKeysByApp(appId: string): Promise<ApiKey[]> {
  const result = await pool.query(
    `
    SELECT id, app_id, name, key_prefix, scopes, last_used_at, expires_at, created_at
    FROM api_keys
    WHERE app_id = $1
    ORDER BY created_at DESC
    `,
    [appId]
  );

  return result.rows;
}

export async function findApiKeyByHash(keyHash: string): Promise<{
  key_id: string;
  app_id: string;
  user_id: string;
  scopes: string[];
  expires_at: string | null;
} | null> {
  const result = await pool.query(
    `
    SELECT 
      k.id as key_id,
      k.app_id,
      a.user_id,
      k.scopes,
      k.expires_at
    FROM api_keys k
    JOIN apps a ON a.id = k.app_id
    WHERE k.key_hash = $1
    `,
    [keyHash]
  );

  return result.rows[0] || null;
}

export async function getApiKeyById(
  keyId: string,
  appId: string
): Promise<ApiKey | null> {
  const result = await pool.query(
    `
    SELECT id, app_id, name, key_prefix, scopes, last_used_at, expires_at, created_at
    FROM api_keys
    WHERE id = $1 AND app_id = $2
    `,
    [keyId, appId]
  );

  return result.rows[0] || null;
}

/*
 * Update last_used_at timestamp (called by auth middleware).
 * Uses fire-and-forget pattern — don't slow down requests.
 */
export async function updateLastUsed(keyId: string): Promise<void> {
  await pool.query(`UPDATE api_keys SET last_used_at = now() WHERE id = $1`, [
    keyId,
  ]);
}

export async function deleteApiKey(
  keyId: string,
  appId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM api_keys WHERE id = $1 AND app_id = $2`,
    [keyId, appId]
  );

  return (result.rowCount ?? 0) > 0;
}
