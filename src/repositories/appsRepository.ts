import { pool } from "../infra/db";
import { randomUUID } from "crypto";

/*
 * Apps Repository
 * Manages developer applications. Each app is owned by a user and will eventually own API keys.
 */

export interface App {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  environment: "development" | "production";
  created_at: string;
  updated_at: string;
}

export async function createApp({
  userId,
  name,
  description,
  environment = "development",
}: {
  userId: string;
  name: string;
  description?: string;
  environment?: "development" | "production";
}): Promise<App> {
  const id = randomUUID();

  const result = await pool.query(
    `
    INSERT INTO apps (id, user_id, name, description, environment)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [id, userId, name, description || null, environment]
  );

  return result.rows[0];
}

/*
 * Get app by ID, but only if owned by the specified user.
 * Always filter by user_id to preventone developer from accessing another's apps (tenant isolation).
 */
export async function getAppById(
  id: string,
  userId: string
): Promise<App | null> {
  const result = await pool.query(
    `SELECT * FROM apps WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  return result.rows[0] || null;
}

export async function listAppsByUser(userId: string): Promise<App[]> {
  const result = await pool.query(
    `
    SELECT * FROM apps 
    WHERE user_id = $1 
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function appNameExists(
  userId: string,
  name: string
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM apps WHERE user_id = $1 AND LOWER(name) = LOWER($2)`,
    [userId, name]
  );

  return result.rows.length > 0;
}

export async function updateApp(
  id: string,
  userId: string,
  { name, description }: { name?: string; description?: string }
): Promise<App | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }

  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }

  if (updates.length === 0) {
    return null;
  }

  values.push(id, userId);

  const result = await pool.query(
    `
    UPDATE apps
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
    RETURNING *
    `,
    values
  );

  return result.rows[0] || null;
}

/*
 * Delete an app. This will cascade to delete all API keys.
 */
export async function deleteApp(id: string, userId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM apps WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  return (result.rowCount ?? 0) > 0;
}
