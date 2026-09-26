import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const requests = await queryDb<any>(`
      SELECT 
        id,
        name,
        email,
        phone,
        plan_interest,
        message,
        status,
        created_at
      FROM public.contact_requests
      ORDER BY created_at DESC
    `);

    return NextResponse.json({ success: true, requests: requests || [] });
  } catch (err: any) {
    console.error("GET /api/admin/requests error:", err);
    return NextResponse.json({ success: false, error: err.message, requests: [] });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();
    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    await queryDb(
      "UPDATE public.contact_requests SET status = $1, updated_at = now() WHERE id = $2",
      [status, id]
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/admin/requests error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
