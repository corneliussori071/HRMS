export interface Shift {
  id: string;
  department_id: string;
  name: string;
  short_key: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  min_hours_per_week: number;
  max_hours_per_week: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShiftWithDepartment extends Shift {
  department: {
    id: string;
    name: string;
  };
}
