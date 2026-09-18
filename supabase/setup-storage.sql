-- Script para configurar el bucket de imágenes de productos
-- Ejecutar en Supabase SQL Editor

-- 1. Crear el bucket si no existe (hacerlo desde la UI de Supabase Storage)
-- Dashboard → Storage → Create Bucket
-- Nombre: product-images
-- Public: YES

-- 2. Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Admin write access" ON storage.objects;
DROP POLICY IF EXISTS "Admin delete access" ON storage.objects;

-- 3. Crear políticas de acceso

-- Lectura pública para todos
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Escritura solo para admins
CREATE POLICY "Admin write access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Actualización solo para admins
CREATE POLICY "Admin update access"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Eliminación solo para admins
CREATE POLICY "Admin delete access"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  qual 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
