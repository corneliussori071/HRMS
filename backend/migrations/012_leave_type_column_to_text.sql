-- 012_leave_type_column_to_text.sql
-- Change leave_requests.leave_type from enum to text.
-- The leave_type enum was hardcoded in migration 004 but leave types
-- are now admin-configurable (migration 007), making the enum too restrictive.

alter table public.leave_requests
  alter column leave_type type text using leave_type::text;

-- Drop the now-unused enum type
drop type if exists public.leave_type;
