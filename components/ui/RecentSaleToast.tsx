"use client";
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { ShoppingBag, X } from 'lucide-react';

interface Sale {
  title: string;
  city: string;
  minutesAgo: number;
  imageUrl?: string;
}

const FALLBACK_CITIES = ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata', 'Tucumán'];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function RecentSaleToast() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [current, setCurrent] = useState<Sale | null>(null);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const supabase = createBrowserClient();
    (async () => {
      // Fetch recent paid orders with their items and shipping addresses
      const { data: orders } = await supabase
        .from('orders')
        .select('id, created_at, first_name')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!orders?.length) return;

      const orderIds = orders.map((o: any) => o.id);

      const [{ data: items }, { data: addresses }] = await Promise.all([
        supabase.from('order_items').select('order_id, title, product_id').in('order_id', orderIds),
        supabase.from('shipping_addresses').select('order_id, city').in('order_id', orderIds),
      ]);

      const cityMap = new Map((addresses || []).map((a: any) => [a.order_id, a.city]));
      const itemMap = new Map((items || []).map((i: any) => [i.order_id, i.title]));

      // Fetch product images for matching items
      const productTitles = (items || []).map((i: any) => i.title);
      const { data: products } = await supabase
        .from('products')
        .select('title, images')
        .in('title', productTitles.slice(0, 20));
      const imageMap = new Map((products || []).map((p: any) => [p.title, p.images?.[0]?.url]));

      const now = Date.now();
      const list: Sale[] = orders
        .filter((o: any) => itemMap.has(o.id))
        .map((o: any) => {
          const title = itemMap.get(o.id) || '';
          const rawCity = cityMap.get(o.id);
          const city = rawCity || FALLBACK_CITIES[randomBetween(0, FALLBACK_CITIES.length - 1)];
          const createdMs = new Date(o.created_at).getTime();
          const diffMin = Math.max(5, Math.round((now - createdMs) / 60000));
          // Cap at 2 days for believability; show as "hace X hs" if > 60 min
          const minutesAgo = Math.min(diffMin, 2880);
          return { title, city, minutesAgo, imageUrl: imageMap.get(title) };
        })
        .filter(s => s.title);

      if (list.length) setSales(list);
    })();
  }, []);

  // Show a toast every 25–45 seconds
  useEffect(() => {
    if (!sales.length) return;
    const show = () => {
      setIndex(i => {
        const next = (i + 1) % sales.length;
        setCurrent(sales[next]);
        setVisible(true);
        setTimeout(() => setVisible(false), 5000);
        return next;
      });
    };

    // First one after 12 seconds
    const first = setTimeout(show, 12000);
    const interval = setInterval(show, randomBetween(25000, 45000));
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [sales]);

  if (!current || !visible) return null;

  const timeLabel = current.minutesAgo < 60
    ? `hace ${current.minutesAgo} min`
    : current.minutesAgo < 1440
    ? `hace ${Math.round(current.minutesAgo / 60)} hs`
    : 'ayer';

  return (
    <div className="fixed bottom-24 left-4 z-50 max-w-[280px] animate-slideIn">
      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-xl">
        {/* Imagen o ícono */}
        <div className="shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
          {current.imageUrl
            ? <img src={current.imageUrl} alt="" className="w-full h-full object-contain" />
            : <ShoppingBag className="w-5 h-5 text-gray-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-gray-900 text-xs font-black leading-tight line-clamp-1">{current.title}</p>
          <p className="text-gray-500 text-[10px] font-bold mt-0.5">
            Comprado desde <span className="text-gray-700">{current.city}</span> · {timeLabel}
          </p>
        </div>

        <button
          onClick={() => setVisible(false)}
          className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors ml-1"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
