import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { createSession, json, publicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Некорректный запрос' }, 400);
  }
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!username || !password) return json({ error: 'Введите имя и пароль' }, 400);

  try {
    const sql = await db();
    const rows = await sql`SELECT * FROM users WHERE username_lower = ${username} LIMIT 1`;
    const user = rows[0];
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok) return json({ error: 'Неверное имя или пароль' }, 401);
    if (user.banned) {
      return json(
        { error: user.ban_reason ? `Аккаунт заблокирован: ${user.ban_reason}` : 'Аккаунт заблокирован' },
        403
      );
    }
    await createSession(user.id);
    return json({ user: publicUser(user) });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось войти. Проверьте подключение к базе.' }, 500);
  }
}
