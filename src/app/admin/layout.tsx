import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user || user.app_metadata?.role !== 'admin') redirect('/admin-login');
  return children;
}
