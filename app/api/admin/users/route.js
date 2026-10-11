import { db } from '@/lib/db';
import { requireUser, json, publicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { error } = await requireUser({ admin: true });
  if (error) return error;

  const q = new URL(req.url).searchParams.get('q')?.trim().toLowerCase() || '';
  try {
    const sql = await db();
    const like = `%${q.replace(/[%_\\]/g, '')}%`;
    const rows = await sql`
      SELECT u.*, (SELECT COUNT(*) FROM chats c WHERE c.user_id = u.id)::int AS chat_count
      FROM users u
      WHERE u.username_lower LIKE ${like}
      ORDER BY u.created_at DESC
      LIMIT 200`;
    const stats = await sql`
      SELECT
        (SELECT COUNT(*) FROM users)::int AS users,
        (SELECT COUNT(*) FROM users WHERE banned)::int AS banned,
        (SELECT COUNT(*) FROM users WHERE plan = 'pro' AND (plan_expires IS NULL OR plan_expires > NOW()))::int AS pro,
        (SELECT COUNT(*) FROM messages WHERE role = 'user' AND created_at > NOW() - INTERVAL '24 hours')::int AS messages_today`;
    return json({
      users: rows.map((u) => ({
        ...publicUser(u),
        createdAt: u.created_at,
        chatCount: u.chat_count,
      })),
      stats: stats[0],
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось загрузить пользователей' }, 500);
  }
}
