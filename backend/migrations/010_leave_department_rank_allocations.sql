-- 010_leave_department_rank_allocations.sql
-- Restructure leave types to be department-scoped and allocations to be rank-based.
-- PTO types use accrual rates (hours_worked -> hours_earned).
-- Fixed types use days_per_year per rank.

-- ============================================================
-- ADD department_id TO leave_types
-- ============================================================

alter table public.leave_types
  add column department_id uuid references public.departments(id) on delete set null;

comment on column public.leave_types.department_id is 'Department this leave type belongs to. NULL for org-wide types.';

-- ============================================================
-- RESTRUCTURE leave_allocations FOR RANK-BASED ALLOCATIONS
-- ============================================================

-- Add rank_id column
alter table public.leave_allocations
  add column rank_id uuid references public.ranks(id) on delete cascade;

-- Add PTO accrual fields
alter table public.leave_allocations
  add column hours_worked numeric(7,2) not null default 0,
  add column hours_earned numeric(7,2) not null default 0;

-- Make role nullable (transitioning from role-based to rank-based)
alter table public.leave_allocations
  alter column role drop not null;

-- Add unique constraint for rank-based allocations
alter table public.leave_allocations
  add constraint uq_allocation_type_rank unique (leave_type_id, rank_id);

-- ============================================================
-- INDEX for department_id lookup on leave_types
-- ============================================================

create index idx_leave_types_department on public.leave_types(department_id);
create index idx_leave_allocations_rank on public.leave_allocations(rank_id);
