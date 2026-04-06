import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, email, password } = body;

    if (!full_name || !email || !password) {
      return NextResponse.json(
        { error: "Full name, email, and password are required." },
        { status: 400 }
      );
    }

    if (typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if any admin already exists
    const { data: existingAdmins, error: checkError } = await supabase
      .from("profiles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (checkError) {
      return NextResponse.json(
        { error: "Failed to verify account status." },
        { status: 500 }
      );
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return NextResponse.json(
        {
          error:
            "An admin account already exists. Contact your administrator for access.",
        },
        { status: 409 }
      );
    }

    // Create the auth user (auto-confirmed, trigger creates profile)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Promote profile to admin role
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "admin", full_name })
      .eq("id", authData.user.id);

    if (updateError) {
      return NextResponse.json(
        {
          error:
            "Account created but failed to set admin role. Contact support.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: { message: "Admin account created successfully." },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
