"use client";

/**
 * Tracker liviano para eventos puntuales (clicks, CTAs, conversiones).
 * Usa sendBeacon para que el evento sobreviva aunque el usuario navegue
 * a otro sitio (links externos como Passline o WhatsApp).
 * Comparte session_id / visitor_id con useAnalytics.
 */

const SESSION_KEY = 'store_session_id';
const VISITOR_KEY = 'store_visitor_id';
const ADMIN_KEY = 'store_analytics_excluded';

/**
 * Marca (o desmarca) este navegador como sesión interna de administración.
 * useAnalytics lo resuelve contra el perfil en cada carga; acá sólo se guarda
 * para que trackEvent, que no es un hook, pueda consultarlo sin esperar.
 */
export function setAnalyticsExcluded(excluded: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (excluded) localStorage.setItem(ADMIN_KEY, '1');
    else localStorage.removeItem(ADMIN_KEY);
  } catch {
    // Si el navegador bloquea localStorage seguimos midiendo normal.
  }
}

/** true si las visitas de este navegador no deben contarse (admin). */
export function isAnalyticsExcluded(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(ADMIN_KEY) === '1';
  } catch {
    return false;
  }
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getVisitorId(): string {
  let visitorId = localStorage.getItem(VISITOR_KEY);
  if (!visitorId) {
    visitorId = `v-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(VISITOR_KEY, visitorId);
  }
  return visitorId;
}

export function trackEvent(
  eventName: string,
  eventCategory?: string,
  eventData?: Record<string, unknown>
): void {
  if (typeof window === 'undefined') return;
  if (isAnalyticsExcluded()) return;

  try {
    const payload = JSON.stringify({
      session_id: getSessionId(),
      event_name: eventName,
      event_category: eventCategory ?? null,
      event_data: { ...eventData, visitor_id: getVisitorId() },
      page_path: window.location.pathname,
    });

    const sent = navigator.sendBeacon?.(
      '/api/analytics/event',
      new Blob([payload], { type: 'application/json' })
    );

    if (!sent) {
      fetch('/api/analytics/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // El tracking nunca debe romper la UI
  }
}
