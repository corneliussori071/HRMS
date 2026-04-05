-- 002_create_profiles.sql
-- Creates the profiles table that extends Supabase auth.users.
-- Automatically populated via a trigger when a new user signs up.

create type public.user_role as enum ('admin', 'hr', 'manager', 'staff');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role public.user_role not null default 'staff',
  department_id uuid references public.departments(id) on delete set null,
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Employee profiles linked to Supabase Auth users.';

create index idx_profiles_department on public.profiles(department_id);
create index idx_profiles_role on public.profiles(role);

alter table public.profiles enable row level security;

-- Trigger: auto-create a profile row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: keep updated_at current
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
