import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [profiles, requests] = await Promise.all([
      queryDb<{ id: string; role: string; is_active: boolean; plan: string }>(
        "SELECT id, role, is_active, plan FROM public.profiles"
      ),
      queryDb<{ id: string; status: string }>(
        "SELECT id, status FROM public.contact_requests"
      ),
    ]);

    const totalUsers = profiles.length;
    const activeBots = profiles.filter((p) => p.is_active).length;
    const pendingRequests = requests.filter((r) => r.status === "pending").length;

    // Plan pricing: basic=1500, premium=2500, business=5000
    const planPrices: Record<string, number> = {
      basic: 1500,
      premium: 2500,
      business: 5000,
    };

    const monthlyRevenue = profiles
      .filter((p) => p.is_active)
      .reduce((sum, p) => sum + (planPrices[p.plan] || 2500), 0);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        activeBots,
        pendingRequests,
        monthlyRevenue,
      },
    });
  } catch (err: any) {
    console.error("Stats API error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        stats: {
          totalUsers: 0,
          activeBots: 0,
          pendingRequests: 0,
          monthlyRevenue: 0,
        },
      },
      { status: 200 }
    );
  }
}
