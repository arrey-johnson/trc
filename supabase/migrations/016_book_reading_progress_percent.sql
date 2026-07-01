-- EPUB progress stores 0–100 in current_page; PDF uses page numbers from 1.

alter table public.book_reading_progress
  drop constraint if exists book_reading_progress_current_page_check;

alter table public.book_reading_progress
  add constraint book_reading_progress_current_page_check
  check (current_page >= 0);

-- EPUB books use page_count = 100 as the percent scale for progress math.
update public.books
set page_count = 100
where format = 'epub' and page_count <> 100;
