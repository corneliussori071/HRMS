export interface StaffingCategory {
  id: string;
  department_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rank {
  id: string;
  department_id: string;
  name: string;
  level: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
