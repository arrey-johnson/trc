-- Run this entire file in Supabase Dashboard → SQL Editor → New query → Run
-- https://supabase.com/dashboard/project/qlhjabkkpnipwkkstlsn/sql/new

-- The Reset Circle App — full schema

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

create index idx_routines_user_id on public.routines (user_id);
create index idx_routine_items_routine_id on public.routine_items (routine_id);
create index idx_checkins_user_date on public.checkins (user_id, date);
create index idx_checkin_items_checkin_id on public.checkin_items (checkin_id);
create index idx_reminder_log_user_date on public.reminder_log (user_id, date);
create index idx_users_email on public.users (email);

alter table public.users enable row level security;
alter table public.routines enable row level security;
alter table public.routine_items enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_items enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_log enable row level security;

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

create policy "Users manage own routines"
  on public.routines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all routines"
  on public.routines for select
  using (public.is_admin());

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

create policy "Users manage own checkins"
  on public.checkins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all checkins"
  on public.checkins for select
  using (public.is_admin());

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

create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read own reminder log"
  on public.reminder_log for select
  using (auth.uid() = user_id);

-- Forum posts
create table public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users (id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'personal_development',
  is_published boolean not null default true,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_forum_posts_published_created
  on public.forum_posts (is_published, created_at desc);

alter table public.forum_posts enable row level security;

create policy "Members read published forum posts"
  on public.forum_posts for select
  using (is_published = true and auth.uid() is not null);

create policy "Admins manage forum posts"
  on public.forum_posts for all
  using (public.is_admin())
  with check (public.is_admin());

-- Migration 005: notifications + push

create table public.app_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  type text not null check (
    type in (
      'morning_reminder',
      'evening_reminder',
      'escalation',
      'forum_post',
      'general'
    )
  ),
  title text not null,
  body text not null,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_app_notifications_user_created
  on public.app_notifications (user_id, created_at desc);

create index idx_app_notifications_user_unread
  on public.app_notifications (user_id)
  where read_at is null;

alter table public.app_notifications enable row level security;

create policy "Users read own notifications"
  on public.app_notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.app_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.push_subscriptions
  add column if not exists endpoint text;

create unique index if not exists idx_push_subscriptions_user_endpoint
  on public.push_subscriptions (user_id, endpoint)
  where endpoint is not null;

create policy "Users update own reminder log"
  on public.reminder_log for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Migration 006: admin read push/reminder log + update members

create policy "Admins read all push subscriptions"
  on public.push_subscriptions for select
  using (public.is_admin());

create policy "Admins read all reminder log"
  on public.reminder_log for select
  using (public.is_admin());

create policy "Admins update member roles"
  on public.users for update
  using (public.is_admin())
  with check (public.is_admin());
