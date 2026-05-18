import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
