import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, event_name, event_category, event_data, page_path } = body;

    if (!session_id || !event_name) {
      return NextResponse.json({ error: 'session_id and event_name required' }, { status: 400 });
    }

    const supabase = await createServerSupabase();

    await supabase.from('analytics_events').insert({
      session_id: String(session_id).slice(0, 120),
      event_name: String(event_name).slice(0, 80),
      event_category: event_category ? String(event_category).slice(0, 60) : null,
      event_data: event_data && typeof event_data === 'object' ? event_data : {},
      page_path: page_path ? String(page_path).slice(0, 300) : null,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Analytics event error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
