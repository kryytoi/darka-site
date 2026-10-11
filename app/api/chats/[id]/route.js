import { db } from '@/lib/db';
import { requireUser, json } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: 'Не найдено' }, 404);
  try {
    const sql = await db();
    const chats = await sql`SELECT id, title, model FROM chats WHERE id = ${id} AND user_id = ${user.id} LIMIT 1`;
    if (!chats.length) return json({ error: 'Не найдено' }, 404);
    const messages = await sql`
      SELECT id, role, content, model, created_at FROM messages
      WHERE chat_id = ${id} ORDER BY id ASC`;
    return json({
      chat: chats[0],
      messages: messages.map((m) => ({ id: m.id, role: m.role, content: m.content, model: m.model })),
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось загрузить разговор' }, 500);
  }
}

export async function DELETE(_req, { params }) {
  const { user, error } = await requireUser();
  if (error) return error;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: 'Не найдено' }, 404);
  try {
    const sql = await db();
    await sql`DELETE FROM chats WHERE id = ${id} AND user_id = ${user.id}`;
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось удалить разговор' }, 500);
  }
}
