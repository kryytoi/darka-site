// Общие настройки сайта, которые меняет администратор (хранятся в таблице app_settings).
import { db } from '@/lib/db';

export const MODEL_URL_KEY = 'model_url';

export async function getModelUrl() {
  const sql = await db();
  const rows = await sql`SELECT value FROM app_settings WHERE key = ${MODEL_URL_KEY} LIMIT 1`;
  return rows[0]?.value || '';
}

export async function setModelUrl(url) {
  const sql = await db();
  await sql`
    INSERT INTO app_settings (key, value, updated_at) VALUES (${MODEL_URL_KEY}, ${url}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`;
}

// Пустой адрес допустим (модели отключены). Иначе нужен полный http или https адрес.
export function checkModelUrl(raw) {
  // При копировании из вывода Colab в адрес иногда попадают невидимые символы
  const value = String(raw || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!value) return { ok: true, value: '' };
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('protocol');
    return { ok: true, value };
  } catch {
    return { ok: false, error: 'Укажите полный адрес, например https://model.example.com/api/chat' };
  }
}
