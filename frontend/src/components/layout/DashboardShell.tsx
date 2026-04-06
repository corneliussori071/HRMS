"use client";

import { ReactNode, useCallback } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { getNavItemsForPermissions } from "@/config/navigation";
import { createClient } from "@/lib/supabase/client";
import { Permission } from "@/types/permission";

interface DashboardShellProps {
  children: ReactNode;
  userName: string;
  permissions: Permission[];
}

export default function DashboardShell({ children, userName, permissions }: DashboardShellProps) {
  const router = useRouter();
  const navItems = getNavItemsForPermissions(permissions);

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header navItems={navItems} userName={userName} onSignOut={handleSignOut} />
      <div className="flex flex-1">
        <Sidebar navItems={navItems} />
        <div className="flex flex-1 flex-col">
          {children}
          <Footer />
        </div>
      </div>
    </div>
  );
}
