-- Onboarded members can read all active books in the group library (not only assigned rows).

create policy "Onboarded members read group library"
  on public.books for select
  using (
    is_active = true
    and exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.onboarding_complete = true
        and u.whatsapp_group_role = 'member'
    )
  );
