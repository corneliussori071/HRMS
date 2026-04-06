-- 014_user_permissions.sql
-- Creates a permissions system to replace hardcoded role-based access.
-- Permissions are stored as rows per user, allowing flexible multi-permission assignment.
-- The account creator (first user) automatically receives all permissions.

-- ============================================================
-- USER PERMISSIONS TABLE
-- ============================================================

create table public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),

  constraint uq_user_permission unique (user_id, permission)
);

comment on table public.user_permissions is 'Granular permissions per user. Each row grants one permission to one user.';

create index idx_user_permissions_user on public.user_permissions(user_id);
create index idx_user_permissions_permission on public.user_permissions(permission);

alter table public.user_permissions enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- All authenticated users can read permissions (needed for nav rendering)
drop policy if exists "user_permissions_select" on public.user_permissions;
create policy "user_permissions_select" on public.user_permissions
  for select to authenticated using (true);

-- Only users with manage_users permission (or account creator) can insert
drop policy if exists "user_permissions_insert" on public.user_permissions;
create policy "user_permissions_insert" on public.user_permissions
  for insert to authenticated with check (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'manage_users'
    )
  );

-- Only users with manage_users permission can update
drop policy if exists "user_permissions_update" on public.user_permissions;
create policy "user_permissions_update" on public.user_permissions
  for update to authenticated using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'manage_users'
    )
  );

-- Only users with manage_users permission can delete
drop policy if exists "user_permissions_delete" on public.user_permissions;
create policy "user_permissions_delete" on public.user_permissions
  for delete to authenticated using (
    exists (
      select 1 from public.user_permissions up
      where up.user_id = auth.uid() and up.permission = 'manage_users'
    )
  );

-- ============================================================
-- GRANT ALL PERMISSIONS TO THE FIRST USER (ACCOUNT CREATOR)
-- ============================================================

-- The first profile (earliest created_at) is the account creator
insert into public.user_permissions (user_id, permission)
select p.id, perm.name
from (
  select id from public.profiles order by created_at asc limit 1
) p
cross join (
  values ('review_leaves'), ('manage_users'), ('users_page'), ('leave_settings')
) as perm(name)
on conflict (user_id, permission) do nothing;
