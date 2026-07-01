-- Allow onboarded members to read each other's display name + avatar for forum (and circle features).

create or replace function public.is_onboarded_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and onboarding_complete = true
  );
$$;

revoke all on function public.is_onboarded_member() from public;
grant execute on function public.is_onboarded_member() to authenticated;

create policy "Members read onboarded peer profiles"
  on public.users for select
  using (
    public.is_onboarded_member()
    and onboarding_complete = true
  );
