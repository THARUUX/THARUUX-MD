import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getBotServerUrl } from "@/lib/botServer";

export async function POST(request: Request) {
  try {
    const { phone, userId } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    try {
      const botServer = getBotServerUrl();
      const res = await fetch(`${botServer}/api/session/pairing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, userId }),
        signal: AbortSignal.timeout(30000),
      });

      const data = await res.json();
      if (!res.ok || !data.code) {
        return NextResponse.json(
          { error: data.error || "Failed to negotiate pairing code with WhatsApp servers." },
          { status: res.status || 500 }
        );
      }

      // Update database with active pairing request
      await queryDb(
        "UPDATE public.bot_instances SET pairing_code = $1, whatsapp_number = $2, connection_status = 'connecting', updated_at = now() WHERE user_id = $3",
        [data.code, phone, userId]
      );

      return NextResponse.json(data);
    } catch (e: any) {
      console.error("Pairing backend communication error:", e);
      return NextResponse.json(
        { error: "Bot server is initializing or temporarily unreachable. Please try again in 5 seconds." },
        { status: 503 }
      );
    }
  } catch (err: any) {
    console.error("Pairing route error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
