import { requireUser, json } from '@/lib/auth';
import { getModelUrl, checkModelUrl } from '@/lib/settings';
import { callModel, ModelError } from '@/lib/backends';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Проверка связи с сервером моделей: сайт отправляет короткий вопрос, как настоящий запрос из чата,
// и показывает администратору, что именно ответил сервер. В историю ничего не сохраняется.
export async function POST(req) {
  const { error } = await requireUser({ admin: true });
  if (error) return error;

  let body = {};
  try {
    body = await req.json();
  } catch {
    /* без тела проверяем сохранённый адрес */
  }

  let url = '';
  if (String(body.modelUrl || '').trim()) {
    const check = checkModelUrl(body.modelUrl);
    if (!check.ok) return json({ error: check.error }, 400);
    url = check.value;
  } else {
    try {
      url = await getModelUrl();
    } catch (e) {
      console.error(e);
      return json({ error: 'Не удалось прочитать адрес из базы' }, 500);
    }
  }
  if (!url) return json({ error: 'Сначала укажите адрес моделей' }, 400);

  const started = Date.now();
  try {
    const reply = await callModel(url, 'shadow', [{ role: 'user', content: 'Проверка связи. Ответь одним коротким предложением.' }]);
    return json({ ok: true, ms: Date.now() - started, reply: reply.slice(0, 400) });
  } catch (e) {
    const err = e instanceof ModelError ? e : new ModelError('Не удалось связаться с моделью.', 502, String(e?.message || e));
    return json({ ok: false, ms: Date.now() - started, error: err.message, detail: err.detail });
  }
}
