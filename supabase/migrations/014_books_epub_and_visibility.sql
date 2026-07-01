-- PDF + EPUB formats and monthly member visibility

alter table public.books
  add column if not exists format text not null default 'pdf'
    check (format in ('pdf', 'epub')),
  add column if not exists featured_month text
    check (featured_month is null or featured_month ~ '^\d{4}-\d{2}$'),
  add column if not exists hidden_from_members boolean not null default false;

alter table public.book_reading_progress
  add column if not exists epub_location text;

create or replace function public.is_book_visible_to_member(
  p_featured_month text,
  p_hidden_from_members boolean,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  user_tz text;
  current_month text;
begin
  if p_hidden_from_members then
    return false;
  end if;

  if p_featured_month is null then
    return true;
  end if;

  select coalesce(timezone, 'Africa/Douala')
  into user_tz
  from public.users
  where id = p_user_id;

  current_month := to_char(
    (timezone(user_tz, now()))::date,
    'YYYY-MM'
  );

  return p_featured_month = current_month;
end;
$$;

drop policy if exists "Onboarded members read group library" on public.books;

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
    and public.is_book_visible_to_member(
      featured_month,
      hidden_from_members,
      auth.uid()
    )
  );
