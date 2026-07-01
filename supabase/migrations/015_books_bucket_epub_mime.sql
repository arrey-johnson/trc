-- Allow EPUB uploads in the books storage bucket

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/epub+zip',
  'application/epub',
  'application/x-epub+zip'
]
where id = 'books';
