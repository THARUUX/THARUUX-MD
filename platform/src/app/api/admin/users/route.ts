import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET all users from profiles table
export async function GET() {
  try {
    const profiles = await queryDb<any>(`
      SELECT 
        p.id,
        p.full_name as name,
        p.email,
        p.phone,
        p.plan,
        p.is_active,
        p.activation_end,
        p.created_at
      FROM public.profiles p
      ORDER BY p.created_at DESC
    `);

    const formattedUsers = profiles.map((p) => {
      let daysRemaining = 0;
      if (p.activation_end) {
        const diff = new Date(p.activation_end).getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      return {
        id: p.id,
        name: p.name || "User",
        email: p.email,
        phone: p.phone || "",
        plan: p.plan || "basic",
        is_active: !!p.is_active,
        activation_end: p.activation_end ? new Date(p.activation_end).toISOString().split("T")[0] : "",
        days_remaining: daysRemaining,
      };
    });

    return NextResponse.json({ success: true, users: formattedUsers });
  } catch (err: any) {
    console.error("GET /api/admin/users error:", err);
    return NextResponse.json({ success: false, error: err.message, users: [] });
  }
}

// POST create a new user profile and auth account
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone, plan, days, initial_password } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const password = initial_password || "Tharuux@2026!";
    const validityDays = Number(days) || 30;

    // Check if user already exists
    const existing = await queryDb("SELECT id FROM public.profiles WHERE email = $1", [email]);
    if (existing.length > 0) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
    }

    // 1. Generate user UUID
    const uuidQuery = await queryDb<{ id: string }>("SELECT gen_random_uuid() as id");
    const userId = uuidQuery[0].id;

    // 2. Create in auth.users
    await queryDb(`
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        $1, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
        $2, crypt($3, gen_salt('bf')), now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        json_build_object('full_name', $4::text),
        now(), now()
      )
    `, [userId, email, password, name]);

    // 3. Create in public.profiles
    const activationEnd = new Date(Date.now() + validityDays * 86400000).toISOString();
    await queryDb(`
      INSERT INTO public.profiles (
        id, full_name, email, phone, role, is_active, plan, activation_start, activation_end
      ) VALUES (
        $1, $2, $3, $4, 'user', true, $5, now(), $6
      )
    `, [userId, name, email, phone || null, plan || "basic", activationEnd]);

    // 4. Create isolated bot instance
    const botInstQuery = await queryDb<{ id: string }>(`
      INSERT INTO public.bot_instances (
        user_id, bot_name, prefix, mode, connection_status
      ) VALUES (
        $1, 'THARUUX-MD', '.', 'public', 'disconnected'
      )
      RETURNING id
    `, [userId]);

    const botId = botInstQuery[0]?.id;

    // 5. Create default isolated bot configs
    if (botId) {
      await queryDb(`
        INSERT INTO public.bot_configs (
          bot_id, sticker_pack_name, sticker_author, alive_message, sudo_numbers
        ) VALUES (
          $1, 'THARUUX-MD', 'THARUUX🍀', '👋 Hey there! *THARUUX-MD* is active.', $2
        )
      `, [botId, phone ? [phone] : []]);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        name,
        email,
        phone,
        plan,
        is_active: true,
        activation_end: activationEnd.split("T")[0],
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH update user status, plan, subscription, or password
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, is_active, plan, days_to_add, password } = body;

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    if (password) {
      if (typeof password !== "string" || password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters long" }, { status: 400 });
      }
      await queryDb(`
        UPDATE auth.users
        SET encrypted_password = crypt($1, gen_salt('bf')), updated_at = now()
        WHERE id = $2
      `, [password, id]);
    }

    if (typeof is_active === "boolean") {
      await queryDb("UPDATE public.profiles SET is_active = $1, updated_at = now() WHERE id = $2", [
        is_active,
        id,
      ]);
    }

    if (plan) {
      await queryDb("UPDATE public.profiles SET plan = $1, updated_at = now() WHERE id = $2", [
        plan,
        id,
      ]);
    }

    if (days_to_add) {
      await queryDb(`
        UPDATE public.profiles 
        SET 
          activation_end = GREATEST(COALESCE(activation_end, now()), now()) + ($1 || ' days')::interval,
          is_active = true,
          updated_at = now()
        WHERE id = $2
      `, [Number(days_to_add), id]);
    }

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (err: any) {
    console.error("PATCH /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE a user
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Deleting from auth.users cascades to public.profiles and public.bot_instances
    await queryDb("DELETE FROM auth.users WHERE id = $1", [id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/admin/users error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
