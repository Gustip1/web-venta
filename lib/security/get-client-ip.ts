/**
 * Extrae la IP del cliente de manera segura
 * Considera proxies y load balancers
 */

import { NextRequest } from 'next/server';

export function getClientIp(req: NextRequest): string {
  // Intentar obtener IP real detrás de proxies/CDN
  const forwardedFor = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const cfConnectingIp = req.headers.get('cf-connecting-ip'); // Cloudflare
  
  // Prioridad: Cloudflare > X-Real-IP > X-Forwarded-For > IP directa
  if (cfConnectingIp) {
    return cfConnectingIp;
  }
  
  if (realIp) {
    return realIp;
  }
  
  if (forwardedFor) {
    // X-Forwarded-For puede contener múltiples IPs: "client, proxy1, proxy2"
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    return ips[0]; // Primera IP es la del cliente
  }
  
  // Fallback a IP directa (puede ser proxy si hay uno)
  return req.ip || 'unknown';
}

