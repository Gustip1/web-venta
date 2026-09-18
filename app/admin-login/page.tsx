"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited
          setBlockedUntil(data.blockedUntil || 120);
          setError(data.message || 'Demasiados intentos. Intenta más tarde.');
        } else {
          setError(data.error || 'Error al iniciar sesión');
        }
        setLoading(false);
        return;
      }

      // Login exitoso
      router.replace('/admin');
      router.refresh();
    } catch (err) {
      setError('Error de conexión. Intenta nuevamente.');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-xl font-semibold">Admin Login</h1>
      
      {blockedUntil && (
        <div className="mt-4 rounded border border-red-700/40 bg-red-900/20 p-4 text-sm text-red-400">
          <div className="flex items-center gap-2 font-semibold">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>Cuenta temporalmente bloqueada</span>
          </div>
          <p className="mt-2">
            Has excedido el número máximo de intentos de inicio de sesión. 
            Por seguridad, intenta nuevamente en <strong>{blockedUntil}</strong> segundos.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-white">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!!blockedUntil}
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!!blockedUntil}
            className="mt-1 w-full rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-400 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        {error && !blockedUntil && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading || !!blockedUntil}
          className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
      
      <div className="mt-4 rounded border border-neutral-800 bg-neutral-900/50 p-3 text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span className="font-semibold">Protección de seguridad activa</span>
        </div>
        <p className="mt-1">
          Este portal está protegido contra ataques de fuerza bruta. 
          Después de 3 intentos fallidos, se bloqueará el acceso durante 2 minutos.
        </p>
      </div>
    </div>
  );
}

