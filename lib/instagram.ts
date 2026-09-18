import { createClient } from '@supabase/supabase-js';

export interface InstagramPost {
  id: string;
  imageUrl: string;
  permalink: string;
  caption: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

interface RawInstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
}

/**
 * Trae los últimos posts de la cuenta conectada. El token se carga desde /admin/ajustes
 * (tabla settings, key "instagram_access_token") — no depende de env vars, así
 * el dueño lo puede renovar sin redeploy. Usado tanto por /api/instagram/posts
 * (home, fetch client-side) como por la página /nosotros (server component).
 */
export async function getInstagramPosts(limit = 8): Promise<InstagramPost[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'instagram_access_token')
    .maybeSingle();

  const token = (data?.value as { token?: string } | null)?.token;
  if (!token) return [];

  try {
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink';
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`,
      { next: { revalidate: 3600 } }
    );

    if (!res.ok) {
      console.error('[INSTAGRAM] Error de la API:', res.status, await res.text().catch(() => ''));
      return [];
    }

    const json = await res.json();
    const items: RawInstagramMedia[] = Array.isArray(json?.data) ? json.data : [];

    return items
      .filter((it) => it.media_type !== 'VIDEO' || it.thumbnail_url)
      .map((it) => ({
        id: it.id,
        imageUrl: it.media_type === 'VIDEO' ? it.thumbnail_url! : it.media_url,
        permalink: it.permalink,
        caption: it.caption?.slice(0, 140) ?? '',
        mediaType: it.media_type,
      }));
  } catch (error) {
    console.error('[INSTAGRAM] Error inesperado:', error);
    return [];
  }
}
