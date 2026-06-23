-- Allow authors (and admins) to edit their forum posts

create policy "Authors update own posts"
  on public.forum_posts for update
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "Admins update any forum post"
  on public.forum_posts for update
  using (public.is_admin())
  with check (public.is_admin());
