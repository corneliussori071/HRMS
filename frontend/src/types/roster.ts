export type RosterStatus = "draft" | "published" | "archived";

export interface Roster {
  id: string;
  title: string;
  department_id: string;
  start_date: string;
  end_date: string;
  status: RosterStatus;
  allow_self_scheduling: boolean;
  min_staff_per_shift: number;
  max_staff_per_shift: number;
  completion_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RosterShift {
  id: string;
  roster_id: string;
  shift_id: string;
}

export interface RosterStaff {
  id: string;
  roster_id: string;
  user_id: string;
  is_included: boolean;
}

export interface RosterAssignment {
  id: string;
  roster_id: string;
  user_id: string;
  date: string;
  shift_id: string | null;
  is_manual_override: boolean;
  created_at: string;
  updated_at: string;
}

export interface RosterWithDetails extends Roster {
  department: { id: string; name: string };
  roster_shifts: { shift_id: string }[];
  roster_staff: { user_id: string; is_included: boolean }[];
}

export interface RosterAssignmentRow {
  user_id: string;
  full_name: string;
  rank_name: string | null;
  assignments: Record<string, string | null>;
}

export interface UnderstaffedSlot {
  date: string;
  shift_id: string;
  shift_name: string;
  shift_key: string;
  assigned_count: number;
  min_required: number;
}

export interface GenerationConfig {
  minRestBetweenShiftsMinutes: number;
  maxHoursPerDay: number;
  shiftsPerDay: number;
  maxIterations?: number;
}

export interface GenerationInput {
  shifts: GenerationShift[];
  staff: GenerationStaffMember[];
  startDate: string;
  endDate: string;
  minStaffPerShift: number;
  maxStaffPerShift: number;
  config: GenerationConfig;
}

export interface GenerationShift {
  id: string;
  short_key: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  min_hours_per_week: number;
  max_hours_per_week: number;
}

export interface GenerationStaffMember {
  id: string;
  full_name: string;
  rank_name: string | null;
  hoursPerWeek: number;
}

export interface ScheduleViolation {
  type: "under_hours" | "over_hours" | "insufficient_rest" | "over_daily_hours" | "understaffed";
  staffId: string | null;
  staffName: string | null;
  date: string | null;
  shiftId: string | null;
  message: string;
}

export interface GenerationResult {
  assignments: Record<string, Record<string, string | null>>;
  understaffed: UnderstaffedSlot[];
  violations: ScheduleViolation[];
}
