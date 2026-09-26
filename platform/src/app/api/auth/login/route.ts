import { NextResponse } from "next/server";
import { queryDb, getDbPool } from "@/lib/db";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // 1. Check auth.users with pgcrypto password verification
    const users = await queryDb<any>(`
      SELECT 
        u.id,
        u.email,
        p.full_name,
        p.role,
        p.is_active,
        p.plan,
        p.activation_end
      FROM auth.users u
      LEFT JOIN public.profiles p ON p.id = u.id
      WHERE LOWER(u.email) = LOWER($1)
        AND u.encrypted_password = crypt($2, u.encrypted_password)
      LIMIT 1
    `, [email, password]);

    if (users.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const user = users[0];

    // Check account active state (except for admin)
    if (user.role !== "admin" && !user.is_active) {
      return NextResponse.json(
        { error: "Your account is currently inactive or pending administrator approval. Please contact THARUUX." },
        { status: 403 }
      );
    }

    // Check validity expiry
    if (user.role !== "admin" && user.activation_end && new Date(user.activation_end).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Your subscription period has expired. Please contact the administrator to renew." },
        { status: 403 }
      );
    }

    // Set auth cookie
    const cookieStore = await cookies();
    cookieStore.set("tharuux_session", JSON.stringify({
      id: user.id,
      email: user.email,
      name: user.full_name || "User",
      role: user.role || "user",
      plan: user.plan || "basic",
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name || "User",
        role: user.role || "user",
        plan: user.plan || "basic",
      },
    });
  } catch (err: any) {
    console.error("Auth login route error:", err);
    let targetHost = "unknown";
    try {
      const p = getDbPool();
      targetHost = (p.options as any)?.host || "no-host";
    } catch {}
    return NextResponse.json(
      {
        error: "Unable to complete login request. Please verify your credentials and try again.",
        details: `${err?.message || String(err)} (target: ${targetHost})`,
      },
      { status: 500 }
    );
  }
}
