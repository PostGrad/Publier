import { pool } from "../infra/db";

/*
Updates the content of a post.
Currently only `content` is mutable via PATCH.
If more fields become mutable, consider dynamic query building.
*/

export async function updatePost(id: string, content: string) {
  const result = await pool.query(
    `UPDATE posts SET content = $1 WHERE id = $2 RETURNING *`,
    [content, id]
  );

  return result.rows[0] || null;
}
