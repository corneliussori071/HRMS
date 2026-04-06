export const PERMISSIONS = [
  "review_leaves",
  "manage_users",
  "users_page",
  "leave_settings",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  review_leaves: "Review Leaves",
  manage_users: "Manage Users",
  users_page: "Users Page",
  leave_settings: "Leave Settings",
};

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  review_leaves: "Approve, reject, and reduce leave requests",
  manage_users: "Create, edit, and delete user accounts",
  users_page: "View the Users page in navigation",
  leave_settings: "Access and configure leave settings",
};

export interface UserPermission {
  id: string;
  user_id: string;
  permission: Permission;
  granted_by: string | null;
  created_at: string;
}
