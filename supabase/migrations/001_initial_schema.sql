-- The Reset Circle App — initial schema (Phase 1+)
-- Run in Supabase SQL Editor or via Supabase CLI

-- Profiles linked to Supabase Auth
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  phone_number text not null,
  email text not null default '',
  display_name text not null default '',
  whatsapp_group_role text not null default 'member'
    check (whatsapp_group_role in ('member', 'admin')),
  timezone text not null default 'Africa/Douala',
  morning_reminder_time time not null default '07:00',
  evening_reminder_time time not null default '21:00',
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (type in ('morning', 'evening')),
  is_active boolean not null default true,
  name text not null,
  unique (user_id, type)
);

create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  label text not null,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  date date not null,
  status text not null check (status in ('complete', 'partial', 'missed')),
  submitted_at timestamptz not null default now(),
  unique (user_id, routine_id, date)
);

create table public.checkin_items (
  id uuid primary key default gen_random_uuid(),
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  routine_item_id uuid not null references public.routine_items (id),
  was_done boolean not null,
  reason_if_not_done text
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  subscription_json jsonb not null,
  created_at timestamptz not null default now()
);

create table public.reminder_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  reminder_type text not null check (reminder_type in ('first', 'escalation')),
  routine_type text not null check (routine_type in ('morning', 'evening')),
  sent_at timestamptz not null default now(),
  was_actioned boolean not null default false,
  unique (user_id, date, reminder_type, routine_type)
);

-- Indexes
create index idx_routines_user_id on public.routines (user_id);
create index idx_routine_items_routine_id on public.routine_items (routine_id);
create index idx_checkins_user_date on public.checkins (user_id, date);
create index idx_checkin_items_checkin_id on public.checkin_items (checkin_id);
create index idx_reminder_log_user_date on public.reminder_log (user_id, date);

-- Row Level Security
alter table public.users enable row level security;
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_log enable row level security;

-- Helper bypasses RLS to avoid infinite recursion on admin policies
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

-- Users: own profile + admins read all (for Phase 4 dashboard)
create policy "Users read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

create policy "Admins read all profiles"
  on public.users for select
  using (public.is_admin());

-- Routines
create policy "Users manage own routines"
  on public.routines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all routines"
  on public.routines for select
  using (public.is_admin());

-- Routine items (via routine ownership)
create policy "Users manage own routine items"
  on public.routine_items for all
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_id and r.user_id = auth.uid()
    )
  );

create policy "Admins read all routine items"
  on public.routine_items for select
  using (public.is_admin());

-- Checkins
create policy "Users manage own checkins"
  on public.checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all checkins"
  on public.checkins for select
  using (public.is_admin());

-- Checkin items (via checkin ownership)
create policy "Users manage own checkin items"
  on public.checkin_items for all
  using (
    exists (
      select 1 from public.checkins c
      where c.id = checkin_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.checkins c
      where c.id = checkin_id and c.user_id = auth.uid()
    )
  );

create policy "Admins read all checkin items"
  on public.checkin_items for select
  using (public.is_admin());

-- Push subscriptions (Phase 2)
create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Reminder log (Phase 2 — service role writes; users read own)
create policy "Users read own reminder log"
  on public.reminder_log for select
  using (auth.uid() = user_id);
