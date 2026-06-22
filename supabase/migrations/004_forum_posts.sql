-- Forum posts for admin-shared personal development content

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

-- Sample posts (replace author_id with your admin user's id after signup)
-- insert into public.forum_posts (author_id, title, body, category)
-- values (
--   'YOUR-ADMIN-USER-UUID',
--   'Start small, stay consistent',
--   'Personal development is not about giant leaps. Pick one habit, do it daily for two weeks, then add the next. Consistency beats intensity every time.',
--   'personal_development'
-- );
