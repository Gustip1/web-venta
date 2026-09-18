import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, duration_seconds, pages_viewed, scroll_depth } = body;

    if (!session_id) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    // Service role: el visitante es anónimo (nunca cumple la policy de UPDATE,
    // que exige rol admin), así que con el cliente autenticado normal este
    // update nunca escribía nada — duración/rebote/scroll quedaban siempre
    // en su valor por defecto.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabase
      .from('analytics_visits')
      .update({
        duration_seconds: duration_seconds || 0,
        pages_viewed: pages_viewed || 1,
        is_bounce: (pages_viewed || 1) <= 1 && (duration_seconds || 0) < 5,
        scroll_depth: scroll_depth ?? 0,
        exited_at: new Date().toISOString(),
      })
      .eq('session_id', session_id)
      .is('exited_at', null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics exit error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
