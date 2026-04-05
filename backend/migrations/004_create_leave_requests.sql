-- 004_create_leave_requests.sql
-- Creates the leave requests table for PTO and leave management.

create type public.leave_type as enum ('annual', 'sick', 'personal', 'unpaid', 'maternity', 'paternity', 'bereavement');
create type public.request_status as enum ('pending', 'approved', 'rejected', 'cancelled');

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  reason text not null,
  status public.request_status not null default 'pending',
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_leave_dates check (end_date >= start_date)
);

comment on table public.leave_requests is 'Employee leave and PTO requests with approval workflow.';

create index idx_leave_requests_user on public.leave_requests(user_id);
create index idx_leave_requests_status on public.leave_requests(status);
create index idx_leave_requests_dates on public.leave_requests(start_date, end_date);

alter table public.leave_requests enable row level security;

create trigger leave_requests_updated_at
  before update on public.leave_requests
  for each row execute procedure public.set_updated_at();
