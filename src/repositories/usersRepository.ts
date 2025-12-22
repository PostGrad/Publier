import { pool } from "../infra/db";
import { randomUUID, createHash, randomBytes } from "crypto";
import * as argon2 from "argon2";

export interface User {
  id: string;
  email: string;
  email_verified_at: string | null;
  name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,    // 64 MB
    timeCost: 3,          // 3 iterations
    parallelism: 4,       // 4 parallel threads
  });
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function generateSessionToken(): string {
  const random = randomBytes(32).toString("base64url");
  return `pub_session_${random}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUser({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name?: string;
}): Promise<User> {
  const id = randomUUID();
  const passwordHash = await hashPassword(password);

  const result = await pool.query(
    `
    INSERT INTO users (id, email, password_hash, name)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, email_verified_at, name, created_at, updated_at
    `,
    [id, email.toLowerCase(), passwordHash, name || null]
  );

  return result.rows[0];
}

export async function findUserByEmail(email: string): Promise<{
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
} | null> {
  const result = await pool.query(
    `SELECT id, email, password_hash, name FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  return result.rows[0] || null;
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await pool.query(
    `
    SELECT id, email, email_verified_at, name, created_at, updated_at
    FROM users WHERE id = $1
    `,
    [id]
  );

  return result.rows[0] || null;
}

export async function emailExists(email: string): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );

  return result.rows.length > 0;
}

export async function createSession({
  userId,
  ipAddress,
  userAgent,
  expiresInDays = 7,
}: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  expiresInDays?: number;
}): Promise<{ token: string; session: UserSession }> {
  const id = randomUUID();
  const token = generateSessionToken();
  const tokenHash = hashToken(token);
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const result = await pool.query(
    `
    INSERT INTO user_sessions (id, user_id, token_hash, ip_address, user_agent, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, user_id, expires_at, created_at
    `,
    [id, userId, tokenHash, ipAddress || null, userAgent || null, expiresAt]
  );

  return {
    token,  // Raw token, shown only once
    session: result.rows[0],
  };
}

export async function findSessionByToken(token: string): Promise<{
  session_id: string;
  user_id: string;
  email: string;
  name: string | null;
  expires_at: string;
} | null> {
  const tokenHash = hashToken(token);

  const result = await pool.query(
    `
    SELECT 
      s.id as session_id,
      s.user_id,
      s.expires_at,
      u.email,
      u.name
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = $1
      AND s.expires_at > now()
    `,
    [tokenHash]
  );

  return result.rows[0] || null;
}

export async function deleteSession(token: string): Promise<boolean> {
  const tokenHash = hashToken(token);

  const result = await pool.query(
    `DELETE FROM user_sessions WHERE token_hash = $1`,
    [tokenHash]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function deleteAllUserSessions(userId: string): Promise<number> {
  const result = await pool.query(
    `DELETE FROM user_sessions WHERE user_id = $1`,
    [userId]
  );

  return result.rowCount ?? 0;
}