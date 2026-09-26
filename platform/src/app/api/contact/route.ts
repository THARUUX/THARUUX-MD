import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, message, plan_interest } = body;

    if (!name || !email || !phone) {
      return NextResponse.json(
        { error: "Name, email, and WhatsApp phone number are required." },
        { status: 400 }
      );
    }

    const inserted = await queryDb<any>(`
      INSERT INTO public.contact_requests (
        name, email, phone, message, plan_interest, status
      ) VALUES (
        $1, $2, $3, $4, $5, 'pending'
      )
      RETURNING *
    `, [name, email, phone, message || "", plan_interest || "basic"]);

    return NextResponse.json(
      {
        success: true,
        message: "Your request has been received! THARUUX will contact you via WhatsApp / Email.",
        request: inserted[0],
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("POST /api/contact error:", err);
    return NextResponse.json(
      { error: "Failed to submit request to database: " + err.message },
      { status: 500 }
    );
  }
}
