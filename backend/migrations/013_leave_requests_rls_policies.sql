-- 013_leave_requests_rls_policies.sql
-- Add RLS policies to leave_requests (RLS was enabled in 004 but no policies were created).

-- Drop any existing policies to avoid conflicts
drop policy if exists "leave_requests_select_own" on public.leave_requests;
drop policy if exists "leave_requests_insert_own" on public.leave_requests;
drop policy if exists "leave_requests_update_review" on public.leave_requests;
drop policy if exists "leave_requests_delete" on public.leave_requests;

-- Staff can view their own requests
create policy "leave_requests_select_own"
  on public.leave_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_manager_or_above()
  );

-- Authenticated users can insert their own requests
create policy "leave_requests_insert_own"
  on public.leave_requests for insert
  to authenticated
  with check (user_id = auth.uid());

-- Managers+ can update any request (for review); staff cannot update
create policy "leave_requests_update_review"
  on public.leave_requests for update
  to authenticated
  using (public.is_manager_or_above());

-- Staff can delete own pending requests; admin/hr can delete any
create policy "leave_requests_delete"
  on public.leave_requests for delete
  to authenticated
  using (
    (user_id = auth.uid() and status = 'pending')
    or public.is_admin_or_hr()
  );
