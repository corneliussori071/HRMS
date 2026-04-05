import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types/auth";

interface AuthContext {
  userId: string;
  role: UserRole;
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    userId: user.id,
    role: (profile?.role as UserRole) || "staff",
  };
}

export function isAdminOrHr(role: UserRole): boolean {
  return role === "admin" || role === "hr";
}

export function isManagerOrAbove(role: UserRole): boolean {
  return role === "admin" || role === "hr" || role === "manager";
}
