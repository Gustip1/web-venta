"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  role: string;
  display_name: string | null;
  created_at: string;
}

export default function AccountPage() {
  const router = useRouter();
  const supabase = createBrowserClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { router.push('/login'); return; }
      setUser(authUser);

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    })();
  }, [router, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <p className="text-sm text-gray-400 font-bold">Cargando...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mi cuenta</h1>
        <button
          onClick={handleLogout}
          className="rounded-lg bg-gray-100 border border-gray-200 px-3 py-1.5 text-sm text-gray-900 font-bold hover:bg-gray-200 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Información personal</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Nombre:</span>
              <span className="text-gray-900 font-bold">{profile?.display_name || 'No especificado'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email:</span>
              <span className="text-gray-900 font-bold">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Registrado:</span>
              <span className="text-gray-900 font-bold">
                {new Date(profile?.created_at || user.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Acciones rápidas</h2>
          <div className="mt-3 space-y-2">
            <Link
              href="/orders"
              className="block rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 font-bold hover:bg-gray-100 transition-colors"
            >
              Ver mis pedidos
            </Link>
            <Link
              href="/track"
              className="block rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-900 font-bold hover:bg-gray-100 transition-colors"
            >
              Seguir pedido
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
