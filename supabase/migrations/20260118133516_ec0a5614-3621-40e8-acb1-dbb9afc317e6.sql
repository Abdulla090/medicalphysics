-- Create storage bucket for lesson content images
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-content', 'lesson-content', true);

-- Allow anyone to view images
CREATE POLICY "Lesson content images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'lesson-content');

-- Allow authenticated admins to upload images
CREATE POLICY "Admins can upload lesson content images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lesson-content' 
  AND auth.uid() IS NOT NULL 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update their uploads
CREATE POLICY "Admins can update lesson content images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'lesson-content' 
  AND auth.uid() IS NOT NULL 
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete images
CREATE POLICY "Admins can delete lesson content images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'lesson-content' 
  AND auth.uid() IS NOT NULL 
  AND public.has_role(auth.uid(), 'admin')
);