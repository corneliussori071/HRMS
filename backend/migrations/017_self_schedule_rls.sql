-- 017_self_schedule_rls.sql
-- Allow regular staff to insert/update their own roster_assignments
-- for self-scheduling on published rosters with allow_self_scheduling enabled.

-- Drop existing policies that only allow create_roster users
drop policy if exists "roster_assignments_insert" on public.roster_assignments;
drop policy if exists "roster_assignments_update" on public.roster_assignments;

-- INSERT: create_roster users can insert any, OR the user can insert their own
-- assignment on a published self-scheduling roster they are included in.
create policy "roster_assignments_insert"
  on public.roster_assignments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
    or (
      user_id = auth.uid()
      and exists (
        select 1 from public.rosters r
        where r.id = roster_id
          and r.status = 'published'
          and r.allow_self_scheduling = true
      )
      and exists (
        select 1 from public.roster_staff rs
        where rs.roster_id = roster_id
          and rs.user_id = auth.uid()
          and rs.is_included = true
      )
    )
  );

-- UPDATE: create_roster users can update any, OR the user can update their own
-- assignment on a published self-scheduling roster they are included in.
create policy "roster_assignments_update"
  on public.roster_assignments for update
  to authenticated
  using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'create_roster'
    )
    or (
      user_id = auth.uid()
      and exists (
        select 1 from public.rosters r
        where r.id = roster_id
          and r.status = 'published'
          and r.allow_self_scheduling = true
      )
      and exists (
        select 1 from public.roster_staff rs
        where rs.roster_id = roster_id
          and rs.user_id = auth.uid()
          and rs.is_included = true
      )
    )
  );
