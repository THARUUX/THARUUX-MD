import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    let connectionString =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_URI ||
      "";

    // Ensure connection always uses the verified IPv4/IPv6 Supabase pooler
    if (!connectionString.includes("aws-0-ap-south-1.pooler.supabase.com")) {
      connectionString = "postgresql://postgres.pjetqsuhocnrqhblgmjd:Ldx0r4QP576Www4t@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";
    }

    pool = new Pool({
      connectionString,
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
