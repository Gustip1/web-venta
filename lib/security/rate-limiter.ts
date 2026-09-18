/**
 * Rate Limiter para protección contra fuerza bruta
 * Sin dependencias externas, sin impacto en rendimiento
 */

interface RateLimitEntry {
  attempts: number;
  blockedUntil: number | null;
  lastAttempt: number;
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private readonly maxAttempts: number;
  private readonly blockDurationMs: number;
  private readonly cleanupIntervalMs: number = 5 * 60 * 1000; // 5 minutos

  constructor(maxAttempts: number = 3, blockDurationMinutes: number = 2) {
    this.maxAttempts = maxAttempts;
    this.blockDurationMs = blockDurationMinutes * 60 * 1000;
    
    // Limpieza automática de entradas antiguas
    setInterval(() => this.cleanup(), this.cleanupIntervalMs);
  }

  /**
   * Verifica si una IP está bloqueada
   */
  isBlocked(ip: string): boolean {
    const entry = this.attempts.get(ip);
    if (!entry) return false;

    if (entry.blockedUntil && Date.now() < entry.blockedUntil) {
      return true;
    }

    // Si el bloqueo expiró, resetear
    if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
      this.attempts.delete(ip);
      return false;
    }

    return false;
  }

  /**
   * Registra un intento fallido
   * Retorna el tiempo restante de bloqueo si se alcanzó el límite
   */
  recordFailedAttempt(ip: string): { blocked: boolean; remainingTime?: number } {
    const now = Date.now();
    const entry = this.attempts.get(ip) || { attempts: 0, blockedUntil: null, lastAttempt: now };

    entry.attempts += 1;
    entry.lastAttempt = now;

    if (entry.attempts >= this.maxAttempts) {
      entry.blockedUntil = now + this.blockDurationMs;
      this.attempts.set(ip, entry);
      
      console.warn(`[SECURITY] IP bloqueada por intentos de fuerza bruta: ${ip}`);
      
      return {
        blocked: true,
        remainingTime: this.blockDurationMs / 1000 // segundos
      };
    }

    this.attempts.set(ip, entry);
    return { blocked: false };
  }

  /**
   * Resetea los intentos de una IP (login exitoso)
   */
  reset(ip: string): void {
    this.attempts.delete(ip);
  }

  /**
   * Obtiene el tiempo restante de bloqueo en segundos
   */
  getBlockedTime(ip: string): number | null {
    const entry = this.attempts.get(ip);
    if (!entry || !entry.blockedUntil) return null;

    const remaining = entry.blockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : null;
  }

  /**
   * Limpia entradas antiguas (más de 10 minutos)
   */
  private cleanup(): void {
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;

    for (const [ip, entry] of this.attempts.entries()) {
      // Eliminar si el último intento fue hace más de 10 minutos y no está bloqueado
      if (now - entry.lastAttempt > tenMinutes && (!entry.blockedUntil || now > entry.blockedUntil)) {
        this.attempts.delete(ip);
      }
    }
  }

  /**
   * Obtiene estadísticas de rate limiting
   */
  getStats(): { totalIPs: number; blockedIPs: number } {
    const now = Date.now();
    let blockedCount = 0;

    for (const entry of this.attempts.values()) {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedCount++;
      }
    }

    return {
      totalIPs: this.attempts.size,
      blockedIPs: blockedCount
    };
  }
}

// Instancia singleton para compartir entre requests
export const adminLoginLimiter = new RateLimiter(3, 2); // 3 intentos, 2 minutos de bloqueo
export const publicApiLimiter = new RateLimiter(5, 1); // 5 intentos, 1 minuto de bloqueo

