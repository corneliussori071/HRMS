-- 008_categories_ranks_extended_profiles.sql
-- Adds staffing categories (e.g. nurses, doctors) and ranks (e.g. staff nurse, senior staff nurse)
-- per department. Extends profiles with employment and payment info.

-- ============================================================
-- STAFFING CATEGORIES (per department)
-- ============================================================

create table public.staffing_categories (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_category_dept_name unique (department_id, name)
);

comment on table public.staffing_categories is 'Staffing categories per department (e.g. Nurses, Doctors).';

create index idx_staffing_categories_department on public.staffing_categories(department_id);

alter table public.staffing_categories enable row level security;

create trigger staffing_categories_updated_at
  before update on public.staffing_categories
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- RANKS (per department)
-- ============================================================

create table public.ranks (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete cascade,
  name text not null,
  level integer not null default 0,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_rank_dept_name unique (department_id, name)
);

comment on table public.ranks is 'Ranks per department (e.g. Staff Nurse, Senior Staff Nurse, Nursing Officer).';

create index idx_ranks_department on public.ranks(department_id);

alter table public.ranks enable row level security;

create trigger ranks_updated_at
  before update on public.ranks
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- EXTEND PROFILES with employment and payment info
-- ============================================================

alter table public.profiles
  add column rank_id uuid references public.ranks(id) on delete set null,
  add column staffing_category_id uuid references public.staffing_categories(id) on delete set null,
  add column date_of_birth date,
  add column gender text check (gender in ('male', 'female', 'other')),
  add column address text,
  add column emergency_contact_name text,
  add column emergency_contact_phone text,
  add column date_of_employment date,
  add column employment_type text check (employment_type in ('full_time', 'part_time', 'contract', 'temporary')) default 'full_time',
  add column pay_type text check (pay_type in ('hourly', 'monthly')) default 'monthly',
  add column pay_rate numeric(12,2) default 0,
  add column bank_name text,
  add column bank_account_number text,
  add column tax_id text,
  add column status text check (status in ('active', 'suspended', 'terminated')) default 'active';

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Staffing Categories: all authenticated can read, admin/hr can manage
create policy "staffing_categories_select"
  on public.staffing_categories for select
  to authenticated
  using (true);

create policy "staffing_categories_insert"
  on public.staffing_categories for insert
  to authenticated
  with check (public.is_admin_or_hr());

create policy "staffing_categories_update"
  on public.staffing_categories for update
  to authenticated
  using (public.is_admin_or_hr());

create policy "staffing_categories_delete"
  on public.staffing_categories for delete
  to authenticated
  using (public.is_admin_or_hr());

-- Ranks: all authenticated can read, admin/hr can manage
create policy "ranks_select"
  on public.ranks for select
  to authenticated
  using (true);

create policy "ranks_insert"
  on public.ranks for insert
  to authenticated
  with check (public.is_admin_or_hr());

create policy "ranks_update"
  on public.ranks for update
  to authenticated
  using (public.is_admin_or_hr());

create policy "ranks_delete"
  on public.ranks for delete
  to authenticated
  using (public.is_admin_or_hr());
