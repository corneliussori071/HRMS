-- 001_create_departments.sql
-- Creates the departments table for organizational structure.

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.departments is 'Organizational departments within the company.';

alter table public.departments enable row level security;
