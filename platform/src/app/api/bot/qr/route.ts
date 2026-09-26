import { NextResponse } from "next/server";
import { getBotServerUrl } from "@/lib/botServer";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const botServer = getBotServerUrl();
    const res = await fetch(`${botServer}/api/session/qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("QR trigger error:", err);
    return NextResponse.json({ error: err.message || "Failed to trigger QR" }, { status: 500 });
  }
}
