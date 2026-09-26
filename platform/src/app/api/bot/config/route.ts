import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";
import { getBotServerUrl } from "@/lib/botServer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({
        success: true,
        config: {
          bot_name: "THARUUX-MD",
          prefix: ".",
          mode: "public",
          sticker_pack_name: "THARUUX-MD",
          sticker_author: "THARUUX🍀",
          alive_message: "👋 Hey there! *THARUUX-MD* is active and running smooth.",
          alive_image_url: "",
          audio_title: "THARUUX-MD Official",
          audio_artist: "THARUUX",
          auto_read: false,
          auto_react: true,
          auto_status_view: true,
          auto_call_reject: true,
          call_reject_message: "📵 Automatic Notice: Voice and video calls are not supported on this automated line.",
          sudo_numbers: "",
        },
      });
    }

    const configs = await queryDb<any>(`
      SELECT 
        bc.*,
        bi.bot_name,
        bi.prefix,
        bi.mode
      FROM public.bot_configs bc
      JOIN public.bot_instances bi ON bi.id = bc.bot_id
      WHERE bi.user_id = $1
      LIMIT 1
    `, [userId]);

    if (configs.length === 0) {
      return NextResponse.json({
        success: true,
        config: {
          bot_name: "THARUUX-MD",
          prefix: ".",
          mode: "public",
          sticker_pack_name: "THARUUX-MD",
          sticker_author: "THARUUX🍀",
          alive_message: "👋 Hey there! *THARUUX-MD* is active and running smooth.",
          alive_image_url: "",
          audio_title: "THARUUX-MD Official",
          audio_artist: "THARUUX",
          auto_read: false,
          auto_react: true,
          auto_status_view: true,
          auto_call_reject: true,
          call_reject_message: "📵 Automatic Notice: Voice and video calls are not supported on this automated line.",
          sudo_numbers: "",
        },
      });
    }

    const data = configs[0];
    return NextResponse.json({
      success: true,
      config: {
        bot_name: data.bot_name || "THARUUX-MD",
        prefix: data.prefix || ".",
        mode: data.mode || "public",
        sticker_pack_name: data.sticker_pack_name || "THARUUX-MD",
        sticker_author: data.sticker_author || "THARUUX🍀",
        alive_message: data.alive_message || "👋 Hey there! *THARUUX-MD* is active.",
        alive_image_url: data.alive_image_url || "",
        audio_title: data.audio_title || "THARUUX-MD Official",
        audio_artist: data.audio_artist || "THARUUX",
        auto_read: !!data.auto_read,
        auto_react: !!data.auto_react,
        auto_status_view: !!data.auto_status_view,
        auto_call_reject: !!data.auto_call_reject,
        call_reject_message: data.call_reject_message || "",
        sudo_numbers: Array.isArray(data.sudo_numbers) ? data.sudo_numbers.join(", ") : "",
      },
    });
  } catch (err: any) {
    console.error("GET /api/bot/config error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, ...settings } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required to update bot configuration." }, { status: 400 });
    }

    // Find user's isolated bot instance
    const inst = await queryDb<{ id: string }>(
      "SELECT id FROM public.bot_instances WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    let botId = inst[0]?.id;
    if (!botId) {
      // Auto-provision bot instance if missing
      const newInst = await queryDb<{ id: string }>(
        "INSERT INTO public.bot_instances (user_id, bot_name, prefix, mode, connection_status) VALUES ($1, 'THARUUX-MD', '.', 'public', 'disconnected') RETURNING id",
        [userId]
      );
      botId = newInst[0]?.id;
    }

    if (!botId) {
      return NextResponse.json({ error: "No bot instance found for this user account" }, { status: 404 });
    }

    // Update bot_instances prefix & mode
    if (settings.prefix || settings.mode || settings.bot_name) {
      await queryDb(`
        UPDATE public.bot_instances
        SET 
          prefix = COALESCE($1, prefix),
          mode = COALESCE($2, mode),
          bot_name = COALESCE($3, bot_name),
          updated_at = now()
        WHERE id = $4
      `, [settings.prefix, settings.mode, settings.bot_name, botId]);
    }

    const sudoArray = typeof settings.sudo_numbers === "string"
      ? settings.sudo_numbers.split(",").map((s: string) => s.trim().replace(/[^0-9]/g, "")).filter(Boolean)
      : settings.sudo_numbers || [];

    // Upsert into bot_configs
    await queryDb(`
      INSERT INTO public.bot_configs (
        bot_id, sticker_pack_name, sticker_author, alive_message,
        alive_image_url, audio_title, audio_artist, auto_read,
        auto_react, auto_status_view, auto_call_reject, call_reject_message,
        sudo_numbers, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now()
      )
      ON CONFLICT (bot_id) DO UPDATE SET
        sticker_pack_name = EXCLUDED.sticker_pack_name,
        sticker_author = EXCLUDED.sticker_author,
        alive_message = EXCLUDED.alive_message,
        alive_image_url = EXCLUDED.alive_image_url,
        audio_title = EXCLUDED.audio_title,
        audio_artist = EXCLUDED.audio_artist,
        auto_read = EXCLUDED.auto_read,
        auto_react = EXCLUDED.auto_react,
        auto_status_view = EXCLUDED.auto_status_view,
        auto_call_reject = EXCLUDED.auto_call_reject,
        call_reject_message = EXCLUDED.call_reject_message,
        sudo_numbers = EXCLUDED.sudo_numbers,
        updated_at = now()
    `, [
      botId,
      settings.sticker_pack_name,
      settings.sticker_author,
      settings.alive_message,
      settings.alive_image_url || null,
      settings.audio_title,
      settings.audio_artist,
      !!settings.auto_read,
      !!settings.auto_react,
      !!settings.auto_status_view,
      !!settings.auto_call_reject,
      settings.call_reject_message,
      sudoArray,
    ]);

    // Notify bot engine to refresh in-memory config for this user
    try {
      const botServer = getBotServerUrl();
      await fetch(`${botServer}/api/bot/config-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch {}

    return NextResponse.json({ success: true, message: "Settings saved successfully to database." });
  } catch (err: any) {
    console.error("POST /api/bot/config error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
