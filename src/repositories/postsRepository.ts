import { pool } from "../infra/db";
import { randomUUID } from "crypto";

/**
 * Posts Repository
 *
 * All database operations for the posts resource.
 * Kept in a single file for clarity — if complexity grows,
 * consider splitting by read/write or by feature.
 */

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export async function createPost({
  content,
  scheduledAt,
}: {
  content: string;
  scheduledAt?: string;
}) {
  const id = randomUUID();
  const status = scheduledAt ? "scheduled" : "draft";

  const result = await pool.query(
    `
    INSERT INTO posts (id, content, status, scheduled_at)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [id, content, status, scheduledAt ?? null]
  );

  return result.rows[0];
}

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

export async function getPostById(id: string) {
  const result = await pool.query(`SELECT * FROM posts WHERE id = $1`, [id]);

  return result.rows[0] || null;
}

export async function listPosts({
  limit,
  cursor,
  status,
  order,
}: {
  limit: number;
  cursor?: string;
  status?: string;
  order: "asc" | "desc";
}) {
  const values: any[] = [];
  const where: string[] = [];

  if (status) {
    values.push(status);
    where.push(`status = $${values.length}`);
  }

  if (cursor) {
    values.push(cursor);
    where.push(`created_at ${order === "asc" ? ">" : "<"} $${values.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  values.push(limit + 1);

  const result = await pool.query(
    `
    SELECT *
    FROM posts
    ${whereClause}
    ORDER BY created_at ${order}
    LIMIT $${values.length}
    `,
    values
  );

  return result.rows;
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

export async function updatePost(id: string, content: string) {
  const result = await pool.query(
    `
    UPDATE posts
    SET content = $1
    WHERE id = $2
    RETURNING *
    `,
    [content, id]
  );

  return result.rows[0] || null;
}

// ─────────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────────

export async function schedulePost(id: string, scheduledAt: string) {
  const result = await pool.query(
    `
    UPDATE posts
    SET status = 'scheduled', scheduled_at = $1
    WHERE id = $2 AND status = 'draft'
    RETURNING *
    `,
    [scheduledAt, id]
  );

  return result.rows[0] || null;
}
