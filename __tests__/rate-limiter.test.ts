import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests para el Rate Limiter
 * Verifica protección contra fuerza bruta
 */

class RateLimiter {
  private attempts: Map<string, { attempts: number; blockedUntil: number | null; lastAttempt: number }> = new Map();
  private readonly maxAttempts: number;
  private readonly blockDurationMs: number;

  constructor(maxAttempts: number = 3, blockDurationMinutes: number = 2) {
    this.maxAttempts = maxAttempts;
    this.blockDurationMs = blockDurationMinutes * 60 * 1000;
  }

  isBlocked(ip: string): boolean {
    const entry = this.attempts.get(ip);
    if (!entry) return false;

    if (entry.blockedUntil && Date.now() < entry.blockedUntil) {
      return true;
    }

    if (entry.blockedUntil && Date.now() >= entry.blockedUntil) {
      this.attempts.delete(ip);
      return false;
    }

    return false;
  }

  recordFailedAttempt(ip: string): { blocked: boolean; remainingTime?: number } {
    const now = Date.now();
    const entry = this.attempts.get(ip) || { attempts: 0, blockedUntil: null, lastAttempt: now };

    entry.attempts += 1;
    entry.lastAttempt = now;

    if (entry.attempts >= this.maxAttempts) {
      entry.blockedUntil = now + this.blockDurationMs;
      this.attempts.set(ip, entry);
      
      return {
        blocked: true,
        remainingTime: this.blockDurationMs / 1000
      };
    }

    this.attempts.set(ip, entry);
    return { blocked: false };
  }

  reset(ip: string): void {
    this.attempts.delete(ip);
  }

  getBlockedTime(ip: string): number | null {
    const entry = this.attempts.get(ip);
    if (!entry || !entry.blockedUntil) return null;

    const remaining = entry.blockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : null;
  }
}

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  const testIp = '192.168.1.1';

  beforeEach(() => {
    limiter = new RateLimiter(3, 2); // 3 intentos, 2 minutos
  });

  it('should allow first attempt', () => {
    const result = limiter.recordFailedAttempt(testIp);
    expect(result.blocked).toBe(false);
    expect(limiter.isBlocked(testIp)).toBe(false);
  });

  it('should allow second attempt', () => {
    limiter.recordFailedAttempt(testIp);
    const result = limiter.recordFailedAttempt(testIp);
    expect(result.blocked).toBe(false);
    expect(limiter.isBlocked(testIp)).toBe(false);
  });

  it('should block after 3 failed attempts', () => {
    limiter.recordFailedAttempt(testIp);
    limiter.recordFailedAttempt(testIp);
    const result = limiter.recordFailedAttempt(testIp);
    
    expect(result.blocked).toBe(true);
    expect(result.remainingTime).toBe(120); // 2 minutos en segundos
    expect(limiter.isBlocked(testIp)).toBe(true);
  });

  it('should return remaining blocked time', () => {
    limiter.recordFailedAttempt(testIp);
    limiter.recordFailedAttempt(testIp);
    limiter.recordFailedAttempt(testIp);
    
    const remainingTime = limiter.getBlockedTime(testIp);
    expect(remainingTime).toBeGreaterThan(0);
    expect(remainingTime).toBeLessThanOrEqual(120);
  });

  it('should reset attempts after successful login', () => {
    limiter.recordFailedAttempt(testIp);
    limiter.recordFailedAttempt(testIp);
    limiter.reset(testIp);
    
    expect(limiter.isBlocked(testIp)).toBe(false);
    const result = limiter.recordFailedAttempt(testIp);
    expect(result.blocked).toBe(false);
  });

  it('should handle different IPs independently', () => {
    const ip1 = '192.168.1.1';
    const ip2 = '192.168.1.2';
    
    limiter.recordFailedAttempt(ip1);
    limiter.recordFailedAttempt(ip1);
    limiter.recordFailedAttempt(ip1);
    
    expect(limiter.isBlocked(ip1)).toBe(true);
    expect(limiter.isBlocked(ip2)).toBe(false);
  });

  it('should unblock after timeout', async () => {
    // Usar un timeout corto para testing
    const quickLimiter = new RateLimiter(3, 0.001); // 0.001 minutos = ~60ms
    
    quickLimiter.recordFailedAttempt(testIp);
    quickLimiter.recordFailedAttempt(testIp);
    quickLimiter.recordFailedAttempt(testIp);
    
    expect(quickLimiter.isBlocked(testIp)).toBe(true);
    
    // Esperar a que expire el bloqueo
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(quickLimiter.isBlocked(testIp)).toBe(false);
  });

  it('should not block with 2 attempts', () => {
    limiter.recordFailedAttempt(testIp);
    const result = limiter.recordFailedAttempt(testIp);
    
    expect(result.blocked).toBe(false);
    expect(limiter.isBlocked(testIp)).toBe(false);
  });

  it('should handle edge case with zero attempts', () => {
    expect(limiter.isBlocked(testIp)).toBe(false);
    expect(limiter.getBlockedTime(testIp)).toBeNull();
  });
});

describe('RateLimiter - Multiple IPs', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 2);
  });

  it('should track multiple IPs independently', () => {
    const ips = ['192.168.1.1', '192.168.1.2', '192.168.1.3'];
    
    ips.forEach(ip => {
      limiter.recordFailedAttempt(ip);
      limiter.recordFailedAttempt(ip);
    });
    
    // Ninguna IP debería estar bloqueada aún (solo 2 intentos cada una)
    ips.forEach(ip => {
      expect(limiter.isBlocked(ip)).toBe(false);
    });
    
    // Bloquear solo la primera IP
    limiter.recordFailedAttempt(ips[0]);
    
    expect(limiter.isBlocked(ips[0])).toBe(true);
    expect(limiter.isBlocked(ips[1])).toBe(false);
    expect(limiter.isBlocked(ips[2])).toBe(false);
  });
});

describe('RateLimiter - Security', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 2);
  });

  it('should prevent brute force attack simulation', () => {
    const attackerIp = '10.0.0.1';
    const attempts = [];
    
    // Simular 10 intentos de login
    for (let i = 0; i < 10; i++) {
      const result = limiter.recordFailedAttempt(attackerIp);
      attempts.push(result);
    }
    
    // Primeros 2 intentos deberían pasar
    expect(attempts[0].blocked).toBe(false);
    expect(attempts[1].blocked).toBe(false);
    
    // Tercer intento debería bloquear
    expect(attempts[2].blocked).toBe(true);
    
    // Intentos siguientes deberían estar bloqueados
    expect(limiter.isBlocked(attackerIp)).toBe(true);
  });

  it('should calculate correct remaining time', () => {
    const ip = '192.168.1.1';
    
    limiter.recordFailedAttempt(ip);
    limiter.recordFailedAttempt(ip);
    limiter.recordFailedAttempt(ip);
    
    const remainingTime = limiter.getBlockedTime(ip);
    
    expect(remainingTime).toBeLessThanOrEqual(120);
    expect(remainingTime).toBeGreaterThan(0);
  });
});

