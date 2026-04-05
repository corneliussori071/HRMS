import { UserRole } from "./auth";

export interface NavItem {
  label: string;
  href: string;
  roles: UserRole[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}
