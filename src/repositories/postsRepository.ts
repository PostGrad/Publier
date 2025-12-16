import { pool } from "../infra/db";
import { randomUUID } from "crypto";

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
