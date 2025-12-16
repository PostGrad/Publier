import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function connectDB() {
  await pool.query("SELECT 1");
}
