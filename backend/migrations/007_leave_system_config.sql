-- 007_leave_system_config.sql
-- Configurable leave system: PTO, Fixed, or Both.
-- Replaces hardcoded leave_type enum with admin-managed leave types.

-- ============================================================
-- SYSTEM SETTINGS (key-value configuration)
-- ============================================================

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

comment on table public.system_settings is 'Global system configuration managed by admins.';

alter table public.system_settings enable row level security;

create trigger system_settings_updated_at
  before update on public.system_settings
  for each row execute procedure public.set_updated_at();

-- Default: fixed leave system
insert into public.system_settings (key, value) values
  ('leave_system', '"fixed"'::jsonb);

-- ============================================================
-- LEAVE TYPES (admin-configurable)
-- ============================================================

create table public.leave_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  system_type text not null default 'fixed' check (system_type in ('pto', 'fixed')),
  max_days_per_year numeric(5,1) not null default 0,
  is_active boolean not null default true,
  requires_approval boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.leave_types is 'Admin-configured leave types for the organization.';

alter table public.leave_types enable row level security;

create trigger leave_types_updated_at
  before update on public.leave_types
  for each row execute procedure public.set_updated_at();

-- Seed default fixed leave types
insert into public.leave_types (name, description, system_type, max_days_per_year) values
  ('Annual Leave', 'Standard annual paid leave', 'fixed', 20),
  ('Sick Leave', 'Leave for illness or medical appointments', 'fixed', 10),
  ('Maternity Leave', 'Leave for maternity', 'fixed', 90),
  ('Paternity Leave', 'Leave for paternity', 'fixed', 14),
  ('Unpaid Leave', 'Leave without pay', 'fixed', 30);

-- Seed PTO type
insert into public.leave_types (name, description, system_type, max_days_per_year) values
  ('PTO', 'Paid time off (combined pool)', 'pto', 25);

-- ============================================================
-- LEAVE ALLOCATIONS (per role, configurable)
-- ============================================================

create table public.leave_allocations (
  id uuid primary key default gen_random_uuid(),
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  role public.user_role not null,
  days_per_year numeric(5,1) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_allocation_type_role unique (leave_type_id, role)
);

comment on table public.leave_allocations is 'Leave day allocations per role. Overrides leave_types.max_days_per_year when set.';

alter table public.leave_allocations enable row level security;

create trigger leave_allocations_updated_at
  before update on public.leave_allocations
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- LEAVE BALANCES (tracks used days per employee per year)
-- ============================================================

create table public.leave_balances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  leave_type_id uuid not null references public.leave_types(id) on delete cascade,
  year integer not null,
  used_days numeric(5,1) not null default 0,
  adjustment_days numeric(5,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_balance_user_type_year unique (user_id, leave_type_id, year)
);

comment on table public.leave_balances is 'Tracks leave usage per employee per type per year.';

create index idx_leave_balances_user_year on public.leave_balances(user_id, year);

alter table public.leave_balances enable row level security;

create trigger leave_balances_updated_at
  before update on public.leave_balances
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- SHIFTS (under departments)
-- ============================================================

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_shift_dept_name unique (department_id, name)
);

comment on table public.shifts is 'Work shifts defined per department.';

create index idx_shifts_department on public.shifts(department_id);

alter table public.shifts enable row level security;

create trigger shifts_updated_at
  before update on public.shifts
  for each row execute procedure public.set_updated_at();

-- Add shift assignment to profiles
alter table public.profiles add column shift_id uuid references public.shifts(id) on delete set null;

-- ============================================================
-- MODIFY LEAVE REQUESTS: add leave_type_id reference
-- ============================================================

alter table public.leave_requests add column leave_type_id uuid references public.leave_types(id) on delete set null;

-- ============================================================
-- RLS POLICIES FOR NEW TABLES
-- ============================================================

-- System Settings: all authenticated can read, admin/hr can manage
create policy "system_settings_select"
  on public.system_settings for select
  to authenticated
  using (true);

create policy "system_settings_insert"
  on public.system_settings for insert
  to authenticated
  with check (public.is_admin_or_hr());

create policy "system_settings_update"
  on public.system_settings for update
  to authenticated
  using (public.is_admin_or_hr());

-- Leave Types: all authenticated can read, admin/hr can manage
create policy "leave_types_select"
  on public.leave_types for select
  to authenticated
  using (true);

create policy "leave_types_insert"
  on public.leave_types for insert
  to authenticated
  with check (public.is_admin_or_hr());

create policy "leave_types_update"
  on public.leave_types for update
  to authenticated
  using (public.is_admin_or_hr());

create policy "leave_types_delete"
  on public.leave_types for delete
  to authenticated
  using (public.is_admin_or_hr());

-- Leave Allocations: all authenticated can read, admin/hr can manage
create policy "leave_allocations_select"
  on public.leave_allocations for select
  to authenticated
  using (true);

create policy "leave_allocations_insert"
  on public.leave_allocations for insert
  to authenticated
  with check (public.is_admin_or_hr());

create policy "leave_allocations_update"
  on public.leave_allocations for update
  to authenticated
  using (public.is_admin_or_hr());

create policy "leave_allocations_delete"
  on public.leave_allocations for delete
  to authenticated
  using (public.is_admin_or_hr());

-- Leave Balances: staff see own, managers+ see all, admin/hr manage
create policy "leave_balances_select"
  on public.leave_balances for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_manager_or_above()
  );

create policy "leave_balances_insert"
  on public.leave_balances for insert
  to authenticated
  with check (public.is_admin_or_hr());

create policy "leave_balances_update"
  on public.leave_balances for update
  to authenticated
  using (public.is_admin_or_hr());

-- Shifts: all authenticated can read, admin/hr can manage
create policy "shifts_select"
  on public.shifts for select
  to authenticated
  using (true);

create policy "shifts_insert"
  on public.shifts for insert
  to authenticated
  with check (public.is_admin_or_hr());

create policy "shifts_update"
  on public.shifts for update
  to authenticated
  using (public.is_admin_or_hr());

create policy "shifts_delete"
  on public.shifts for delete
  to authenticated
  using (public.is_admin_or_hr());
