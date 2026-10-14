import { db } from '@/lib/db';
import { requireUser, json } from '@/lib/auth';
import { sanitizeTheme, DEFAULT_THEME } from '@/lib/theme';

export const dynamic = 'force-dynamic';

export const MAX_PROMPT = 4000;

export async function GET() {
  const { user, error } = await requireUser();
  if (error) return error;
  try {
    const sql = await db();
    const rows = await sql`SELECT theme, system_prompt FROM user_settings WHERE user_id = ${user.id} LIMIT 1`;
    const row = rows[0];
    return json({
      theme: row ? sanitizeTheme(row.theme) : DEFAULT_THEME,
      systemPrompt: row?.system_prompt || '',
    });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось загрузить настройки' }, 500);
  }
}

export async function PUT(req) {
  const { user, error } = await requireUser();
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Некорректный запрос' }, 400);
  }

  const theme = sanitizeTheme(body.theme);
  const systemPrompt = String(body.systemPrompt || '').trim();
  if (systemPrompt.length > MAX_PROMPT) {
    return json({ error: `Промпт длиннее ${MAX_PROMPT} символов` }, 400);
  }

  try {
    const sql = await db();
    await sql`
      INSERT INTO user_settings (user_id, theme, system_prompt, updated_at)
      VALUES (${user.id}, ${JSON.stringify(theme)}::jsonb, ${systemPrompt}, NOW())
      ON CONFLICT (user_id) DO UPDATE
        SET theme = EXCLUDED.theme, system_prompt = EXCLUDED.system_prompt, updated_at = NOW()`;
    return json({ theme, systemPrompt });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось сохранить настройки' }, 500);
  }
}
