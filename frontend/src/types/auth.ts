export type UserRole = "admin" | "hr" | "manager" | "staff";

export type EmploymentType = "full_time" | "part_time" | "contract" | "temporary";

export type PayType = "hourly" | "monthly";

export type AccountStatus = "active" | "suspended" | "terminated";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department_id: string | null;
  avatar_url: string | null;
  phone: string | null;
  rank_id: string | null;
  staffing_category_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  date_of_employment: string | null;
  employment_type: EmploymentType;
  pay_type: PayType;
  pay_rate: number;
  bank_name: string | null;
  bank_account_number: string | null;
  tax_id: string | null;
  status: AccountStatus;
  shift_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
}
