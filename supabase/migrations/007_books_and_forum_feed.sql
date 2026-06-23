-- Book library + Twitter-style forum feed

-- ─── Books ───────────────────────────────────────────────────────────────────

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default '',
  description text not null default '',
  storage_path text not null,
  page_count int not null check (page_count > 0),
  is_active boolean not null default true,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.book_assignments (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  assigned_by uuid not null references public.users (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (book_id, user_id)
);

create index idx_book_assignments_user on public.book_assignments (user_id);

create table public.book_reading_progress (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  current_page int not null default 1 check (current_page >= 1),
  last_read_at timestamptz not null default now(),
  unique (book_id, user_id)
);

create table public.book_reading_daily_log (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  pages_read int not null default 0 check (pages_read >= 0),
  unique (book_id, user_id, date)
);

create index idx_book_daily_log_date on public.book_reading_daily_log (date desc);

alter table public.books enable row level security;
alter table public.book_assignments enable row level security;
alter table public.book_reading_progress enable row level security;
alter table public.book_reading_daily_log enable row level security;

create policy "Admins manage books"
  on public.books for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users read assigned books"
  on public.books for select
  using (
    exists (
      select 1 from public.book_assignments ba
      where ba.book_id = id and ba.user_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "Admins manage assignments"
  on public.book_assignments for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Users read own assignments"
  on public.book_assignments for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users manage own reading progress"
  on public.book_reading_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all reading progress"
  on public.book_reading_progress for select
  using (public.is_admin());

create policy "Users manage own daily log"
  on public.book_reading_daily_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Admins read all daily log"
  on public.book_reading_daily_log for select
  using (public.is_admin());

-- ─── Storage bucket for PDFs ─────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'books',
  'books',
  false,
  52428800,
  array['application/pdf']
)
on conflict (id) do nothing;

create policy "Admins manage book PDFs"
  on storage.objects for all
  using (bucket_id = 'books' and public.is_admin())
  with check (bucket_id = 'books' and public.is_admin());

-- ─── Forum feed (Twitter-style) ──────────────────────────────────────────────

alter table public.forum_posts
  alter column title drop not null;

alter table public.forum_posts
  add column if not exists parent_id uuid references public.forum_posts (id) on delete cascade;

alter table public.forum_posts
  add column if not exists like_count int not null default 0;

alter table public.forum_posts
  add column if not exists reply_count int not null default 0;

create index if not exists idx_forum_posts_parent
  on public.forum_posts (parent_id, created_at);

create index if not exists idx_forum_posts_feed
  on public.forum_posts (created_at desc)
  where parent_id is null;

create table if not exists public.forum_post_likes (
  post_id uuid not null references public.forum_posts (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.forum_post_likes enable row level security;

drop policy if exists "Members read published forum posts" on public.forum_posts;
drop policy if exists "Admins manage forum posts" on public.forum_posts;

create policy "Members read forum posts"
  on public.forum_posts for select
  using (auth.uid() is not null);

create policy "Members create own posts"
  on public.forum_posts for insert
  with check (auth.uid() = author_id);

create policy "Authors delete own posts"
  on public.forum_posts for delete
  using (auth.uid() = author_id);

create policy "Admins delete any forum post"
  on public.forum_posts for delete
  using (public.is_admin());

create policy "Members read likes"
  on public.forum_post_likes for select
  using (auth.uid() is not null);

create policy "Members manage own likes"
  on public.forum_post_likes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep like_count in sync
create or replace function public.sync_forum_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.forum_posts set like_count = like_count + 1 where id = new.post_id;
  elsif tg_op = 'DELETE' then
    update public.forum_posts set like_count = greatest(like_count - 1, 0) where id = old.post_id;
  end if;
  return null;
end;
$$;

drop trigger if exists forum_like_count_insert on public.forum_post_likes;
create trigger forum_like_count_insert
  after insert on public.forum_post_likes
  for each row execute function public.sync_forum_like_count();

drop trigger if exists forum_like_count_delete on public.forum_post_likes;
create trigger forum_like_count_delete
  after delete on public.forum_post_likes
  for each row execute function public.sync_forum_like_count();

-- Keep reply_count in sync
create or replace function public.sync_forum_reply_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.parent_id is not null then
    update public.forum_posts set reply_count = reply_count + 1 where id = new.parent_id;
  elsif tg_op = 'DELETE' and old.parent_id is not null then
    update public.forum_posts set reply_count = greatest(reply_count - 1, 0) where id = old.parent_id;
  end if;
  return null;
end;
$$;

drop trigger if exists forum_reply_count_insert on public.forum_posts;
create trigger forum_reply_count_insert
  after insert on public.forum_posts
  for each row execute function public.sync_forum_reply_count();

drop trigger if exists forum_reply_count_delete on public.forum_posts;
create trigger forum_reply_count_delete
  after delete on public.forum_posts
  for each row execute function public.sync_forum_reply_count();
