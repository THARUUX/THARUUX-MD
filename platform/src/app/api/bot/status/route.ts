import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getBotServerUrl } from "@/lib/botServer";

export const dynamic = "force-dynamic";

// --- Circuit Breaker ---
// Tracks bot server health in-process memory.
// After BOT_FAIL_THRESHOLD consecutive failures, skip live check for BOT_COOLDOWN_MS ms.
const BOT_FAIL_THRESHOLD = 3;
const BOT_COOLDOWN_MS = 30_000; // 30 seconds cooldown before retrying

let botFailCount = 0;
let botCircuitOpenAt: number | null = null;

function isBotCircuitOpen(): boolean {
  if (botCircuitOpenAt === null) return false;
  if (Date.now() - botCircuitOpenAt > BOT_COOLDOWN_MS) {
    // Cooldown expired — allow one probe attempt (half-open)
    botCircuitOpenAt = null;
    botFailCount = 0;
    return false;
  }
  return true;
}

function recordBotSuccess() {
  botFailCount = 0;
  botCircuitOpenAt = null;
}

function recordBotFailure() {
  botFailCount++;
  if (botFailCount >= BOT_FAIL_THRESHOLD && botCircuitOpenAt === null) {
    botCircuitOpenAt = Date.now();
    console.warn(`[BotStatus] Circuit OPEN after ${botFailCount} failures. Skipping live check for ${BOT_COOLDOWN_MS / 1000}s.`);
  }
}
// ----------------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

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
    // 1. Check live bot engine — skip entirely if circuit is open
    if (!isBotCircuitOpen()) {
      try {
        const botServer = getBotServerUrl();
        const liveRes = await fetch(
          `${botServer}/api/status?userId=${encodeURIComponent(userId)}`,
          { cache: "no-store", signal: AbortSignal.timeout(1500) }
        );

        if (liveRes.ok) {
          const liveData = await liveRes.json();
          if (liveData.userId === userId || liveData.source === "user_bot") {
            recordBotSuccess();
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
        } else {
          recordBotFailure();
        }
      } catch {
        // Timeout or connection error
        recordBotFailure();
      }
    }

    // 2. Fall back to database
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
