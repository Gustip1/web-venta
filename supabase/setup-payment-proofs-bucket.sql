-- Script para configurar el bucket de comprobantes de pago
-- Ejecutar en Supabase SQL Editor

-- 1. Crear el bucket (antes había que hacerlo a mano desde Storage → Create Bucket).
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', true)
on conflict (id) do nothing;

-- 2. Políticas de acceso para el bucket payment-proofs

-- Lectura pública (necesario para que el admin vea las imágenes en el panel)
CREATE POLICY "Public read payment proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-proofs');

-- Escritura: solo vía service_role (el endpoint /api/upload-proof usa service_role key)
-- No se necesita política INSERT para usuarios normales porque el upload
-- se hace server-side con la service_role key que bypasea RLS.

-- Si querés permitir que usuarios autenticados suban directamente (opcional):
-- CREATE POLICY "Authenticated users can upload proofs"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'payment-proofs' AND
--   auth.role() = 'authenticated'
-- );

-- Eliminación solo para admins
CREATE POLICY "Admin delete payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);
