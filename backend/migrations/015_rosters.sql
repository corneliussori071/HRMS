-- 015_rosters.sql
-- Creates the roster/scheduling system tables.
-- Rosters are department-scoped shift schedules generated for a date range.
-- Each roster tracks which shifts and staff are included, and stores
-- per-day per-staff shift assignments.

-- ============================================================
-- ROSTERS (header/metadata)
-- ============================================================

create table public.rosters (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department_id uuid not null references public.departments(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  allow_self_scheduling boolean not null default false,
  min_staff_per_shift integer not null default 1,
  max_staff_per_shift integer not null default 10,
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_roster_dates check (end_date >= start_date)
);

comment on table public.rosters is 'Shift rosters for scheduling staff across a date range within a department.';

create index idx_rosters_department on public.rosters(department_id);
create index idx_rosters_status on public.rosters(status);
create index idx_rosters_created_by on public.rosters(created_by);

alter table public.rosters enable row level security;

create trigger rosters_updated_at
  before update on public.rosters
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- ROSTER SHIFTS (which shifts are included in the roster)
-- ============================================================

create table public.roster_shifts (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,

  constraint uq_roster_shift unique (roster_id, shift_id)
);

comment on table public.roster_shifts is 'Maps which shifts are included in each roster.';

create index idx_roster_shifts_roster on public.roster_shifts(roster_id);

alter table public.roster_shifts enable row level security;

-- ============================================================
-- ROSTER STAFF (which staff are included/excluded)
-- ============================================================

create table public.roster_staff (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_included boolean not null default true,

  constraint uq_roster_staff unique (roster_id, user_id)
);

comment on table public.roster_staff is 'Tracks staff inclusion in each roster. Unchecked staff have is_included = false.';

create index idx_roster_staff_roster on public.roster_staff(roster_id);
create index idx_roster_staff_user on public.roster_staff(user_id);

alter table public.roster_staff enable row level security;

-- ============================================================
-- ROSTER ASSIGNMENTS (the actual daily shift assignments)
-- ============================================================

create table public.roster_assignments (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  shift_id uuid references public.shifts(id) on delete set null,
  is_manual_override boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint uq_roster_assignment unique (roster_id, user_id, date)
);

comment on table public.roster_assignments is 'Per-day per-staff shift assignments. A null shift_id means the staff is off that day.';
comment on column public.roster_assignments.is_manual_override is 'True if a manager manually edited this assignment, bypassing generation rules.';

create index idx_roster_assignments_roster on public.roster_assignments(roster_id);
create index idx_roster_assignments_user on public.roster_assignments(user_id);
create index idx_roster_assignments_date on public.roster_assignments(date);

alter table public.roster_assignments enable row level security;

create trigger roster_assignments_updated_at
  before update on public.roster_assignments
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Rosters: all authenticated can read, users with create_roster permission can manage
create policy "rosters_select"
  on public.rosters for select
  to authenticated
  using (true);

create policy "rosters_insert"
  on public.rosters for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "rosters_update"
  on public.rosters for update
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "rosters_delete"
  on public.rosters for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

-- Roster shifts: same as rosters
create policy "roster_shifts_select"
  on public.roster_shifts for select
  to authenticated
  using (true);

create policy "roster_shifts_insert"
  on public.roster_shifts for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "roster_shifts_delete"
  on public.roster_shifts for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

-- Roster staff: same as rosters
create policy "roster_staff_select"
  on public.roster_staff for select
  to authenticated
  using (true);

create policy "roster_staff_insert"
  on public.roster_staff for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "roster_staff_update"
  on public.roster_staff for update
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "roster_staff_delete"
  on public.roster_staff for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

-- Roster assignments: all authenticated can read, create_roster users can manage
create policy "roster_assignments_select"
  on public.roster_assignments for select
  to authenticated
  using (true);

create policy "roster_assignments_insert"
  on public.roster_assignments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "roster_assignments_update"
  on public.roster_assignments for update
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "roster_assignments_delete"
  on public.roster_assignments for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

-- ============================================================
-- ADD NEW PERMISSIONS TO FIRST USER (ACCOUNT CREATOR)
-- ============================================================

insert into public.user_permissions (user_id, permission)
select p.id, perm.name
from (
  select id from public.profiles order by created_at asc limit 1
) p
cross join (
  values ('create_roster'), ('create_overtime')
) as perm(name)
on conflict (user_id, permission) do nothing;
