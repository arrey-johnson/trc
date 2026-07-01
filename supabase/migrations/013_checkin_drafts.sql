-- Allow in-progress check-ins that auto-save item by item
alter table public.checkins
  drop constraint if exists checkins_status_check;

alter table public.checkins
  add constraint checkins_status_check
  check (status in ('draft', 'complete', 'partial', 'missed'));

create unique index if not exists idx_checkin_items_checkin_routine_item
  on public.checkin_items (checkin_id, routine_item_id);
