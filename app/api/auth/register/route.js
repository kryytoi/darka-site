import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, json, publicUser, ADMIN_USERNAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Некорректный запрос' }, 400);
  }
  const username = String(body.username || '').trim();
  const password = String(body.password || '');

  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
    return json({ error: 'Имя: 3–24 символа, латинские буквы, цифры и _' }, 400);
  }
  if (password.length < 8 || password.length > 100) {
    return json({ error: 'Пароль должен быть от 8 символов' }, 400);
  }

  try {
    const sql = await db();
    const lower = username.toLowerCase();
    const exists = await sql`SELECT 1 FROM users WHERE username_lower = ${lower} LIMIT 1`;
    if (exists.length) return json({ error: 'Это имя уже занято' }, 409);

    const hash = await bcrypt.hash(password, 10);
    const role = lower === ADMIN_USERNAME ? 'admin' : 'user';
    const rows = await sql`
      INSERT INTO users (username, username_lower, password_hash, role)
      VALUES (${username}, ${lower}, ${hash}, ${role})
      ON CONFLICT (username_lower) DO NOTHING
      RETURNING *`;
    if (!rows.length) return json({ error: 'Это имя уже занято' }, 409);

    await createSession(rows[0].id);
    return json({ user: publicUser(rows[0]) });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось создать аккаунт. Проверьте подключение к базе.' }, 500);
  }
}
