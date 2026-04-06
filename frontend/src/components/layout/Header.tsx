"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown, LogOut } from "lucide-react";
import { NavItem } from "@/types/navigation";
import { APP_NAME } from "@/config/env";

interface HeaderProps {
  navItems: NavItem[];
  userName: string;
  onSignOut: () => void;
}

export default function Header({ navItems, userName, onSignOut }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-md p-2 text-muted hover:text-foreground lg:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/dashboard" className="text-base font-semibold text-foreground">
            {APP_NAME}
          </Link>
        </div>

        <div className="relative">
          <button
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground"
          >
            {userName}
            <ChevronDown size={14} />
          </button>

          {profileMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-border bg-background py-1 shadow-lg">
              <Link
                href="/profile"
                onClick={() => setProfileMenuOpen(false)}
                className="block px-4 py-2 text-sm text-foreground hover:bg-surface"
              >
                Profile
              </Link>
              <button
                onClick={() => {
                  setProfileMenuOpen(false);
                  onSignOut();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-surface"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      {mobileMenuOpen && (
        <nav className="border-t border-border px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
