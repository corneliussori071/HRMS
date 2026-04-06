export type LeaveSystemType = "pto" | "fixed" | "both";

export interface LeaveType {
  id: string;
  name: string;
  description: string | null;
  system_type: "pto" | "fixed";
  max_days_per_year: number;
  is_active: boolean;
  requires_approval: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeaveAllocation {
  id: string;
  leave_type_id: string;
  role: string;
  days_per_year: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  year: number;
  used_days: number;
  adjustment_days: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveBalanceWithType extends LeaveBalance {
  leave_type: LeaveType;
}
