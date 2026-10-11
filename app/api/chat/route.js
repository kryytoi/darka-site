import { db } from '@/lib/db';
import { requireUser, json, effectivePlan } from '@/lib/auth';
import { getModel, canUseModel } from '@/lib/models';
import { askModel, ModelError } from '@/lib/backends';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_LEN = 8000;
const HISTORY = 20;

export async function POST(req) {
  // Без входа в аккаунт спрашивать Darka нельзя
  const { user, error } = await requireUser();
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Некорректный запрос' }, 400);
  }

  const text = String(body.message || '').trim();
  if (!text) return json({ error: 'Введите сообщение' }, 400);
  if (text.length > MAX_LEN) return json({ error: `Сообщение длиннее ${MAX_LEN} символов` }, 400);

  const model = getModel(String(body.model || ''));
  if (!model) return json({ error: 'Неизвестная модель' }, 400);
  if (!canUseModel(model, effectivePlan(user), user.role)) {
    return json({ error: `${model.name} доступна по подписке Pro`, needPro: true }, 403);
  }

  try {
    const sql = await db();

    let chatId = Number(body.chatId) || null;
    let title = null;
    if (chatId) {
      const own = await sql`SELECT id FROM chats WHERE id = ${chatId} AND user_id = ${user.id} LIMIT 1`;
      if (!own.length) return json({ error: 'Разговор не найден' }, 404);
    } else {
      title = text.replace(/\s+/g, ' ').slice(0, 48) + (text.length > 48 ? '…' : '');
      const created = await sql`
        INSERT INTO chats (user_id, title, model) VALUES (${user.id}, ${title}, ${model.id})
        RETURNING id`;
      chatId = created[0].id;
    }

    await sql`INSERT INTO messages (chat_id, role, content) VALUES (${chatId}, 'user', ${text})`;

    const hist = await sql`
      SELECT role, content FROM (
        SELECT id, role, content FROM messages WHERE chat_id = ${chatId} ORDER BY id DESC LIMIT ${HISTORY}
      ) t ORDER BY id ASC`;
    const messages = hist.map((m) => ({ role: m.role, content: m.content }));

    let answer;
    try {
      answer = await askModel(model.id, messages);
    } catch (e) {
      await sql`UPDATE chats SET updated_at = NOW() WHERE id = ${chatId}`;
      const status = e instanceof ModelError ? e.status : 502;
      return json({ error: e.message, chatId, title }, status);
    }

    const saved = await sql`
      INSERT INTO messages (chat_id, role, content, model) VALUES (${chatId}, 'assistant', ${answer}, ${model.id})
      RETURNING id`;
    await sql`UPDATE chats SET updated_at = NOW(), model = ${model.id} WHERE id = ${chatId}`;

    return json({
      chatId,
      title,
      message: { id: saved[0].id, role: 'assistant', content: answer, model: model.id },
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Что-то пошло не так. Попробуйте ещё раз.' }, 500);
  }
}
