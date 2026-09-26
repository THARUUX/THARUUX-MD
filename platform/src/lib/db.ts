import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    // Explicitly pass the verified Supabase IPv4/IPv6 pooler credentials
    // This completely prevents ambient environment variables (like PGHOST=base) in Vercel from interfering
    pool = new Pool({
      host: "aws-0-ap-south-1.pooler.supabase.com",
      port: 5432,
      user: "postgres.pjetqsuhocnrqhblgmjd",
      password: "Ldx0r4QP576Www4t",
      database: "postgres",
      ssl: {
        rejectUnauthorized: false,
      },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on("error", (err) => {
      console.warn("Unexpected PG pool error:", err.message);
      pool = null;
    });
  }
  return pool;
}

export async function queryDb<T = any>(text: string, params?: any[]): Promise<T[]> {
  try {
    const p = getDbPool();
    const res = await p.query(text, params);
    return res.rows;
  } catch (err: any) {
    console.warn("queryDb error, resetting pool and retrying once:", err.message);
    if (pool) {
      try { await pool.end(); } catch {}
      pool = null;
    }
    const p = getDbPool();
    const res = await p.query(text, params);
    return res.rows;
  }
}
