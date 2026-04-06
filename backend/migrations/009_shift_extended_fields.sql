-- 009_shift_extended_fields.sql
-- Adds short_key, break_minutes, and weekly hour limits to shifts.

alter table public.shifts
  add column short_key text not null default '',
  add column break_minutes integer not null default 0,
  add column min_hours_per_week numeric(5,1) not null default 0,
  add column max_hours_per_week numeric(5,1) not null default 40;

-- Add unique constraint on short_key within a department
alter table public.shifts
  add constraint uq_shift_dept_key unique (department_id, short_key);

comment on column public.shifts.short_key is 'Short key for roster display (e.g. M for Morning, A for Afternoon, X for Off).';
comment on column public.shifts.break_minutes is 'Number of minutes break per shift.';
comment on column public.shifts.min_hours_per_week is 'Minimum hours staff must work per week on this shift pattern.';
comment on column public.shifts.max_hours_per_week is 'Maximum hours staff can work per week on this shift pattern.';
