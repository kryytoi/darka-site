import { db } from '@/lib/db';
import { requireUser, json, publicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// PATCH body:
//  { action: 'ban', reason?: string }
//  { action: 'unban' }
//  { action: 'grant', days: number | null }   // null — бессрочно
//  { action: 'revoke' }
export async function PATCH(req, { params }) {
  const { user: admin, error } = await requireUser({ admin: true });
  if (error) return error;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: 'Пользователь не найден' }, 404);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Некорректный запрос' }, 400);
  }

  try {
    const sql = await db();
    const found = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
    const target = found[0];
    if (!target) return json({ error: 'Пользователь не найден' }, 404);

    let rows;
    switch (body.action) {
      case 'ban': {
        if (target.role === 'admin' || target.id === admin.id) {
          return json({ error: 'Администратора нельзя заблокировать' }, 400);
        }
        const reason = String(body.reason || '').trim().slice(0, 200) || null;
        rows = await sql`UPDATE users SET banned = TRUE, ban_reason = ${reason} WHERE id = ${id} RETURNING *`;
        break;
      }
      case 'unban':
        rows = await sql`UPDATE users SET banned = FALSE, ban_reason = NULL WHERE id = ${id} RETURNING *`;
        break;
      case 'grant': {
        const days = body.days === null || body.days === undefined ? null : Number(body.days);
        if (days !== null && (!Number.isFinite(days) || days < 1 || days > 3650)) {
          return json({ error: 'Срок: от 1 до 3650 дней' }, 400);
        }
        if (days === null) {
          rows = await sql`UPDATE users SET plan = 'pro', plan_expires = NULL WHERE id = ${id} RETURNING *`;
        } else {
          // Если подписка ещё действует — продлеваем от её конца
          const stillActive =
            target.plan === 'pro' && target.plan_expires && new Date(target.plan_expires).getTime() > Date.now();
          rows = stillActive
            ? await sql`UPDATE users SET plan = 'pro', plan_expires = plan_expires + make_interval(days => ${Math.floor(days)}) WHERE id = ${id} RETURNING *`
            : await sql`UPDATE users SET plan = 'pro', plan_expires = NOW() + make_interval(days => ${Math.floor(days)}) WHERE id = ${id} RETURNING *`;
        }
        break;
      }
      case 'revoke':
        rows = await sql`UPDATE users SET plan = 'free', plan_expires = NULL WHERE id = ${id} RETURNING *`;
        break;
      default:
        return json({ error: 'Неизвестное действие' }, 400);
    }
    return json({ user: publicUser(rows[0]) });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось выполнить действие' }, 500);
  }
}
