'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Brand from '@/components/Brand';

const DURATIONS = [
  { v: '7', label: '7 дней' },
  { v: '30', label: '30 дней' },
  { v: '90', label: '90 дней' },
  { v: '365', label: '1 год' },
  { v: 'forever', label: 'Бессрочно' },
];

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function UserRow({ u, onAction, busy }) {
  const [dur, setDur] = useState('30');
  const isAdmin = u.role === 'admin';

  return (
    <tr>
      <td>
        <strong>{u.username}</strong>
        {isAdmin && <span className="pill solid" style={{ marginLeft: 8 }}>админ</span>}
      </td>
      <td>
        <span className={u.plan === 'pro' ? 'plan-badge pro' : 'plan-badge'}>{u.plan === 'pro' ? 'Pro' : 'Free'}</span>
        {u.plan === 'pro' && (
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {u.planExpires ? `до ${fmt(u.planExpires)}` : 'бессрочно'}
          </div>
        )}
      </td>
      <td>
        {u.banned ? (
          <span className="status-ban">
            Заблокирован
            {u.banReason && <div className="muted" style={{ fontSize: 12 }}>{u.banReason}</div>}
          </span>
        ) : (
          <span className="status-ok">Активен</span>
        )}
      </td>
      <td className="muted">{u.chatCount}</td>
      <td className="muted">{fmt(u.createdAt)}</td>
      <td>
        {isAdmin ? (
          <span className="muted">—</span>
        ) : (
          <div className="actions">
            {u.banned ? (
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction(u, { action: 'unban' }, `${u.username} разблокирован`)}>
                Разбанить
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt(`Забанить ${u.username}? Укажите причину (можно оставить пустой):`, '');
                  if (reason === null) return;
                  onAction(u, { action: 'ban', reason }, `${u.username} заблокирован`);
                }}
              >
                Забанить
              </button>
            )}
            <select className="select" value={dur} onChange={(e) => setDur(e.target.value)} aria-label={`Срок подписки для ${u.username}`}>
              {DURATIONS.map((d) => (
                <option key={d.v} value={d.v}>
                  {d.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() =>
                onAction(u, { action: 'grant', days: dur === 'forever' ? null : Number(dur) }, `Pro выдан: ${u.username}`)
              }
            >
              Выдать Pro
            </button>
            {u.plan === 'pro' && (
              <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onAction(u, { action: 'revoke' }, `Подписка снята: ${u.username}`)}>
                Снять Pro
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

// Один адрес для всех моделей. Какая модель нужна, сайт передаёт в теле запроса полем model.
function ModelUrlCard({ say }) {
  const [url, setUrl] = useState('');
  const [saved, setSaved] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState(null);

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        setUrl(data.modelUrl || '');
        setSaved(data.modelUrl || '');
      })
      .catch(() => {
        /* поле останется пустым */
      })
      .finally(() => setLoaded(true));
  }, []);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelUrl: url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      setUrl(data.modelUrl);
      setSaved(data.modelUrl);
      say('Адрес моделей сохранён');
    } catch (err) {
      say(err.message);
    } finally {
      setBusy(false);
    }
  }

  // Отправляет тестовый вопрос на адрес из поля (даже несохранённый) и показывает, что ответил сервер
  async function runTest() {
    setTesting(true);
    setTest(null);
    try {
      const res = await fetch('/api/admin/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelUrl: url }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Проверка не удалась (HTTP ${res.status})`);
      setTest(data);
    } catch (err) {
      setTest({ ok: false, error: err.message });
    } finally {
      setTesting(false);
    }
  }

  const seconds = (ms) => (ms / 1000).toFixed(1).replace('.', ',');

  return (
    <form className="model-card" onSubmit={save}>
      <div>
        <h2>Адрес моделей</h2>
        <p className="muted">
          Один адрес для всех четырёх моделей: Darka Shadow 1.0, Quiziw 7.0, 0.1 и 0.2 Enchanted. Сайт отправляет на него
          POST-запрос, а в поле <code>model</code> указывает нужную модель. Этот адрес заменяет переменные окружения SHADOWURL,
          QUIZIWURL, NOLDVA и NOLODIN.
        </p>
      </div>
      <div className="model-row">
        <input
          className="input"
          type="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setTest(null);
          }}
          placeholder="https://model.example.com/api/chat"
          aria-label="Адрес моделей"
          disabled={!loaded}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={runTest} disabled={testing || !loaded || !url.trim()}>
          {testing ? 'Проверяю…' : 'Проверить'}
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !loaded || url.trim() === saved}>
          {busy ? 'Сохраняю…' : 'Сохранить'}
        </button>
      </div>
      {loaded && !saved && <p className="form-error model-note">Адрес не задан, поэтому модели сейчас недоступны.</p>}
      {loaded && saved && url.trim() !== saved && (
        <p className="muted model-note">Адрес изменён, но ещё не сохранён: чат пока ходит на старый.</p>
      )}
      {testing && <p className="muted model-note">Отправляю тестовый вопрос. Если модель в Colab генерирует медленно, это займёт до минуты.</p>}
      {test && (
        <div className={test.ok ? 'model-test ok' : 'model-test fail'} role="status">
          {test.ok ? (
            <>
              <strong>Модель ответила за {seconds(test.ms)} с</strong>
              <div className="muted">«{test.reply}»</div>
            </>
          ) : (
            <>
              <strong>{test.error}</strong>
              {test.detail && <div>{test.detail}</div>}
              {test.ms != null && <div className="muted">Прошло {seconds(test.ms)} с</div>}
            </>
          )}
        </div>
      )}
    </form>
  );
}

export default function AdminApp({ admin }) {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const timer = useRef(null);

  const say = useCallback((t) => {
    setToast(t);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 3000);
  }, []);

  const load = useCallback(
    async (query) => {
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ошибка');
        setUsers(data.users);
        setStats(data.stats);
      } catch (e) {
        say(e.message);
      } finally {
        setLoading(false);
      }
    },
    [say]
  );

  useEffect(() => {
    const t = setTimeout(() => load(q), 250);
    return () => clearTimeout(t);
  }, [q, load]);

  async function act(u, body, okText) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка');
      say(okText);
      await load(q);
    } catch (e) {
      say(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <div className="admin">
      <div className="wrap admin-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Brand />
          <span className="admin-title">Админка</span>
        </div>
        <div className="header-actions">
          <Link href="/chat" className="btn btn-ghost btn-sm">
            К чату
          </Link>
          <button type="button" className="btn btn-ghost btn-sm" onClick={logout}>
            Выйти ({admin.username})
          </button>
        </div>
      </div>

      <div className="wrap admin-body">
        <ModelUrlCard say={say} />

        <h1>Пользователи</h1>

        {stats && (
          <div className="stats">
            <div className="stat"><div className="v">{stats.users}</div><div className="l">Всего пользователей</div></div>
            <div className="stat"><div className="v">{stats.pro}</div><div className="l">С активной Pro</div></div>
            <div className="stat"><div className="v">{stats.banned}</div><div className="l">Заблокировано</div></div>
            <div className="stat"><div className="v">{stats.messages_today}</div><div className="l">Вопросов за 24 часа</div></div>
          </div>
        )}

        <div className="toolbar">
          <label htmlFor="search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
            Поиск пользователя
          </label>
          <input id="search" className="input" type="search" placeholder="Поиск по имени…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        <div className="table-wrap">
          <table className="users">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Подписка</th>
                <th>Статус</th>
                <th>Чатов</th>
                <th>Регистрация</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} u={u} onAction={act} busy={busy} />
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 28, textAlign: 'center' }}>
                    Никого не найдено
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 28, textAlign: 'center' }}>
                    Загрузка…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
