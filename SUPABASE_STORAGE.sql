
-- Create the storage bucket for project images
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true);

-- Set up security policies for the bucket

-- 1. Allow public read access to all images
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'project-images' );

-- 2. Allow authenticated users to upload images
create policy "Authenticated Upload"
on storage.objects for insert
with check (
  bucket_id = 'project-images'
  and auth.role() = 'authenticated'
);

-- 3. Allow users to update their own images (optional, based on needs)
create policy "Owner Update"
on storage.objects for update
using (
  bucket_id = 'project-images'
  and auth.uid() = owner
);

-- 4. Allow users to delete their own images
create policy "Owner Delete"
on storage.objects for delete
using (
  bucket_id = 'project-images'
  and auth.uid() = owner
);
