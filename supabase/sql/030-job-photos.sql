-- 030 — before-and-after photos of each device (ticket 64)
--
-- Photos live in Supabase Storage, in a PRIVATE bucket "job-photos",
-- one folder per repair:
--     <shop id>/<job id>/before-<time>-<random>.jpg
--     <shop id>/<job id>/after-<time>-<random>.jpg
--
-- Who can do what (storage RLS, below):
--   * see: signed-in members of that shop only; the app shows them
--     through short-lived signed links
--   * add or delete: whoever may change the repair (the owner, or the
--     person handling it), and never on a cancelled repair
--   * customers and anyone outside the shop: nothing
--
-- The bucket only takes JPEG, PNG or WebP images up to 5 MB (the app
-- shrinks photos to ~300 KB before uploading).
--
-- Run in Supabase -> SQL Editor -> New query -> paste -> Run.
-- Needs 029 first.

begin;

-- 1. The bucket ---------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('job-photos', 'job-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. "May I change this repair's photos?" --------------------------------------
--
-- True if the folder is the caller's shop and a repair in it that they may
-- change (owner: any; staff: the ones they handle), and not cancelled.

create or replace function can_change_job_photos(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.jobs j
    where j.shop_id::text = (storage.foldername(object_name))[1]
      and j.id::text = (storage.foldername(object_name))[2]
      and j.shop_id = public.my_shop_id()
      and j.status <> 'cancelled'
      and (public.i_own_my_shop() or j.handled_by = auth.uid())
  );
$$;

revoke all on function can_change_job_photos(text) from public, anon;
grant execute on function can_change_job_photos(text) to authenticated;

-- 3. Storage rules for this bucket ---------------------------------------------

drop policy if exists "Shop members see their shop's job photos" on storage.objects;
create policy "Shop members see their shop's job photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'job-photos'
    and (storage.foldername(name))[1] = (select public.my_shop_id())::text
  );

drop policy if exists "Who can change the repair can add photos" on storage.objects;
create policy "Who can change the repair can add photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'job-photos' and public.can_change_job_photos(name));

drop policy if exists "Who can change the repair can delete photos" on storage.objects;
create policy "Who can change the repair can delete photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'job-photos' and public.can_change_job_photos(name));

-- No update policy: a photo is replaced by deleting it and adding another.

commit;
