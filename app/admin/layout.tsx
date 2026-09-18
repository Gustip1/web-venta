import type { Metadata } from 'next';
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getServerProfile } from '@/lib/supabase/server';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata: Metadata = {
  title: 'Panel de administración'
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user, profile } = await getServerProfile();
  if (!user || profile?.role !== 'admin') redirect('/');
  
  return (
    <div className="flex flex-col md:flex-row h-screen bg-white text-black">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-white text-black">
          {children}
        </main>
      </div>
    </div>
  );
}


