// Какая модель отправляется на какой URL (переменные окружения Vercel).
const ENV_BY_MODEL = {
  shadow: 'SHADOWURL',
  quiziw: 'QUIZIWURL',
  darka02: 'NOLDVA',
  darka01: 'NOLODIN',
};

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

export class ModelError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

/**
 * Отправляет историю разговора на URL модели и возвращает текст ответа.
 * Тело запроса: { model, messages: [{ role, content }], stream: false }
 */
export async function askModel(modelId, messages) {
  const envName = ENV_BY_MODEL[modelId];
  const url = envName && process.env[envName];
  if (!url) {
    throw new ModelError('Эта модель временно недоступна. Попробуйте позже.', 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
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
      throw new ModelError('Модель сейчас не отвечает. Попробуйте ещё раз чуть позже.');
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
      throw new ModelError('Модель вернула пустой ответ. Попробуйте переформулировать вопрос.');
    }
    return text;
  } catch (e) {
    if (e instanceof ModelError) throw e;
    if (e?.name === 'AbortError') throw new ModelError('Модель отвечает слишком долго. Попробуйте ещё раз.', 504);
    console.error(`[model:${modelId}]`, e);
    throw new ModelError('Не удалось связаться с моделью.');
  } finally {
    clearTimeout(timer);
  }
}
