import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await queryDb<{ key: string; value: any }>(
      "SELECT key, value FROM public.global_configs WHERE key LIKE '%image%' OR key LIKE '%banner%' OR key LIKE '%logo%' OR key LIKE '%icon%' OR key LIKE '%thumb%'"
    );

    const configMap: Record<string, string> = {
      brand_icon_url: "/images/icon.png",
      brand_logo_wording_url: "/images/logo-wording.png",
      brand_logo_url: "/images/logo.png",
      hero_banner_url: "/images/banner.png",
      default_alive_image: "https://tharuux.lk/images/banner.png",
      default_menu_banner: "https://tharuux.lk/images/logo.png",
      default_audio_thumb: "https://tharuux.lk/images/logo.png",
    };

    rows.forEach((row) => {
      if (typeof row.value === "string") {
        configMap[row.key] = row.value;
      }
    });

    return NextResponse.json({ success: true, branding: configMap });
  } catch (err: any) {
    console.error("GET /api/branding error:", err);
    return NextResponse.json({
      success: true,
      branding: {
        brand_icon_url: "/images/icon.png",
        brand_logo_wording_url: "/images/logo-wording.png",
        brand_logo_url: "/images/logo.png",
        hero_banner_url: "/images/banner.png",
        default_alive_image: "https://tharuux.lk/images/banner.png",
        default_menu_banner: "https://tharuux.lk/images/logo.png",
        default_audio_thumb: "https://tharuux.lk/images/logo.png",
      },
    });
  }
}
