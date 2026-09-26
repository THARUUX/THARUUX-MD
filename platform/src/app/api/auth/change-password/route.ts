import { NextResponse } from "next/server";
import { queryDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { userId, currentPassword, newPassword } = await request.json();

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Verify current password
    const checkUser = await queryDb<any>(`
      SELECT id 
      FROM auth.users 
      WHERE id = $1 
        AND encrypted_password = crypt($2, encrypted_password)
      LIMIT 1
    `, [userId, currentPassword]);

    if (checkUser.length === 0) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 401 }
      );
    }

    // Update with new password
    await queryDb(`
      UPDATE auth.users 
      SET encrypted_password = crypt($1, gen_salt('bf')), updated_at = now() 
      WHERE id = $2
    `, [newPassword, userId]);

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err: any) {
    console.error("Change password error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
