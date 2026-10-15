import { getModelUrl } from '@/lib/settings';

// Сколько ждём ответа модели. Функция на Vercel живёт не дольше maxDuration (60 с, см. app/api/chat/route.js),
// поэтому ждём чуть меньше, чтобы успеть вернуть понятную ошибку, а не обрыв от Vercel.
export const MODEL_TIMEOUT_MS = 55000;

function extractText(data) {
  if (data == null) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) return data.map(extractText).filter(Boolean).join('\n');
  if (typeof data !== 'object') return String(data);

  // Формат, совместимый с OpenAI
  if (Array.isArray(data.choices) && data.choices.length) {
    const c = data.choices[0];
    const t = c?.message?.content ?? c?.text ?? c?.delta?.content;
    if (t) return typeof t === 'string' ? t : extractText(t);
  }
  // Формат, похожий на Anthropic
  if (Array.isArray(data.content)) {
    const t = data.content.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('');
    if (t) return t;
  }
  for (const key of ['response', 'reply', 'answer', 'text', 'output', 'result', 'message', 'content', 'completion', 'generated_text']) {
    if (data[key] != null) {
      const t = extractText(data[key]);
      if (t) return t;
    }
  }
  if (data.data != null) return extractText(data.data);
  return '';
}

// message — короткий текст для пользователя, detail — техническая причина (её видит только администратор)
export class ModelError extends Error {
  constructor(message, status = 502, detail = '') {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

function clip(value, max = 300) {
  const s = String(value || '').replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

// Подсказка по коду ответа. Рассчитана на типичную схему: FastAPI в Colab + туннель trycloudflare.
function httpHint(status, raw) {
  const body = String(raw || '');
  if (status === 530 || /error code:?\s*1033|Cloudflare Tunnel error|Argo Tunnel/i.test(body)) {
    return 'Туннель Cloudflare не работает: ячейка в Colab остановлена или среда перезапущена. Запустите ячейку и сохраните новый адрес.';
  }
  if (status === 502 || status === 504) {
    return 'Туннель отвечает, но сервер за ним (порт 8000) нет: uvicorn в Colab остановлен или упал.';
  }
  if (status === 524) return 'Сервер модели не уложился в 100 секунд (лимит Cloudflare).';
  if (status === 404 || status === 405) {
    return 'По этому адресу нет POST-обработчика. Для @app.post("/") нужен адрес без пути, только https://…trycloudflare.com';
  }
  if (status === 422) return 'Сервер модели не понял тело запроса. Сайт отправляет JSON {"model", "messages", "stream"}.';
  if (status === 401 || status === 403) return 'Сервер модели отказал в доступе. Проверьте MODEL_API_KEY.';
  if (status >= 500) return 'Ошибка в коде сервера модели. Traceback смотрите в выводе ячейки Colab.';
  return '';
}

const NETWORK_HINTS = {
  ENOTFOUND: 'Такого адреса нет (DNS). Ссылка trycloudflare перестаёт работать, когда закрыт туннель: запустите ячейку в Colab и сохраните новый адрес.',
  EAI_AGAIN: 'Не удалось найти адрес (временная ошибка DNS).',
  ECONNREFUSED: 'Соединение отклонено: по этому адресу никто не принимает запросы.',
  ECONNRESET: 'Соединение оборвалось во время запроса.',
  UND_ERR_SOCKET: 'Соединение оборвалось во время запроса.',
  UND_ERR_CONNECT_TIMEOUT: 'Не удалось подключиться: сервер не отвечает.',
};

function networkDetail(e) {
  const cause = e?.cause;
  const code = cause?.code || e?.code || '';
  const hint = NETWORK_HINTS[code] || (/CERT|SSL|TLS/i.test(code) ? 'Проблема с HTTPS-сертификатом сервера модели.' : '');
  const raw = clip([code, cause?.message || e?.message].filter(Boolean).join(': '), 200);
  if (hint) return raw ? `${hint} (${raw})` : hint;
  return raw || 'Неизвестная сетевая ошибка.';
}

// Многие шаблоны чата (Mistral, Gemma, Llama 2) падают, если реплики не чередуются user → assistant → user
// или разговор начинается не с user. Два вопроса подряд остаются в истории после неудачного запроса,
// а окно из последних сообщений может начаться с ответа модели. Поэтому соседние реплики одной роли
// склеиваем, а ответы модели в начале окна отбрасываем.
export function normalizeMessages(messages) {
  const out = [];
  for (const m of messages) {
    const content = String(m.content ?? '');
    if (!content.trim()) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + content;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

/**
 * Один POST-запрос на адрес моделей. Возвращает текст ответа или бросает ModelError.
 * Тело запроса: { model, messages: [{ role, content }], stream: false }
 */
export async function callModel(url, modelId, messages, timeoutMs = MODEL_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/plain' };
    if (process.env.MODEL_API_KEY) headers.Authorization = `Bearer ${process.env.MODEL_API_KEY}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: modelId, messages, stream: false }),
      signal: controller.signal,
      cache: 'no-store',
    });

    const raw = await res.text();
    if (!res.ok) {
      console.error(`[model:${modelId}] HTTP ${res.status}`, raw.slice(0, 500));
      const detail = [`Сервер модели ответил HTTP ${res.status}.`, httpHint(res.status, raw), raw && `Ответ: ${clip(raw)}`];
      throw new ModelError('Модель сейчас не отвечает. Попробуйте ещё раз чуть позже.', 502, detail.filter(Boolean).join(' '));
    }

    let text = '';
    try {
      text = extractText(JSON.parse(raw));
    } catch {
      text = raw;
    }
    text = (text || '').trim();
    if (!text) {
      console.error(`[model:${modelId}] пустой ответ`, raw.slice(0, 500));
      throw new ModelError(
        'Модель вернула пустой ответ. Попробуйте переформулировать вопрос.',
        502,
        `Сервер ответил HTTP ${res.status}, но текста ответа нет. Ответ: ${clip(raw) || '(пусто)'}`
      );
    }
    return text;
  } catch (e) {
    if (e instanceof ModelError) throw e;
    if (e?.name === 'AbortError') {
      throw new ModelError(
        'Модель отвечает слишком долго. Попробуйте ещё раз.',
        504,
        `Сервер модели не ответил за ${Math.round(timeoutMs / 1000)} с. Генерация идёт дольше лимита: уменьшите max_new_tokens или добавьте max_time в model.generate().`
      );
    }
    console.error(`[model:${modelId}]`, e);
    throw new ModelError('Не удалось связаться с моделью.', 502, networkDetail(e));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Отправляет историю разговора на единый адрес моделей (задаётся в админке)
 * и возвращает текст ответа. Какую модель вызвать, сообщается полем model.
 */
export async function askModel(modelId, messages, { timeoutMs = MODEL_TIMEOUT_MS } = {}) {
  let url = '';
  try {
    url = await getModelUrl();
  } catch (e) {
    console.error('[model] не удалось прочитать адрес моделей', e);
    throw new ModelError('Модели временно недоступны. Попробуйте позже.', 503, `Не удалось прочитать адрес моделей из базы: ${clip(e?.message, 200)}`);
  }
  if (!url) {
    console.error('[model] адрес моделей не задан в админке');
    throw new ModelError(
      'Модели временно недоступны. Попробуйте позже.',
      503,
      'Адрес моделей не сохранён. Откройте админку, вставьте адрес в блок «Адрес моделей» и нажмите «Сохранить».'
    );
  }
  return callModel(url, modelId, messages, timeoutMs);
}
