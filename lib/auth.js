import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';
import { db } from '@/lib/db';

export const COOKIE = 'darka_session';
export const ADMIN_USERNAME = 'mrdarko'; // сравнивается без учёта регистра
const MAX_AGE = 60 * 60 * 24 * 30;

function secretKey() {
  const raw =
    process.env.AUTH_SECRET ||
    createHash('sha256').update('darka-session:' + (process.env.DATABASE || '')).digest('hex');
  return new TextEncoder().encode(raw);
}

export async function createSession(userId) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey());
  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSession() {
  cookies().set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

export function effectivePlan(user) {
  if (!user) return 'free';
  if (user.plan === 'pro') {
    if (!user.plan_expires) return 'pro';
    if (new Date(user.plan_expires).getTime() > Date.now()) return 'pro';
  }
  return 'free';
}

export function publicUser(u) {
  return {
    id: u.id,
    username: u.username,
    role: u.role,
    banned: u.banned,
    banReason: u.ban_reason,
    plan: effectivePlan(u),
    planExpires: u.plan_expires ? new Date(u.plan_expires).toISOString() : null,
  };
}

// Возвращает пользователя из базы по cookie или null. Блокировка проверяется каждый раз.
export async function getSessionUser() {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const sql = await db();
    const rows = await sql`SELECT * FROM users WHERE id = ${Number(payload.uid)} LIMIT 1`;
    return rows[0] || null;
  } catch {
    return null;
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// Для API: возвращает { user } или { error: Response }
export async function requireUser({ admin = false } = {}) {
  let user;
  try {
    user = await getSessionUser();
  } catch (e) {
    console.error(e);
    return { error: json({ error: 'База данных недоступна' }, 500) };
  }
  if (!user) return { error: json({ error: 'Войдите в аккаунт' }, 401) };
  if (user.banned) {
    return {
      error: json(
        { error: user.ban_reason ? `Аккаунт заблокирован: ${user.ban_reason}` : 'Аккаунт заблокирован', banned: true },
        403
      ),
    };
  }
  if (admin && user.role !== 'admin') return { error: json({ error: 'Нет доступа' }, 403) };
  return { user };
}
