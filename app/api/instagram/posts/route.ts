import { NextResponse } from 'next/server';
import { getInstagramPosts } from '@/lib/instagram';

export const runtime = 'nodejs';

/**
 * Usado por el componente client-side de la home (fetch desde el browser).
 * La lógica real vive en lib/instagram.ts, compartida con app/nosotros/page.tsx.
 */
export async function GET() {
  const posts = await getInstagramPosts(8);
  return NextResponse.json({ posts });
}
