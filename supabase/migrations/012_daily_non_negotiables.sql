-- Daily non-negotiables + evening reflection reviews

create table public.daily_non_negotiables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  label text not null,
  target_time time not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_daily_non_negotiables_user_date
  on public.daily_non_negotiables (user_id, date);

create table public.daily_non_negotiable_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  completed_all boolean not null,
  reflection text,
  submitted_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_non_negotiables enable row level security;
alter table public.daily_non_negotiable_reviews enable row level security;

create policy "Users manage own daily non-negotiables"
  on public.daily_non_negotiables for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all daily non-negotiables"
  on public.daily_non_negotiables for select
  using (public.is_admin());

create policy "Users manage own non-negotiable reviews"
  on public.daily_non_negotiable_reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all non-negotiable reviews"
  on public.daily_non_negotiable_reviews for select
  using (public.is_admin());
