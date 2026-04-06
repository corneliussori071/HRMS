-- 011_leave_request_approved_days.sql
-- Add approved_days column so managers can approve a different number of days
-- than originally requested. NULL means full request approved.

alter table public.leave_requests
  add column approved_days numeric(5,1);

comment on column public.leave_requests.approved_days is 'Days actually approved by reviewer. NULL = full request approved.';
