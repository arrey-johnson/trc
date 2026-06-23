-- Fix push subscription upsert: partial unique index does not work with ON CONFLICT.

drop index if exists public.idx_push_subscriptions_user_endpoint;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_id_endpoint_key;

alter table public.push_subscriptions
  add constraint push_subscriptions_user_id_endpoint_key unique (user_id, endpoint);
