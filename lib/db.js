import { neon } from '@neondatabase/serverless';

let client = null;
let schemaPromise = null;

export function getSql() {
  if (!client) {
    const url = process.env.DATABASE;
    if (!url) throw new Error('Переменная окружения DATABASE не задана');
    client = neon(url);
  }
  return client;
}

// Создаёт таблицы при первом обращении. Повторный запуск безопасен.
export function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = getSql();
      await sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL,
        username_lower TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        banned BOOLEAN NOT NULL DEFAULT FALSE,
        ban_reason TEXT,
        plan TEXT NOT NULL DEFAULT 'free',
        plan_expires TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL DEFAULT 'Новый разговор',
        model TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS chats_user_idx ON chats(user_id, updated_at DESC)`;
      await sql`CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        model TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS messages_chat_idx ON messages(chat_id, id)`;
    })().catch((e) => {
      schemaPromise = null;
      throw e;
    });
  }
  return schemaPromise;
}

export async function db() {
  await ensureSchema();
  return getSql();
}
