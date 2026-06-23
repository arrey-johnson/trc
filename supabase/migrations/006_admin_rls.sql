-- Admin read access for ops visibility (push subs, reminder log)

drop policy if exists "Admins read all push subscriptions" on public.push_subscriptions;
create policy "Admins read all push subscriptions"
  on public.push_subscriptions for select
  using (public.is_admin());

drop policy if exists "Admins read all reminder log" on public.reminder_log;
create policy "Admins read all reminder log"
  on public.reminder_log for select
  using (public.is_admin());

drop policy if exists "Admins update member roles" on public.users;
create policy "Admins update member roles"
  on public.users for update
  using (public.is_admin())
  with check (public.is_admin());
