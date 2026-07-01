-- Nested forum threads: thread_root_id + reply counts for root and direct children.

alter table public.forum_posts
  add column if not exists thread_root_id uuid references public.forum_posts (id) on delete cascade;

with recursive thread as (
  select id, id as root_id
  from public.forum_posts
  where parent_id is null
  union all
  select fp.id, thread.root_id
  from public.forum_posts fp
  join thread on fp.parent_id = thread.id
)
update public.forum_posts fp
set thread_root_id = thread.root_id
from thread
where fp.id = thread.id;

update public.forum_posts
set thread_root_id = id
where parent_id is null and thread_root_id is null;

create index if not exists idx_forum_posts_thread_root
  on public.forum_posts (thread_root_id, created_at);

-- Root posts: total replies in thread
update public.forum_posts root
set reply_count = (
  select count(*)::int
  from public.forum_posts fp
  where fp.thread_root_id = root.id
    and fp.id <> root.id
)
where root.parent_id is null;

-- Nested posts: direct children only
update public.forum_posts parent
set reply_count = (
  select count(*)::int
  from public.forum_posts fp
  where fp.parent_id = parent.id
)
where parent.parent_id is not null;

create or replace function public.sync_forum_thread_root()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_id is null and new.thread_root_id is null then
    new.thread_root_id := new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists forum_thread_root_before_insert on public.forum_posts;
create trigger forum_thread_root_before_insert
  before insert on public.forum_posts
  for each row execute function public.sync_forum_thread_root();

create or replace function public.sync_forum_reply_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  root_id uuid;
begin
  if tg_op = 'INSERT' and new.parent_id is not null then
    update public.forum_posts
    set reply_count = reply_count + 1
    where id = new.parent_id;

    root_id := coalesce(new.thread_root_id, new.parent_id);
    if root_id is not null and root_id <> new.parent_id then
      update public.forum_posts
      set reply_count = reply_count + 1
      where id = root_id;
    end if;

  elsif tg_op = 'DELETE' and old.parent_id is not null then
    update public.forum_posts
    set reply_count = greatest(reply_count - 1, 0)
    where id = old.parent_id;

    root_id := coalesce(old.thread_root_id, old.parent_id);
    if root_id is not null and root_id <> old.parent_id then
      update public.forum_posts
      set reply_count = greatest(reply_count - 1, 0)
      where id = root_id;
    end if;
  end if;

  return null;
end;
$$;
