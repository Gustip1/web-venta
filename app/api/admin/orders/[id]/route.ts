import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo admin puede eliminar órdenes' }, { status: 403 });
    }

    const orderId = params.id;
    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: order, error: orderError } = await service
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.status !== 'cancelled' && order.status !== 'fulfilled') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar órdenes canceladas o entregadas' },
        { status: 400 }
      );
    }

    // Sólo cancelled devuelve stock — los fulfilled ya salieron del local
    if (order.status === 'cancelled') {
      const { error: restoreError } = await service.rpc('restore_order_stock', {
        p_order_id: orderId,
      });

      if (restoreError) {
        console.error('[ERROR] restore_order_stock:', restoreError);
        return NextResponse.json(
          { error: 'No se pudo restaurar stock antes de eliminar la orden' },
          { status: 500 }
        );
      }
    }

    // order_items y shipping_addresses se eliminan por ON DELETE CASCADE
    const { error: deleteError } = await service.from('orders').delete().eq('id', orderId);

    if (deleteError) {
      console.error('[ERROR] delete order:', deleteError);
      return NextResponse.json({ error: 'No se pudo eliminar la orden' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ERROR] DELETE /api/admin/orders/[id]:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
