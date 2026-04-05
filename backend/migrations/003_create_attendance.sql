-- 003_create_attendance.sql
-- Creates the attendance table for daily check-in/check-out tracking.

create type public.attendance_status as enum ('present', 'absent', 'late', 'half_day');

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status public.attendance_status not null default 'present',
  notes text,
  created_at timestamptz not null default now(),

  constraint uq_attendance_user_date unique (user_id, date)
);

comment on table public.attendance is 'Daily attendance records per employee.';

create index idx_attendance_user on public.attendance(user_id);
create index idx_attendance_date on public.attendance(date);

alter table public.attendance enable row level security;
