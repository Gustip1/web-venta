"use client";
import { useEffect, useRef, useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { setAnalyticsExcluded } from '@/lib/analytics/track';

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

function getVisitorId(): string {
  if (typeof window === 'undefined') return '';
  let visitorId = localStorage.getItem('store_visitor_id');
  if (!visitorId) {
    visitorId = `v-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('store_visitor_id', visitorId);
  }
  return visitorId;
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('SamsungBrowser')) return 'Samsung Browser';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Trident')) return 'IE';
  if (ua.includes('Edge') || ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  return 'Unknown';
}

function getOS(): string {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'MacOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

function getReferrerDomain(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (typeof window !== 'undefined' && url.hostname === window.location.hostname) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

function getUTMParams(): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
}

interface VisitData {
  session_id: string;
  visitor_id: string;
  page_path: string;
  page_title: string;
  referrer: string | null;
  referrer_domain: string | null;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  user_agent: string;
  device_type: string;
  browser: string;
  os: string;
}

export function useAnalytics() {
  const pathname = usePathname();
  const supabase = createBrowserClient();

  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const pagesViewedRef = useRef<number>(0);
  const maxScrollRef = useRef<number>(0);
  const engagementFiredRef = useRef<Set<string>>(new Set());

  // null = todavía no sabemos si es admin; hasta resolverlo no se mide nada,
  // así una visita del admin nunca llega a la base "por las dudas".
  const [tracks, setTracks] = useState<boolean | null>(null);
  const tracksRef = useRef<boolean | null>(null);
  tracksRef.current = tracks;

  // ── Excluir la sesión de administración ──
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          if (!cancelled) { setAnalyticsExcluded(false); setTracks(true); }
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const isAdmin = profile?.role === 'admin';
        if (!cancelled) { setAnalyticsExcluded(isAdmin); setTracks(!isAdmin); }
      } catch {
        // Si falla la consulta medimos normal: preferible contar de más que perder visitas reales.
        if (!cancelled) setTracks(true);
      }
    })();

    return () => { cancelled = true; };
  }, [supabase]);

  // ── Inicializar sesión ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let sessionId = sessionStorage.getItem('store_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('store_session_id', sessionId);
    }
    sessionIdRef.current = sessionId;
    startTimeRef.current = Date.now();
  }, []);

  // ── Trackear page view ──
  const trackPageView = useCallback(async () => {
    if (typeof window === 'undefined' || !sessionIdRef.current) return;
    if (pathname.startsWith('/admin')) return;
    if (!tracks) return;

    const visitData: VisitData = {
      session_id: sessionIdRef.current,
      visitor_id: getVisitorId(),
      page_path: pathname,
      page_title: document.title,
      referrer: document.referrer || null,
      referrer_domain: getReferrerDomain(document.referrer),
      ...getUTMParams(),
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
      browser: getBrowser(),
      os: getOS(),
    };

    pagesViewedRef.current += 1;

    try {
      await supabase.from('analytics_visits').insert(visitData);
    } catch (error) {
      console.error('Error tracking visit:', error);
    }
  }, [pathname, supabase, tracks]);

  useEffect(() => {
    const timer = setTimeout(() => { trackPageView(); }, 100);
    return () => clearTimeout(timer);
  }, [pathname, trackPageView]);

  // ── Scroll depth tracking ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname.startsWith('/admin')) return;
    if (!tracks) return;

    maxScrollRef.current = 0;

    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) return;
      const pct = Math.min(Math.round((scrollTop / docHeight) * 100), 100);
      if (pct > maxScrollRef.current) maxScrollRef.current = pct;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname, tracks]);

  // ── Engagement time milestones (5s, 15s, 30s, 60s) ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname.startsWith('/admin')) return;
    if (!tracks) return;

    engagementFiredRef.current = new Set();
    const milestones = [5, 15, 30, 60];

    const interval = setInterval(() => {
      if (!sessionIdRef.current) return;
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

      for (const ms of milestones) {
        const key = `engaged_${ms}s`;
        if (elapsed >= ms && !engagementFiredRef.current.has(key)) {
          engagementFiredRef.current.add(key);
          supabase.from('analytics_events').insert({
            session_id: sessionIdRef.current,
            event_name: key,
            event_category: 'engagement',
            event_data: { seconds: ms, page: pathname },
            page_path: pathname,
          }).then(() => {});
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [pathname, supabase, tracks]);

  // ── Exit handler (duration + scroll depth + bounce) ──
  useEffect(() => {
    const handleExit = () => {
      if (!sessionIdRef.current) return;
      if (!tracksRef.current) return;

      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

      navigator.sendBeacon(
        '/api/analytics/exit',
        JSON.stringify({
          session_id: sessionIdRef.current,
          duration_seconds: duration,
          pages_viewed: pagesViewedRef.current,
          scroll_depth: maxScrollRef.current,
        })
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') handleExit();
    };

    window.addEventListener('beforeunload', handleExit);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleExit);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // ── Track custom event ──
  const trackEvent = useCallback(async (
    eventName: string,
    eventCategory?: string,
    eventData?: Record<string, any>
  ) => {
    if (!sessionIdRef.current || !tracks) return;
    try {
      await supabase.from('analytics_events').insert({
        session_id: sessionIdRef.current,
        event_name: eventName,
        event_category: eventCategory,
        event_data: eventData || {},
        page_path: pathname,
      });
    } catch (error) {
      console.error('Error tracking event:', error);
    }
  }, [pathname, supabase, tracks]);

  return { trackEvent };
}
