-- 005_create_overtime.sql
-- Creates the overtime table for tracking extra hours worked.

create table public.overtime (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  hours numeric(4,2) not null check (hours > 0 and hours <= 24),
  reason text not null,
  status public.request_status not null default 'pending',
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),

  constraint uq_overtime_user_date unique (user_id, date)
);

comment on table public.overtime is 'Employee overtime hour logs with approval workflow.';

create index idx_overtime_user on public.overtime(user_id);
create index idx_overtime_date on public.overtime(date);
create index idx_overtime_status on public.overtime(status);

alter table public.overtime enable row level security;
