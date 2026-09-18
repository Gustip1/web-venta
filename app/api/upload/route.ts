import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';
import { normalizeProductImage } from '@/lib/images/normalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars');
    return NextResponse.json({ error: 'Configuración del servidor incompleta' }, { status: 500 });
  }

  // Auth check
  const supaSSR = await createServerSupabase();
  const { data: { user } } = await supaSSR.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autenticado. Iniciá sesión primero.' }, { status: 401 });
  }

  const { data: profile } = await supaSSR.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'No tenés permisos de admin' }, { status: 403 });
  }

  // Parse files
  const formData = await req.formData();
  const files = formData.getAll('files');
  if (!files || files.length === 0) return NextResponse.json([], { status: 200 });

  // Admin client for storage (bypass RLS)
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const outputs: { url: string; warning?: string; original?: string }[] = [];

  try {
    for (const file of files) {
      if (!(file instanceof File)) continue;

      // sharp lee prácticamente cualquier formato, así que se acepta todo lo
      // que sea imagen y se unifica más abajo. Antes solo pasaban jpg/png/webp
      // y una foto en avif o heic (las que saca el iPhone) se descartaba sin
      // aviso, con lo cual el producto quedaba sin foto.
      if (!file.type.startsWith('image/')) {
        console.warn(`Archivo ignorado, no es una imagen: ${file.type}`);
        continue;
      }

      const arrayBuffer = await file.arrayBuffer();
      const original = Buffer.from(arrayBuffer);

      // Todas las fotos salen del mismo molde: cuadrada, 1400x1400 y WebP.
      let normalized;
      try {
        normalized = await normalizeProductImage(original);
      } catch (e) {
        console.error(`No se pudo procesar ${file.name}:`, e);
        continue;
      }

      console.log(
        `[upload] ${file.name}: ${normalized.originalFormat} ${Math.round(normalized.originalBytes / 1024)}KB → webp ${Math.round(normalized.bytes / 1024)}KB`
      );

      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.webp`;

      const { error } = await supabaseAdmin.storage
        .from('product-images')
        .upload(fileName, normalized.buffer, {
          contentType: 'image/webp',
          cacheControl: '31536000',
          upsert: false,
        });

      if (error) {
        console.error('Storage upload error:', error.message);
        continue;
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from('product-images')
        .getPublicUrl(fileName);

      if (publicUrlData?.publicUrl) {
        outputs.push({
          url: publicUrlData.publicUrl,
          // El aviso viaja al panel para que el admin sepa que esa foto se va
          // a ver borrosa y pueda buscar una mejor antes de publicar.
          ...(normalized.warning ? { warning: normalized.warning } : {}),
          original: `${normalized.originalWidth}×${normalized.originalHeight}`,
        });
      }
    }

    return NextResponse.json(outputs);
  } catch (error) {
    console.error('Error processing images:', error);
    return NextResponse.json({
      error: 'Error al subir las imágenes. Intenta nuevamente.',
    }, { status: 500 });
  }
}


