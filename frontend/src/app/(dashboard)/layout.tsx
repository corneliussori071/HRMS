import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { Permission } from "@/types/permission";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: profile }, { data: perms }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("user_permissions").select("permission").eq("user_id", user.id),
  ]);

  const userName = profile?.full_name || user.email || "User";
  const permissions = (perms ?? []).map((p) => p.permission as Permission);

  return (
    <DashboardShell userName={userName} permissions={permissions}>
      {children}
    </DashboardShell>
  );
}
