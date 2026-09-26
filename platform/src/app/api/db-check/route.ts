import { NextResponse } from "next/server";
import { queryDb, getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rawUrl = process.env.DATABASE_URL || "fallback";
    const masked = rawUrl.replace(/:[^:@]+@/, ":****@");
    
    const rows = await queryDb<{ ok: number }>("SELECT 1 as ok");
    return NextResponse.json({
      status: "connected",
      configuredHost: masked,
      result: rows[0],
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "error",
        errorName: err.name,
        errorMessage: err.message,
        errorCode: err.code,
      },
      { status: 500 }
    );
  }
}
