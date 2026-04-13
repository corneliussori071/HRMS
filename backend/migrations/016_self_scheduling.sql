-- 016_self_scheduling.sql
-- Adds self-scheduling infrastructure: per-user hour/day limits,
-- roster staffing configuration per shift/day/rank, shift swap requests,
-- and roster completion deadlines.

-- ============================================================
-- PROFILES: add weekly hour/day limits
-- ============================================================

alter table public.profiles
  add column if not exists hours_per_week numeric(5,1) not null default 40,
  add column if not exists days_per_week integer not null default 5;

comment on column public.profiles.hours_per_week is 'Target weekly hours for hourly-pay staff.';
comment on column public.profiles.days_per_week is 'Target weekly days for monthly-pay staff.';

-- ============================================================
-- ROSTERS: add completion deadline
-- ============================================================

alter table public.rosters
  add column if not exists completion_date date;

comment on column public.rosters.completion_date is 'Deadline by which staff must complete self-scheduling.';

-- ============================================================
-- ROSTER ASSIGNMENTS: add self-scheduled flag
-- ============================================================

alter table public.roster_assignments
  add column if not exists is_self_scheduled boolean not null default false;

comment on column public.roster_assignments.is_self_scheduled is 'True if staff selected this shift via self-scheduling.';

-- ============================================================
-- ROSTER SHIFT CONFIGS (staffing requirements per shift per day)
-- ============================================================

create table public.roster_shift_configs (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  date date,
  required_count integer not null default 1,

  constraint chk_required_count_positive check (required_count >= 0)
);

comment on table public.roster_shift_configs is 'Per-shift staffing requirements. A null date means the count applies to all days in the roster.';

create index idx_roster_shift_configs_roster on public.roster_shift_configs(roster_id);
create unique index idx_roster_shift_configs_unique on public.roster_shift_configs(roster_id, shift_id, coalesce(date, '1970-01-01'::date));

alter table public.roster_shift_configs enable row level security;

create policy "roster_shift_configs_select"
  on public.roster_shift_configs for select
  to authenticated using (true);

create policy "roster_shift_configs_insert"
  on public.roster_shift_configs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "roster_shift_configs_update"
  on public.roster_shift_configs for update
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "roster_shift_configs_delete"
  on public.roster_shift_configs for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

-- ============================================================
-- ROSTER RANK CONFIGS (rank-based caps per shift)
-- ============================================================

create table public.roster_rank_configs (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  rank_id uuid not null references public.ranks(id) on delete cascade,
  max_count integer not null default 1,

  constraint uq_roster_rank_config unique (roster_id, shift_id, rank_id),
  constraint chk_rank_max_count_positive check (max_count >= 0)
);

comment on table public.roster_rank_configs is 'Per-rank maximum staff count for each shift in a roster.';

create index idx_roster_rank_configs_roster on public.roster_rank_configs(roster_id);

alter table public.roster_rank_configs enable row level security;

create policy "roster_rank_configs_select"
  on public.roster_rank_configs for select
  to authenticated using (true);

create policy "roster_rank_configs_insert"
  on public.roster_rank_configs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "roster_rank_configs_update"
  on public.roster_rank_configs for update
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

create policy "roster_rank_configs_delete"
  on public.roster_rank_configs for delete
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

-- ============================================================
-- SHIFT SWAP REQUESTS
-- ============================================================

create table public.shift_swap_requests (
  id uuid primary key default gen_random_uuid(),
  roster_id uuid not null references public.rosters(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  requester_shift_id uuid references public.shifts(id) on delete set null,
  target_shift_id uuid references public.shifts(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_swap_different_users check (requester_id <> target_id)
);

comment on table public.shift_swap_requests is 'Shift swap requests between staff. Requires target acceptance and manager approval.';

create index idx_swap_requests_roster on public.shift_swap_requests(roster_id);
create index idx_swap_requests_requester on public.shift_swap_requests(requester_id);
create index idx_swap_requests_target on public.shift_swap_requests(target_id);
create index idx_swap_requests_status on public.shift_swap_requests(status);

alter table public.shift_swap_requests enable row level security;

create trigger swap_requests_updated_at
  before update on public.shift_swap_requests
  for each row execute procedure public.set_updated_at();

-- All authenticated can read swap requests (needed for both parties + managers)
create policy "swap_requests_select"
  on public.shift_swap_requests for select
  to authenticated using (true);

-- Staff can create swap requests where they are the requester
create policy "swap_requests_insert"
  on public.shift_swap_requests for insert
  to authenticated
  with check (requester_id = auth.uid());

-- Requester, target, and managers can update (accept/reject/approve)
create policy "swap_requests_update"
  on public.shift_swap_requests for update
  to authenticated
  using (
    requester_id = auth.uid()
    or target_id = auth.uid()
    or exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );

-- Only requester or managers can delete
create policy "swap_requests_delete"
  on public.shift_swap_requests for delete
  to authenticated
  using (
    requester_id = auth.uid()
    or exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
  );
