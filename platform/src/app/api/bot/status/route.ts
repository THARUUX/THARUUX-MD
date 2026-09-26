import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getBotServerUrl } from "@/lib/botServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  // If no userId provided, cannot return user-specific bot details
  if (!userId) {
    return NextResponse.json({
      success: true,
      source: "no_user",
      hasSession: false,
      connectionState: "disconnected",
      isBotRunning: false,
      user: null,
      botMode: "public",
      commandsCount: 110,
      pluginsCount: 12,
      plugins: ["anime","audio","converter","downloader","fun","games","group","logo","main","owner","plugins","tools"],
      prefix: ".",
      uptime: 0,
    });
  }

  try {
    // 1. Check live bot engine on Fly.io / local server SPECIFICALLY for this userId
    try {
      const botServer = getBotServerUrl();
      const liveRes = await fetch(
        `${botServer}/api/status?userId=${encodeURIComponent(userId)}`,
        { cache: "no-store", signal: AbortSignal.timeout(2000) }
      );

      if (liveRes.ok) {
        const liveData = await liveRes.json();
        // ONLY accept live data if it explicitly matches this user or has user-specific session
        if (liveData.userId === userId || liveData.source === "user_bot") {
          return NextResponse.json({
            success: true,
            source: "live_user_bot",
            hasSession: !!liveData.hasSession,
            connectionState: liveData.connectionState || "disconnected",
            isBotRunning: !!liveData.isBotRunning,
            user: liveData.user || null,
            currentQR: liveData.currentQR || null,
            currentPairingCode: liveData.currentPairingCode || null,
            botMode: liveData.botMode || "public",
            commandsCount: liveData.commandsCount || 110,
            pluginsCount: liveData.pluginsCount || 12,
            plugins: liveData.plugins || [],
            prefix: liveData.prefix || ".",
            uptime: liveData.uptime || 0,
          });
        }
      }
    } catch {
      // Local engine offline or timed out
    }

    // 2. Query persistent database record for THIS user ONLY
    const rows = await queryDb<any>(`
      SELECT 
        bi.connection_status,
        bi.whatsapp_number,
        bi.whatsapp_name,
        bi.prefix,
        bi.mode,
        bi.last_connected_at,
        p.full_name
      FROM public.bot_instances bi
      JOIN public.profiles p ON p.id = bi.user_id
      WHERE bi.user_id = $1
      LIMIT 1
    `, [userId]);

    const botRow = rows[0];

    if (!botRow) {
      // User has no bot instance row in DB yet
      return NextResponse.json({
        success: true,
        source: "database_empty",
        hasSession: false,
        connectionState: "disconnected",
        isBotRunning: false,
        user: null,
        botMode: "public",
        commandsCount: 110,
        pluginsCount: 12,
        plugins: ["anime","audio","converter","downloader","fun","games","group","logo","main","owner","plugins","tools"],
        prefix: ".",
        uptime: 0,
      });
    }

    const isConnected = botRow.connection_status === "connected";
    const hasLinkedPhone = !!botRow.whatsapp_number;

    return NextResponse.json({
      success: true,
      source: "database",
      hasSession: isConnected && hasLinkedPhone,
      connectionState: botRow.connection_status || "disconnected",
      isBotRunning: isConnected,
      user: hasLinkedPhone ? {
        phone: botRow.whatsapp_number,
        name: botRow.whatsapp_name || botRow.full_name || "WhatsApp User",
      } : null,
      botMode: botRow.mode || "public",
      commandsCount: 110,
      pluginsCount: 12,
      plugins: ["anime","audio","converter","downloader","fun","games","group","logo","main","owner","plugins","tools"],
      prefix: botRow.prefix || ".",
      uptime: 0,
    });
  } catch (err: any) {
    console.error("Status route error for user", userId, err);
    return NextResponse.json({
      success: false,
      error: err.message,
      hasSession: false,
      connectionState: "disconnected",
      isBotRunning: false,
      user: null,
      botMode: "public",
      prefix: ".",
    });
  }
}
