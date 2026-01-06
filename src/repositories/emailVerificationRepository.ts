import { pool } from "../infra/db";
import { randomBytes, createHash } from "crypto";

// TYPES

export interface EmailVerificationToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: string;
  created_at: string;
}

// TOKEN GENERATION

/**
 * Generate a random verification token
 * Format: evt_<random_base64url>
 */
export function generateVerificationToken(): string {
  const randomPart = randomBytes(32).toString("base64url");
  return `evt_${randomPart}`;
}

/**
 * Hash a verification token using SHA-256
 */
export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// CRUD OPERATIONS

/**
 * Create a verification token for a user
 * 
 * - Deletes any existing tokens for the user
 * - Creates a new token valid for 24 hours
 * - Returns the plain token (to send via email)
 */
export async function createVerificationToken(
  userId: string
): Promise<string> {
  const token = generateVerificationToken();
  const tokenHash = hashVerificationToken(token);

  // Delete existing tokens for this user
  await pool.query(
    `DELETE FROM email_verification_tokens WHERE user_id = $1`,
    [userId]
  );

  // Create new token (expires in 24 hours)
  await pool.query(
    `
    INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
    VALUES ($1, $2, now() + interval '24 hours')
    `,
    [userId, tokenHash]
  );

  return token; // Return plain token (not the hash!)
}

/**
 * Verify an email using a token
 * 
 * - Checks if token exists and is not expired
 * - Marks user as verified
 * - Deletes the token (single-use)
 * 
 * Returns the user ID if successful, null otherwise
 */
export async function verifyEmailWithToken(
  token: string
): Promise<string | null> {
  const tokenHash = hashVerificationToken(token);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Find the token
    const tokenResult = await client.query(
      `
      SELECT user_id, expires_at
      FROM email_verification_tokens
      WHERE token_hash = $1
      `,
      [tokenHash]
    );

    if (tokenResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return null; // Token not found
    }

    const { user_id, expires_at } = tokenResult.rows[0];

    // Check if expired
    if (new Date(expires_at) < new Date()) {
      await client.query("ROLLBACK");
      return null; // Token expired
    }

    // Mark user as verified
    await client.query(
      `
      UPDATE users
      SET email_verified = true, email_verified_at = now()
      WHERE id = $1
      `,
      [user_id]
    );

    // Delete the token (single-use)
    await client.query(
      `DELETE FROM email_verification_tokens WHERE token_hash = $1`,
      [tokenHash]
    );

    await client.query("COMMIT");
    return user_id;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if a user has verified their email
 */
export async function isEmailVerified(userId: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT email_verified FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  return result.rows[0].email_verified;
}

/**
 * Delete expired tokens (cleanup task)
 */
export async function deleteExpiredTokens(): Promise<number> {
  const result = await pool.query(
    `DELETE FROM email_verification_tokens WHERE expires_at < now()`
  );

  return result.rowCount || 0;
}
