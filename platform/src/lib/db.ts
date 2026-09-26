import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const rawUrl =
      process.env.DATABASE_URL ||
      process.env.SUPABASE_URI ||
      "";

    // Verified Supabase IPv4 Pooler credentials
    let host = "aws-0-ap-south-1.pooler.supabase.com";
    let port = 5432;
    let user = "postgres.pjetqsuhocnrqhblgmjd";
    let password = "Ldx0r4QP576Www4t";
    let database = "postgres";

    if (rawUrl && rawUrl.startsWith("postgres")) {
      try {
        const u = new URL(rawUrl);
        // Only use parsed host if it is valid and not legacy/broken host
        if (
          u.hostname &&
          u.hostname !== "base" &&
          !u.hostname.includes("db.pjetqsuhocnrqhblgmjd.supabase.co")
        ) {
          host = u.hostname;
          if (u.port) port = parseInt(u.port, 10);
          if (u.username) user = decodeURIComponent(u.username);
          if (u.password) password = decodeURIComponent(u.password);
          if (u.pathname && u.pathname.length > 1) database = u.pathname.slice(1);
        }
      } catch {}
    }

    // Explicitly pass host, port, user, password to override any ambient PGHOST/PGDATABASE env vars in Vercel
    pool = new Pool({
      host,
      port,
      user,
      password,
      database,
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
