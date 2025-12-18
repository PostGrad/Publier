import { pool } from "../infra/db";

/*
 Fetches a single post by its UUID.
 Returns the post row if found, or null if not.
*/

export async function getPostById(id: string) {
  const result = await pool.query(`SELECT * FROM posts WHERE id = $1 LIMIT 1`, [
    id,
  ]);

  return result.rows[0] || null;
}
