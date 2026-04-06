-- 001_create_departments.sql
-- Creates the departments table for organizational structure.

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.departments is 'Organizational departments within the company.';

alter table public.departments enable row level security;

-- 002_create_profiles.sql
-- Creates the profiles table that extends Supabase auth.users.
-- Automatically populated via a trigger when a new user signs up.

create type public.user_role as enum ('admin', 'hr', 'manager', 'staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'staff',
  department_id uuid references public.departments(id) on delete set null,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Employee profiles linked to Supabase Auth users.';

create index idx_profiles_department on public.profiles(department_id);
create index idx_profiles_role on public.profiles(role);

alter table public.profiles enable row level security;

-- Trigger: auto-create a profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

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

-- 006_rls_policies.sql
-- Row-Level Security policies for all tables.
-- Role hierarchy: admin > hr > manager > staff
-- Helper function to read the current user's role from the profiles table.

create or replace function public.get_user_role()
returns public.user_role
language sql
stable
security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: check if current user is admin or hr
create or replace function public.is_admin_or_hr()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select public.get_user_role() in ('admin', 'hr');
$$;

-- Helper: check if current user is at least a manager
create or replace function public.is_manager_or_above()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select public.get_user_role() in ('admin', 'hr', 'manager');
$$;

-- ============================================================
-- DEPARTMENTS
-- ============================================================

-- Anyone authenticated can read departments
create policy "departments_select"
  on public.departments for select
  to authenticated
  using (true);

-- Only admin/hr can manage departments
create policy "departments_insert"
  on public.departments for insert
  to authenticated
  with check (public.is_admin_or_hr());

create policy "departments_update"
  on public.departments for update
  to authenticated
  using (public.is_admin_or_hr());

create policy "departments_delete"
  on public.departments for delete
  to authenticated
  using (public.is_admin_or_hr());

-- ============================================================
-- PROFILES
-- ============================================================

-- Staff see only their own profile; managers+ see all
create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.is_manager_or_above()
  );

-- Users can update their own non-role fields; admin/hr can update anyone
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin_or_hr());

-- Only admin/hr can insert profiles (trigger handles normal signup)
create policy "profiles_insert"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin_or_hr());

-- ============================================================
-- ATTENDANCE
-- ============================================================

-- Staff see own records; managers+ see all
create policy "attendance_select"
  on public.attendance for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_manager_or_above()
  );

-- Staff can insert their own attendance; admin/hr can insert for anyone
create policy "attendance_insert"
  on public.attendance for insert
  to authenticated
  with check (
    user_id = auth.uid()
    or public.is_admin_or_hr()
  );

-- Staff can update their own records; admin/hr can update any
create policy "attendance_update"
  on public.attendance for update
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin_or_hr()
  );

-- Only admin/hr can delete attendance records
create policy "attendance_delete"
  on public.attendance for delete
  to authenticated
  using (public.is_admin_or_hr());

-- ============================================================
-- LEAVE REQUESTS
-- ============================================================

-- Staff see own requests; managers+ see all
create policy "leave_requests_select"
  on public.leave_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_manager_or_above()
  );

-- Any authenticated user can submit a leave request for themselves
create policy "leave_requests_insert"
  on public.leave_requests for insert
  to authenticated
  with check (user_id = auth.uid());

-- Staff can update own pending requests; managers+ can update any (for approvals)
create policy "leave_requests_update"
  on public.leave_requests for update
  to authenticated
  using (
    (user_id = auth.uid() and status = 'pending')
    or public.is_manager_or_above()
  );

-- Staff can delete own pending requests; admin/hr can delete any
create policy "leave_requests_delete"
  on public.leave_requests for delete
  to authenticated
  using (
    (user_id = auth.uid() and status = 'pending')
    or public.is_admin_or_hr()
  );

-- ============================================================
-- OVERTIME
-- ============================================================

-- Staff see own records; managers+ see all
create policy "overtime_select"
  on public.overtime for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_manager_or_above()
  );

-- Any authenticated user can log overtime for themselves
create policy "overtime_insert"
  on public.overtime for insert
  to authenticated
  with check (user_id = auth.uid());

-- Staff can update own pending records; managers+ can update any (for approvals)
create policy "overtime_update"
  on public.overtime for update
  to authenticated
  using (
    (user_id = auth.uid() and status = 'pending')
    or public.is_manager_or_above()
  );

-- Staff can delete own pending records; admin/hr can delete any
create policy "overtime_delete"
  on public.overtime for delete
  to authenticated
  using (
    (user_id = auth.uid() and status = 'pending')
    or public.is_admin_or_hr()
  );

-- seed.sql
-- Initial seed data for development. Run after all migrations.
-- This inserts sample departments only. Users are created through Supabase Auth.

insert into public.departments (name, description) values
  ('Engineering', 'Software development and technical infrastructure'),
  ('Human Resources', 'People operations, recruitment, and compliance'),
  ('Finance', 'Accounting, budgeting, and financial reporting'),
  ('Marketing', 'Brand management, campaigns, and communications'),
  ('Operations', 'Business operations and process management')
on conflict (name) do nothing;

