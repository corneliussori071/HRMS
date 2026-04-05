import { NavItem } from "@/types/navigation";

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin", "hr", "manager", "staff"],
  },
  {
    label: "Attendance",
    href: "/attendance",
    roles: ["admin", "hr", "manager", "staff"],
  },
  {
    label: "Leave Management",
    href: "/leave",
    roles: ["admin", "hr", "manager", "staff"],
  },
  {
    label: "PTO",
    href: "/pto",
    roles: ["admin", "hr", "manager", "staff"],
  },
  {
    label: "Overtime",
    href: "/overtime",
    roles: ["admin", "hr", "manager", "staff"],
  },
  {
    label: "Profile",
    href: "/profile",
    roles: ["admin", "hr", "manager", "staff"],
  },
];

export function getNavItemsForRole(role: string): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role as NavItem["roles"][number]));
}
