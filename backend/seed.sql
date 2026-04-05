-- seed.sql
-- Initial seed data for development. Run after all migrations.
-- This inserts sample departments only. Users are created through Supabase Auth.

insert into public.departments (name, description) values
  ('Engineering', 'Software development and technical infrastructure'),
  ('Human Resources', 'People operations, recruitment, and compliance'),
  ('Finance', 'Accounting, budgeting, and financial reporting'),
  ('Marketing', 'Brand management, campaigns, and communications'),
  ('Operations', 'Business operations and process management')
on conflict (name) do nothing;
