import { db } from '@/lib/db';
import { requireUser, json, effectivePlan } from '@/lib/auth';
import { getModel, canUseModel } from '@/lib/models';
import { askModel, ModelError } from '@/lib/backends';
import { MAX_MESSAGE_CHARS, splitMessage, compactAttachments } from '@/lib/attachments';
import { REASONING_INSTRUCTION, parseReasoningAnswer, buildReasoningContent, answerOnly } from '@/lib/reasoning';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
  if (text.length > MAX_MESSAGE_CHARS) {
    return json({ error: 'Сообщение слишком большое. Уменьшите файлы или их количество.' }, 400);
  }

  const reasoning = body.reasoning === true;
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
      // Название берём из текста вопроса; если его нет, из имени первого файла
      const { files, text: plain } = splitMessage(text);
      const base = plain || (files[0] ? `Файл: ${files[0].name}` : text);
      title = base.replace(/\s+/g, ' ').slice(0, 48) + (base.length > 48 ? '…' : '');
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
    // Файлы из последнего сообщения передаём полностью, а из прошлых — только имена.
    // Рассуждения прошлых ответов модели не передаём: в истории остаётся только ответ.
    const messages = hist.map((m, i) => ({
      role: m.role,
      content: m.role === 'assistant' ? answerOnly(m.content) : i === hist.length - 1 ? m.content : compactAttachments(m.content),
    }));

    // Системная инструкция: главный промпт пользователя и, если включено, режим рассуждения
    const [settings] = await sql`SELECT system_prompt FROM user_settings WHERE user_id = ${user.id} LIMIT 1`;
    const system = [settings?.system_prompt, reasoning ? REASONING_INSTRUCTION : ''].filter(Boolean).join('\n\n');
    const modelMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;

    let answer;
    const started = Date.now();
    try {
      answer = await askModel(model.id, modelMessages);
    } catch (e) {
      await sql`UPDATE chats SET updated_at = NOW() WHERE id = ${chatId}`;
      const status = e instanceof ModelError ? e.status : 502;
      return json({ error: e.message, chatId, title }, status);
    }

    // В режиме рассуждения отделяем ход мыслей от ответа и сохраняем их вместе
    const seconds = Math.max(1, Math.round((Date.now() - started) / 1000));
    const parsed = reasoning ? parseReasoningAnswer(answer) : { thinking: '', answer };
    const stored = buildReasoningContent(parsed.thinking, seconds, parsed.answer);

    const saved = await sql`
      INSERT INTO messages (chat_id, role, content, model) VALUES (${chatId}, 'assistant', ${stored}, ${model.id})
      RETURNING id`;
    await sql`UPDATE chats SET updated_at = NOW(), model = ${model.id} WHERE id = ${chatId}`;

    return json({
      chatId,
      title,
      message: { id: saved[0].id, role: 'assistant', content: stored, model: model.id },
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Что-то пошло не так. Попробуйте ещё раз.' }, 500);
  }
}
