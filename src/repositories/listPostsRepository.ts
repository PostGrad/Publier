import { pool } from "../infra/db";

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
  let where = [];

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
