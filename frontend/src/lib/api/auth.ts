import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types/auth";
import { Permission } from "@/types/permission";

interface AuthContext {
  userId: string;
  role: UserRole;
  permissions: Permission[];
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: perms }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("user_permissions").select("permission").eq("user_id", user.id),
  ]);

  return {
    userId: user.id,
    role: (profile?.role as UserRole) || "staff",
    permissions: (perms ?? []).map((p) => p.permission as Permission),
  };
}

export function hasPermission(auth: AuthContext, permission: Permission): boolean {
  return auth.permissions.includes(permission);
}

export function isAdminOrHr(role: UserRole): boolean {
  return role === "admin" || role === "hr";
}

export function isManagerOrAbove(role: UserRole): boolean {
  return role === "admin" || role === "hr" || role === "manager";
}
