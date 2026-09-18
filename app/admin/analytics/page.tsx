"use client";
import { useCallback, useEffect, useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import {
  Users, Clock, TrendingUp, TrendingDown, Minus, Eye, RefreshCw, ShoppingCart,
  MessageCircle, DollarSign, Smartphone, Monitor, Tablet, Info, ArrowRight,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────────────
   Panel de analíticas.

   Criterios de precisión (por qué los números son los que son):

   1. Una "visita" es una SESIÓN, no una fila. Cada cambio de página inserta
      una fila nueva en analytics_visits para la misma sesión, así que contar
      filas multiplicaba las visitas.

   2. Duración, rebote y scroll SOLO se calculan sobre las sesiones que
      alcanzaron a mandar el beacon de salida (exited_at). Las que no lo
      mandaron (~14%) tienen duración 0 y is_bounce en su valor por defecto:
      mezclarlas hundía la duración promedio e inflaba el rebote a más del
      doble del real. Se muestra la cobertura para ser transparentes.

   3. Se muestra MEDIANA además del promedio: unas pocas pestañas olvidadas
      abiertas horas inflan el promedio y dan una idea equivocada.

   4. El embudo se mide en SESIONES ÚNICAS en todos sus pasos, así cada paso
      es un subconjunto del anterior y los porcentajes cierran. Antes mezclaba
      sesiones con cantidad de eventos.

   5. La conversión real del negocio incluye los CONTACTOS por WhatsApp,
      ofertas y pedidos de link de cuotas: la mayoría de las ventas se cierra
      por ahí, no en el checkout web. Medir solo el checkout hacía parecer que
      la tienda no convertía.
   ──────────────────────────────────────────────────────────────────────── */

const DAYS_ES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const RANGES = [
  { key: '1d', label: 'Hoy', days: 1 },
  { key: '7d', label: '7 días', days: 7 },
  { key: '30d', label: '30 días', days: 30 },
  { key: '90d', label: '90 días', days: 90 },
  { key: '365d', label: '1 año', days: 365 },
] as const;
type RangeKey = (typeof RANGES)[number]['key'];

/** Eventos que significan "esta persona quiso comprar / negociar" */
const LEAD_EVENTS = ['whatsapp_click', 'offer_requested', 'installments_link_requested'];

const EVENT_LABELS: Record<string, string> = {
  whatsapp_click: 'Consultas por WhatsApp',
  offer_requested: 'Ofertas enviadas',
  installments_link_requested: 'Pidieron link de 3 cuotas',
  add_to_cart: 'Agregados al carrito',
  checkout_started: 'Checkouts iniciados',
  purchase: 'Órdenes creadas',
  product_card_click: 'Clicks en productos',
  cuartito_ticket_click: 'Clicks entradas El Cuartito',
};

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

const fmtInt = (n: number) => new Intl.NumberFormat('es-AR').format(Math.round(n));
const fmtUsd = (n: number) => `USD $${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n)}`;
const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
const fmtPct = (n: number) => `${n.toFixed(n < 10 ? 1 : 0)}%`;

/**
 * Trae TODAS las filas: Supabase corta en 1000 por request, así que hay que
 * paginar. Las páginas se piden EN PARALELO (en tandas) porque en serie, con
 * 30-90 días de tráfico, el panel tardaba casi un minuto en cargar.
 */
async function fetchAll<T>(
  count: number,
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  hardLimit = 80000
): Promise<T[]> {
  const page = 1000;
  const total = Math.min(count, hardLimit);
  if (total <= 0) return [];

  const ranges: [number, number][] = [];
  for (let from = 0; from < total; from += page) ranges.push([from, from + page - 1]);

  const out: T[] = [];
  const CONCURRENCY = 8;
  for (let i = 0; i < ranges.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      ranges.slice(i, i + CONCURRENCY).map(([f, t]) => build(f, t))
    );
    batch.forEach(r => { if (r.data) out.push(...r.data); });
  }
  return out;
}

/** Cuenta filas sin traerlas, para saber cuántas páginas pedir. */
async function countRows(q: PromiseLike<{ count: number | null }>): Promise<number> {
  const { count } = await q;
  return count ?? 0;
}

interface VisitRow {
  session_id: string;
  visitor_id: string | null;
  page_path: string | null;
  device_type: string | null;
  referrer_domain: string | null;
  duration_seconds: number | null;
  is_bounce: boolean | null;
  scroll_depth: number | null;
  exited_at: string | null;
  created_at: string;
}
interface EventRow {
  session_id: string;
  event_name: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

interface Stats {
  coverage: number;            // % de sesiones con datos de salida
  sessions: number;
  visitors: number;
  recurring: number;           // visitantes con más de una sesión en el período
  prevSessions: number;
  prevVisitors: number;
  live: number;

  leadSessions: number;        // sesiones que contactaron (WhatsApp/oferta/cuotas)
  prevLeadSessions: number;

  funnel: { label: string; hint: string; count: number }[];
  leadBreakdown: { name: string; label: string; count: number }[];

  orders: number;
  revenue: number;
  avgTicket: number;
  revenueAllTime: number;
  ordersAllTime: number;

  avgDuration: number;
  medianDuration: number;
  bounceRate: number;
  avgScroll: number;
  pagesPerSession: number;

  bySource: { source: string; sessions: number; leads: number }[];
  byDevice: { device: string; sessions: number }[];
  byPage: { path: string; sessions: number }[];
  topViewed: { slug: string; sessions: number }[];
  topSold: { title: string; units: number; revenue: number }[];
  byDay: { day: string; sessions: number }[];
  byHour: { hour: number; sessions: number }[];
  trend: { date: string; sessions: number; leads: number }[];
  otherEvents: { label: string; count: number }[];
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('30d');

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createBrowserClient();
    const days = RANGES.find(r => r.key === range)!.days;

    const now = new Date();
    const start = new Date();
    if (days === 1) start.setHours(0, 0, 0, 0);
    else start.setDate(start.getDate() - days);
    // Período anterior del mismo largo, para comparar
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - days);
    const liveFrom = new Date(now.getTime() - 5 * 60 * 1000);

    const startIso = start.toISOString();
    const prevStartIso = prevStart.toISOString();

    try {
      // Primero contamos (requests baratos, sin traer filas) para poder pedir
      // todas las páginas en paralelo en vez de una atrás de otra.
      const [nVisits, nPrevVisits, nEvents, nPrevEvents] = await Promise.all([
        countRows(supabase.from('analytics_visits').select('*', { count: 'exact', head: true })
          .gte('created_at', startIso)),
        countRows(supabase.from('analytics_visits').select('*', { count: 'exact', head: true })
          .gte('created_at', prevStartIso).lt('created_at', startIso)),
        countRows(supabase.from('analytics_events').select('*', { count: 'exact', head: true })
          .gte('created_at', startIso)),
        countRows(supabase.from('analytics_events').select('*', { count: 'exact', head: true })
          .gte('created_at', prevStartIso).lt('created_at', startIso)
          .in('event_name', LEAD_EVENTS)),
      ]);

      const [visits, prevVisits, events, prevEvents, liveRows, orders, items] = await Promise.all([
        fetchAll<VisitRow>(nVisits, (f, t) => supabase.from('analytics_visits')
          .select('session_id,visitor_id,page_path,device_type,referrer_domain,duration_seconds,is_bounce,scroll_depth,exited_at,created_at')
          .gte('created_at', startIso).range(f, t)),
        fetchAll<{ session_id: string; visitor_id: string | null }>(nPrevVisits, (f, t) => supabase.from('analytics_visits')
          .select('session_id,visitor_id')
          .gte('created_at', prevStartIso).lt('created_at', startIso).range(f, t)),
        fetchAll<EventRow>(nEvents, (f, t) => supabase.from('analytics_events')
          .select('session_id,event_name,event_data,created_at')
          .gte('created_at', startIso).range(f, t)),
        fetchAll<{ session_id: string; event_name: string }>(nPrevEvents, (f, t) => supabase.from('analytics_events')
          .select('session_id,event_name')
          .gte('created_at', prevStartIso).lt('created_at', startIso)
          .in('event_name', LEAD_EVENTS).range(f, t)),
        supabase.from('analytics_visits').select('session_id').gte('created_at', liveFrom.toISOString()).limit(2000),
        supabase.from('orders').select('total,status,created_at').limit(5000),
        supabase.from('order_items')
          .select('title,price,quantity,orders!inner(created_at,status)')
          .gte('orders.created_at', startIso)
          .in('orders.status', ['paid', 'fulfilled']).limit(5000),
      ]);

      // ── Sesiones: una fila por sesión, priorizando la que tiene exited_at ──
      const bySession = new Map<string, VisitRow>();
      visits.forEach(v => {
        const prev = bySession.get(v.session_id);
        if (!prev || (!prev.exited_at && v.exited_at)) bySession.set(v.session_id, v);
      });
      const S = [...bySession.values()];
      const sessions = S.length;
      const closed = S.filter(v => v.exited_at);          // solo estas tienen datos reales
      const coverage = pct(closed.length, sessions);

      const visitorIds = new Set(S.map(v => v.visitor_id).filter(Boolean) as string[]);
      const sessionsPerVisitor: Record<string, number> = {};
      S.forEach(v => { if (v.visitor_id) sessionsPerVisitor[v.visitor_id] = (sessionsPerVisitor[v.visitor_id] || 0) + 1; });
      const recurring = Object.values(sessionsPerVisitor).filter(c => c > 1).length;

      // ── Embudo, todo en sesiones únicas para que los pasos cierren ──
      const sessionsWith = (pred: (e: EventRow) => boolean) =>
        new Set(events.filter(pred).map(e => e.session_id));
      const productSessions = new Set(
        visits.filter(v => v.page_path?.startsWith('/producto/')).map(v => v.session_id)
      );
      const cartSessions = sessionsWith(e => e.event_name === 'add_to_cart');
      const checkoutSessions = sessionsWith(e => e.event_name === 'checkout_started');
      const leadSet = sessionsWith(e => LEAD_EVENTS.includes(e.event_name));

      const paidOrders = orders.data?.filter((o: any) => o.status === 'paid' || o.status === 'fulfilled') ?? [];
      const ordersInRange = paidOrders.filter((o: any) => new Date(o.created_at) >= start);
      const revenue = ordersInRange.reduce((s: number, o: any) => s + Number(o.total || 0), 0);

      // Cada paso se arma como "llegó AL MENOS hasta acá": el de intención
      // incluye el checkout y el de producto incluye a los dos siguientes. Sin
      // esto el embudo podía crecer de un paso al otro (el botón de WhatsApp
      // está en toda la web, así que alguien puede escribir sin abrir una
      // ficha) y los porcentajes daban más de 100%.
      const intentSessions = new Set([...cartSessions, ...leadSet, ...checkoutSessions]);
      const interestSessions = new Set([...productSessions, ...intentSessions]);

      const funnel = [
        { label: 'Entraron a la web', hint: 'Personas distintas', count: sessions },
        { label: 'Se engancharon con un producto', hint: 'Abrieron una ficha o preguntaron por uno', count: interestSessions.size },
        { label: 'Quisieron comprar', hint: 'Carrito, WhatsApp, oferta o cuotas', count: intentSessions.size },
        { label: 'Iniciaron el checkout', hint: 'Llegaron al formulario de compra', count: checkoutSessions.size },
        { label: 'Compraron', hint: 'Pedidos confirmados en la web', count: ordersInRange.length },
      ];

      const prevLeadSessions = new Set(prevEvents.map(e => e.session_id)).size;

      const eventCounts: Record<string, number> = {};
      events.forEach(e => { eventCounts[e.event_name] = (eventCounts[e.event_name] || 0) + 1; });
      const leadBreakdown = LEAD_EVENTS.map(name => ({
        name, label: EVENT_LABELS[name] ?? name, count: eventCounts[name] || 0,
      })).sort((a, b) => b.count - a.count);

      // ── Comportamiento (solo sesiones con datos de salida) ──
      const durations = closed.map(v => v.duration_seconds || 0);
      const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
      const bounceRate = pct(closed.filter(v => v.is_bounce).length, closed.length);
      const scrolls = closed.map(v => v.scroll_depth ?? 0);
      const avgScroll = scrolls.length ? scrolls.reduce((a, b) => a + b, 0) / scrolls.length : 0;
      const pagesPerSession = sessions ? visits.length / sessions : 0;

      // ── Cortes ──
      const tally = <T,>(arr: T[], key: (x: T) => string) => {
        const m: Record<string, number> = {};
        arr.forEach(x => { const k = key(x); m[k] = (m[k] || 0) + 1; });
        return m;
      };
      const sourceCounts = tally(S, v => v.referrer_domain || 'Directo / guardado');
      const bySource = Object.entries(sourceCounts)
        .map(([source, n]) => ({
          source,
          sessions: n,
          leads: S.filter(v => (v.referrer_domain || 'Directo / guardado') === source && leadSet.has(v.session_id)).length,
        }))
        .sort((a, b) => b.sessions - a.sessions).slice(0, 8);

      const byDevice = Object.entries(tally(S, v => v.device_type || 'desconocido'))
        .map(([device, sessions]) => ({ device, sessions })).sort((a, b) => b.sessions - a.sessions);

      // páginas y productos: sesiones distintas por ruta (no filas)
      const pathSessions: Record<string, Set<string>> = {};
      visits.forEach(v => {
        const p = v.page_path || '/';
        (pathSessions[p] ||= new Set()).add(v.session_id);
      });
      const byPage = Object.entries(pathSessions)
        .filter(([p]) => !p.startsWith('/producto/'))
        .map(([path, s]) => ({ path, sessions: s.size }))
        .sort((a, b) => b.sessions - a.sessions).slice(0, 8);
      const topViewed = Object.entries(pathSessions)
        .filter(([p]) => p.startsWith('/producto/'))
        .map(([p, s]) => ({ slug: p.replace('/producto/', ''), sessions: s.size }))
        .sort((a, b) => b.sessions - a.sessions).slice(0, 8);

      const soldMap: Record<string, { title: string; units: number; revenue: number }> = {};
      (items.data ?? []).forEach((it: any) => {
        const k = it.title || '—';
        soldMap[k] ||= { title: k, units: 0, revenue: 0 };
        soldMap[k].units += Number(it.quantity) || 1;
        soldMap[k].revenue += Number(it.price || 0) * (Number(it.quantity) || 1);
      });
      const topSold = Object.values(soldMap).sort((a, b) => b.units - a.units).slice(0, 8);

      const dayCounts = tally(S, v => DAYS_ES[new Date(v.created_at).getDay()]);
      const byDay = DAYS_ES.map(d => ({ day: d, sessions: dayCounts[d] || 0 }));
      const hourCounts = tally(S, v => String(new Date(v.created_at).getHours()));
      const byHour = Array.from({ length: 24 }, (_, h) => ({ hour: h, sessions: hourCounts[String(h)] || 0 }));

      const trendMap: Record<string, { s: Set<string>; l: Set<string> }> = {};
      S.forEach(v => {
        const k = toLocalDateKey(new Date(v.created_at));
        (trendMap[k] ||= { s: new Set(), l: new Set() }).s.add(v.session_id);
        if (leadSet.has(v.session_id)) trendMap[k].l.add(v.session_id);
      });
      const trend = Object.entries(trendMap)
        .map(([date, v]) => ({ date, sessions: v.s.size, leads: v.l.size }))
        .sort((a, b) => a.date.localeCompare(b.date));

      const otherEvents = Object.entries(eventCounts)
        .filter(([n]) => !n.startsWith('engaged_') && !LEAD_EVENTS.includes(n))
        .map(([n, count]) => ({ label: EVENT_LABELS[n] ?? n, count }))
        .sort((a, b) => b.count - a.count).slice(0, 8);

      setStats({
        coverage, sessions, visitors: visitorIds.size, recurring,
        prevSessions: new Set(prevVisits.map(v => v.session_id)).size,
        prevVisitors: new Set(prevVisits.map(v => v.visitor_id).filter(Boolean)).size,
        live: new Set((liveRows.data ?? []).map((v: any) => v.session_id)).size,
        leadSessions: leadSet.size, prevLeadSessions,
        funnel, leadBreakdown,
        orders: ordersInRange.length, revenue,
        avgTicket: ordersInRange.length ? revenue / ordersInRange.length : 0,
        revenueAllTime: paidOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0),
        ordersAllTime: paidOrders.length,
        avgDuration, medianDuration: median(durations), bounceRate, avgScroll, pagesPerSession,
        bySource, byDevice, byPage, topViewed, topSold, byDay, byHour, trend, otherEvents,
      });
    } catch (err) {
      console.error('Error cargando analíticas:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  /* ── UI helpers ── */
  const Delta = ({ now, before }: { now: number; before: number }) => {
    if (!before) return <span className="text-xs font-medium text-gray-400">sin datos previos</span>;
    const diff = pct(now - before, before);
    const Icon = diff > 1 ? TrendingUp : diff < -1 ? TrendingDown : Minus;
    const color = diff > 1 ? 'text-green-600' : diff < -1 ? 'text-red-600' : 'text-gray-500';
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
        <Icon className="w-3.5 h-3.5" />
        {diff > 0 ? '+' : ''}{diff.toFixed(0)}% vs período anterior
      </span>
    );
  };

  const Kpi = ({ icon: Icon, label, value, sub, delta, accent }: {
    icon: any; label: string; value: string; sub?: string;
    delta?: { now: number; before: number }; accent?: string;
  }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${accent ?? 'bg-gray-100 text-gray-700'}`}>
          <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
        </div>
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className="text-3xl font-black text-gray-900 leading-none">{value}</p>
      {sub && <p className="mt-1.5 text-xs font-semibold text-gray-500">{sub}</p>}
      {delta && <div className="mt-2">{<Delta now={delta.now} before={delta.before} />}</div>}
    </div>
  );

  const Section = ({ title, help, children }: { title: string; help?: string; children: React.ReactNode }) => (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-base font-black text-gray-900">{title}</h2>
      {help && <p className="mt-1 mb-4 text-xs font-medium text-gray-500 leading-relaxed">{help}</p>}
      {!help && <div className="mb-4" />}
      {children}
    </section>
  );

  const BarList = ({ rows, unit = '' }: { rows: { label: string; value: number; extra?: string }[]; unit?: string }) => {
    const max = Math.max(1, ...rows.map(r => r.value));
    if (!rows.length) return <p className="text-sm text-gray-400 font-medium">Sin datos en este período.</p>;
    return (
      <div className="space-y-2.5">
        {rows.map(r => (
          <div key={r.label}>
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span className="text-sm font-bold text-gray-800 truncate">{r.label}</span>
              <span className="text-sm font-black text-gray-900 shrink-0">
                {fmtInt(r.value)}{unit}
                {r.extra && <span className="ml-2 text-xs font-bold text-gray-400">{r.extra}</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full rounded-full bg-gray-900" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading && !stats) {
    return (
      <div className="text-center py-24">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-current border-r-transparent text-gray-400" />
        <p className="mt-3 text-gray-500 font-bold">Calculando analíticas…</p>
      </div>
    );
  }
  if (!stats) return <p className="text-gray-500">No se pudieron cargar las analíticas.</p>;

  const s = stats;
  const rangeLabel = RANGES.find(r => r.key === range)!.label.toLowerCase();
  const maxTrend = Math.max(1, ...s.trend.map(t => t.sessions));

  return (
    <div className="space-y-6 pb-10">
      {/* ── Encabezado ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">📊 Analíticas</h1>
          <p className="text-sm text-gray-500 font-semibold mt-0.5">
            {s.live > 0
              ? <><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse" />{s.live} {s.live === 1 ? 'persona' : 'personas'} navegando ahora</>
              : 'Nadie navegando en los últimos 5 minutos'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {RANGES.map(r => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-colors ${
                range === r.key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {r.label}
            </button>
          ))}
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-gray-400 disabled:opacity-50"
            aria-label="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Resumen ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Visitas" value={fmtInt(s.sessions)}
             sub={`${fmtInt(s.visitors)} personas distintas`}
             delta={{ now: s.sessions, before: s.prevSessions }} />
        <Kpi icon={MessageCircle} label="Te contactaron" value={fmtInt(s.leadSessions)}
             sub={`${fmtPct(pct(s.leadSessions, s.sessions))} de las visitas · WhatsApp, ofertas y cuotas`}
             delta={{ now: s.leadSessions, before: s.prevLeadSessions }}
             accent="bg-green-100 text-green-700" />
        <Kpi icon={ShoppingCart} label="Ventas confirmadas" value={fmtInt(s.orders)}
             sub={s.orders ? `Ticket promedio ${fmtUsd(s.avgTicket)}` : 'Sin ventas web en el período'}
             accent="bg-blue-100 text-blue-700" />
        <Kpi icon={DollarSign} label="Facturación" value={fmtUsd(s.revenue)}
             sub={`Histórico: ${fmtUsd(s.revenueAllTime)} en ${s.ordersAllTime} ventas`}
             accent="bg-amber-100 text-amber-700" />
      </div>

      {/* ── Embudo ── */}
      <Section
        title="¿En qué parte se cae la gente?"
        help="Cada escalón cuenta personas distintas, así que siempre es un subconjunto del anterior. Debajo de cada uno ves qué porcentaje del escalón anterior siguió adelante."
      >
        <div className="space-y-3">
          {s.funnel.map((step, i) => {
            const prev = i === 0 ? step.count : s.funnel[i - 1].count;
            const share = pct(step.count, s.funnel[0].count);
            const conv = i === 0 ? 100 : pct(step.count, prev);
            const lost = prev - step.count;
            return (
              <div key={step.label}>
                <div className="flex items-baseline justify-between gap-3 mb-1">
                  <div className="min-w-0">
                    <span className="text-sm font-black text-gray-900">{step.label}</span>
                    <span className="ml-2 text-xs font-semibold text-gray-400">{step.hint}</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 shrink-0">{fmtInt(step.count)}</span>
                </div>
                <div className="h-7 rounded-lg bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-lg flex items-center px-2 ${i === s.funnel.length - 1 ? 'bg-green-600' : 'bg-gray-900'}`}
                    style={{ width: `${Math.max(share, 2)}%` }}
                  >
                    <span className="text-[10px] font-black text-white whitespace-nowrap">{fmtPct(share)}</span>
                  </div>
                </div>
                {i > 0 && (
                  <p className="mt-1 text-xs font-semibold text-gray-500">
                    Siguió el {fmtPct(conv)} del paso anterior
                    {lost > 0 && <span className="text-red-600"> · se fueron {fmtInt(lost)}</span>}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 font-semibold leading-relaxed">
            &quot;Quisieron comprar&quot; incluye a los que te escribieron por WhatsApp, tiraron una oferta o
            pidieron el link de 3 cuotas. La mayoría de tus ventas se cierra por ahí y no en el checkout
            web, así que mirar solo &quot;Compraron&quot; te haría creer que la web convierte mucho peor de lo que convierte.
          </p>
        </div>
      </Section>

      {/* ── Contactos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="¿Cómo te contactaron?" help={`Cantidad de acciones en los últimos ${rangeLabel}.`}>
          <BarList rows={s.leadBreakdown.map(l => ({ label: l.label, value: l.count }))} />
        </Section>
        <Section title="¿De dónde viene la gente y cuál te trae compradores?"
                 help="Ordenado por visitas. La tasa es qué porcentaje de esa fuente terminó contactándote: te dice dónde conviene invertir.">
          {s.bySource.length === 0 ? (
            <p className="text-sm text-gray-400 font-medium">Sin datos en este período.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-200">
                    <th className="text-left font-black px-2 py-2">Origen</th>
                    <th className="text-right font-black px-2 py-2">Visitas</th>
                    <th className="text-right font-black px-2 py-2">Contactos</th>
                    <th className="text-right font-black px-2 py-2">Tasa</th>
                  </tr>
                </thead>
                <tbody>
                  {s.bySource.map(r => (
                    <tr key={r.source} className="border-b border-gray-100 last:border-0">
                      <td className="px-2 py-2 font-bold text-gray-800 truncate max-w-[180px]">{r.source}</td>
                      <td className="px-2 py-2 text-right font-black text-gray-900">{fmtInt(r.sessions)}</td>
                      <td className="px-2 py-2 text-right font-bold text-gray-700">{fmtInt(r.leads)}</td>
                      <td className={`px-2 py-2 text-right font-black ${r.leads ? 'text-green-600' : 'text-gray-300'}`}>
                        {fmtPct(pct(r.leads, r.sessions))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      </div>

      {/* ── Tendencia ── */}
      <Section title="Cómo vino el tráfico día a día"
               help="Barra gris: visitas. Punto verde: cuántas de esas visitas terminaron contactándote.">
        {s.trend.length === 0 ? (
          <p className="text-sm text-gray-400 font-medium">Sin datos en este período.</p>
        ) : (
          <div className="flex items-end gap-1 h-40 overflow-x-auto pb-1">
            {s.trend.map(t => (
              <div key={t.date} className="flex-1 min-w-[10px] flex flex-col items-center justify-end h-full group relative">
                <div className="w-full rounded-t bg-gray-900 transition-all group-hover:bg-gray-700"
                     style={{ height: `${(t.sessions / maxTrend) * 100}%` }} />
                {t.leads > 0 && <div className="absolute -top-1 w-1.5 h-1.5 rounded-full bg-green-500"
                                     style={{ bottom: `calc(${(t.sessions / maxTrend) * 100}% + 2px)` }} />}
                <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded bg-gray-900 text-white text-[10px] font-bold px-2 py-1">
                  {t.date}: {t.sessions} visitas · {t.leads} contactos
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Productos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Productos más mirados" help="Personas distintas que abrieron la ficha del producto.">
          <BarList rows={s.topViewed.map(p => ({ label: p.slug, value: p.sessions }))} />
        </Section>
        <Section title="Productos más vendidos" help="Solo pedidos confirmados (pagados o entregados).">
          {s.topSold.length === 0
            ? <p className="text-sm text-gray-400 font-medium">Sin ventas registradas en la web en este período.</p>
            : <BarList rows={s.topSold.map(p => ({ label: p.title, value: p.units, extra: fmtUsd(p.revenue) }))} unit=" u." />}
        </Section>
      </div>

      {/* ── Secciones y dispositivos ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Secciones más visitadas" help="Personas distintas que entraron a cada sección.">
          <BarList rows={s.byPage.map(p => ({ label: p.path, value: p.sessions }))} />
        </Section>
        <Section title="Con qué entran" help="Porcentaje de visitas por tipo de dispositivo.">
          <div className="grid grid-cols-3 gap-3">
            {s.byDevice.slice(0, 3).map(d => {
              const Icon = d.device === 'mobile' ? Smartphone : d.device === 'tablet' ? Tablet : Monitor;
              const nombre = d.device === 'mobile' ? 'Celular' : d.device === 'tablet' ? 'Tablet' : d.device === 'desktop' ? 'Compu' : d.device;
              return (
                <div key={d.device} className="rounded-lg border border-gray-200 p-3 text-center">
                  <Icon className="w-5 h-5 mx-auto text-gray-700 mb-1.5" />
                  <p className="text-xl font-black text-gray-900 leading-none">{fmtPct(pct(d.sessions, s.sessions))}</p>
                  <p className="text-[11px] font-bold text-gray-500 mt-1">{nombre}</p>
                  <p className="text-[10px] font-semibold text-gray-400">{fmtInt(d.sessions)} visitas</p>
                </div>
              );
            })}
          </div>
          {s.otherEvents.length > 0 && (
            <>
              <p className="mt-5 mb-2 text-xs font-black uppercase tracking-wide text-gray-500">Otras acciones</p>
              <BarList rows={s.otherEvents.map(e => ({ label: e.label, value: e.count }))} />
            </>
          )}
        </Section>
      </div>

      {/* ── Comportamiento ── */}
      <Section
        title="¿Cuánto se quedan y cuánto miran?"
        help={`Calculado solo sobre las visitas que llegaron a registrar su salida (${fmtPct(s.coverage)} del total). Las que no la registran quedarían en 0 y ensuciarían el promedio.`}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-4 h-4 text-gray-500" />
              <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">Tiempo típico</p>
            </div>
            <p className="text-2xl font-black text-gray-900 leading-none">{formatDuration(s.medianDuration)}</p>
            <p className="mt-1 text-[11px] font-semibold text-gray-500">
              La mitad se queda más que esto. Promedio: {formatDuration(s.avgDuration)}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <ArrowRight className="w-4 h-4 text-gray-500" />
              <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">Se van enseguida</p>
            </div>
            <p className="text-2xl font-black text-gray-900 leading-none">{fmtPct(s.bounceRate)}</p>
            <p className="mt-1 text-[11px] font-semibold text-gray-500">Una sola página y menos de 5 segundos</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Eye className="w-4 h-4 text-gray-500" />
              <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">Cuánto bajan</p>
            </div>
            <p className="text-2xl font-black text-gray-900 leading-none">{Math.round(s.avgScroll)}%</p>
            <p className="mt-1 text-[11px] font-semibold text-gray-500">De la página, en promedio</p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-4 h-4 text-gray-500" />
              <p className="text-[11px] font-black uppercase tracking-wide text-gray-500">Volvieron</p>
            </div>
            <p className="text-2xl font-black text-gray-900 leading-none">{fmtInt(s.recurring)}</p>
            <p className="mt-1 text-[11px] font-semibold text-gray-500">
              Personas que entraron más de una vez en {rangeLabel}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold text-gray-500">
          Páginas por visita: <span className="font-black text-gray-900">{s.pagesPerSession.toFixed(1)}</span>
        </p>
      </Section>

      {/* ── Cuándo entran ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Section title="Qué días entra más gente" help="Sumando todos los días del período.">
          <BarList rows={s.byDay.map(d => ({ label: d.day, value: d.sessions }))} />
        </Section>
        <Section title="A qué hora entra más gente" help="Útil para elegir cuándo publicar o lanzar una promo.">
          <div className="flex items-end gap-0.5 h-32">
            {s.byHour.map(h => {
              const max = Math.max(1, ...s.byHour.map(x => x.sessions));
              return (
                <div key={h.hour} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div className="w-full rounded-t bg-gray-900 group-hover:bg-gray-700 transition-colors"
                       style={{ height: `${(h.sessions / max) * 100}%` }} />
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 whitespace-nowrap rounded bg-gray-900 text-white text-[10px] font-bold px-2 py-1">
                    {h.hour}hs: {h.sessions}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-[10px] font-bold text-gray-400">
            <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
          </div>
        </Section>
      </div>
    </div>
  );
}
