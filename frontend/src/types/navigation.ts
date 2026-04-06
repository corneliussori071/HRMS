import { Permission } from "./permission";

export interface NavItem {
  label: string;
  href: string;
  requiredPermission?: Permission;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}
