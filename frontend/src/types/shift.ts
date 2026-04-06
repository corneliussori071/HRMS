export interface Shift {
  id: string;
  department_id: string;
  name: string;
  start_time: string;
  end_time: string;
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
