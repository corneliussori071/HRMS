import { NavItem } from "@/types/navigation";
import { Permission } from "@/types/permission";

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
  },
  {
    label: "Attendance",
    href: "/attendance",
  },
  {
    label: "Leave Management",
    href: "/leave",
  },
  {
    label: "Overtime",
    href: "/overtime",
  },
  {
    label: "Users",
    href: "/admin/users",
    requiredPermission: "users_page",
  },
  {
    label: "Departments",
    href: "/admin/departments",
    requiredPermission: "manage_users",
  },
  {
    label: "Leave Settings",
    href: "/admin/leave-settings",
    requiredPermission: "leave_settings",
  },
  {
    label: "Profile",
    href: "/profile",
  },
];

export function getNavItemsForPermissions(permissions: Permission[]): NavItem[] {
  const permSet = new Set(permissions);
  return NAV_ITEMS.filter((item) => {
    if (!item.requiredPermission) return true;
    return permSet.has(item.requiredPermission);
  });
}
