import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getBotServerUrl } from "@/lib/botServer";

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // 1. Notify bot engine to terminate socket and delete session directory
    try {
      const botServer = getBotServerUrl();
      await fetch(`${botServer}/api/session/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch (e) {
      // Backend offline or unreachable
    }

    // 2. Mark disconnected in database
    await queryDb(`
      UPDATE public.bot_instances
      SET 
        connection_status = 'disconnected',
        whatsapp_number = NULL,
        whatsapp_name = NULL,
        pairing_code = NULL,
        updated_at = now()
      WHERE user_id = $1
    `, [userId]);

    return NextResponse.json({ success: true, message: "Bot disconnected successfully" });
  } catch (err: any) {
    console.error("Logout route error:", err);
    return NextResponse.json({ error: err.message || "Failed to disconnect bot" }, { status: 500 });
  }
}
