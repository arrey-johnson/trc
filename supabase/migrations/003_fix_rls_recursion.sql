-- Fix: "infinite recursion detected in policy for relation users"
-- Run in Supabase SQL Editor if you already applied setup.sql

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and whatsapp_group_role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "Admins read all profiles" on public.users;
drop policy if exists "Admins read all routines" on public.routines;
drop policy if exists "Admins read all routine items" on public.routine_items;
drop policy if exists "Admins read all checkins" on public.checkins;
drop policy if exists "Admins read all checkin items" on public.checkin_items;

create policy "Admins read all profiles"
  on public.users for select
  using (public.is_admin());

create policy "Admins read all routines"
  on public.routines for select
  using (public.is_admin());

create policy "Admins read all routine items"
  on public.routine_items for select
  using (public.is_admin());

create policy "Admins read all checkins"
  on public.checkins for select
  using (public.is_admin());

create policy "Admins read all checkin items"
  on public.checkin_items for select
  using (public.is_admin());
