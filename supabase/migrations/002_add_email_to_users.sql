-- Add email to user profiles (auth email also lives in auth.users)
alter table public.users
  add column if not exists email text not null default '';

create index if not exists idx_users_email on public.users (email);
