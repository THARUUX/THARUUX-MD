import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await queryDb<{ key: string; value: any }>(
      "SELECT key, value FROM public.global_configs"
    );

    const configMap: Record<string, any> = {};
    rows.forEach((row) => {
      configMap[row.key] = row.value;
    });

    return NextResponse.json({ success: true, config: configMap });
  } catch (err: any) {
    console.error("GET /api/admin/config error:", err);
    return NextResponse.json({ success: false, error: err.message });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    for (const [key, value] of Object.entries(body)) {
      await queryDb(`
        INSERT INTO public.global_configs (key, value, updated_at)
        VALUES ($1, $2::jsonb, now())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
      `, [key, JSON.stringify(value)]);
    }

    return NextResponse.json({ success: true, message: "Global configurations saved successfully." });
  } catch (err: any) {
    console.error("POST /api/admin/config error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
