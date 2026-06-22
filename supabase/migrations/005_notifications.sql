-- In-app notification inbox + push subscription dedup + forum notify tracking
-- Prerequisite: run 001–003 first. Run 004 (forum) before this if you use the forum.

create table if not exists public.app_notifications (
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

create index if not exists idx_app_notifications_user_created
  on public.app_notifications (user_id, created_at desc);

create index if not exists idx_app_notifications_user_unread
  on public.app_notifications (user_id)
  where read_at is null;

alter table public.app_notifications enable row level security;

drop policy if exists "Users read own notifications" on public.app_notifications;
create policy "Users read own notifications"
  on public.app_notifications for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.app_notifications;
create policy "Users update own notifications"
  on public.app_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Dedup push subscriptions per device
alter table public.push_subscriptions
  add column if not exists endpoint text;

update public.push_subscriptions
set endpoint = subscription_json->>'endpoint'
where endpoint is null and subscription_json ? 'endpoint';

create unique index if not exists idx_push_subscriptions_user_endpoint
  on public.push_subscriptions (user_id, endpoint)
  where endpoint is not null;

-- Forum notify column (only if forum_posts exists — run 004 first)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'forum_posts'
  ) then
    alter table public.forum_posts
      add column if not exists notified_at timestamptz;
  end if;
end $$;

-- Let users mark reminders as actioned after check-in
drop policy if exists "Users update own reminder log" on public.reminder_log;
create policy "Users update own reminder log"
  on public.reminder_log for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
