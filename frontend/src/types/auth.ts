export type UserRole = "admin" | "hr" | "manager" | "staff";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
}
