import { db } from '@/lib/db';
import { requireUser, json } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const sql = await db();
    const rows = await sql`
      SELECT id, title, model, updated_at FROM chats
      WHERE user_id = ${user.id}
      ORDER BY updated_at DESC
      LIMIT 100`;
    return json({
      chats: rows.map((c) => ({ id: c.id, title: c.title, model: c.model, updatedAt: c.updated_at })),
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось загрузить разговоры' }, 500);
  }
}
