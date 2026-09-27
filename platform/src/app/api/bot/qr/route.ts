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
      signal: AbortSignal.timeout(25000),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("QR trigger error:", err);
    const isTimeout = err?.name === "TimeoutError" || err?.message?.includes("abort");
    return NextResponse.json(
      { error: isTimeout
          ? "Bot server is unreachable. Please ensure your bot engine is deployed and running."
          : (err.message || "Failed to trigger QR") },
      { status: 503 }
    );
  }
}
