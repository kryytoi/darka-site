import { notFound, redirect } from 'next/navigation';
import AdminApp from '@/components/AdminApp';
import { getSessionUser, publicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Админка — Darka', robots: { index: false, follow: false } };

export default async function AdminPage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch (e) {
    console.error(e);
  }
  if (!user) redirect('/login');
  if (user.role !== 'admin' || user.banned) notFound();
  return <AdminApp admin={publicUser(user)} />;
}
