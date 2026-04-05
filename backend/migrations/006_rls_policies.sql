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
