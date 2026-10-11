import { redirect } from 'next/navigation';
import Link from 'next/link';
import ChatApp from '@/components/ChatApp';
import { getSessionUser, publicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Чат — Darka' };

export default async function ChatPage() {
  let user = null;
  try {
    user = await getSessionUser();
  } catch (e) {
    console.error(e);
  }
  // Без входа в аккаунт чат недоступен
  if (!user) redirect('/login');

  if (user.banned) {
    return (
      <div className="ban-screen">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" />
          <h1>Аккаунт заблокирован</h1>
          <p>{user.ban_reason ? `Причина: ${user.ban_reason}` : 'Доступ к Darka для этого аккаунта закрыт.'}</p>
          <Link href="/" className="btn btn-ghost">
            На главную
          </Link>
        </div>
      </div>
    );
  }

  return <ChatApp user={publicUser(user)} />;
}
