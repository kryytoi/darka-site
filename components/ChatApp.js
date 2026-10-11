'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import Brand from '@/components/Brand';
import Markdown from '@/components/Markdown';
import { MODELS, getModel, canUseModel } from '@/lib/models';

const SUGGESTIONS = [
  'Объясни простыми словами, что такое нейросеть',
  'Помоги составить план изучения статистики',
  'Придумай 5 названий для небольшой кофейни',
  'Сократи мой текст, сохранив смысл',
];

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ChatApp({ user: initialUser }) {
  const [user] = useState(initialUser);
  const [chats, setChats] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [modelId, setModelId] = useState('shadow');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [copied, setCopied] = useState(null);
  const endRef = useRef(null);
  const taRef = useRef(null);
  const pickRef = useRef(null);

  const model = getModel(modelId);

  const loadChats = useCallback(async () => {
    try {
      const res = await fetch('/api/chats', { cache: 'no-store' });
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/login';
        return;
      }
      const data = await res.json();
      setChats(data.chats || []);
    } catch {
      /* список не критичен */
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Выбираем доступную модель по умолчанию (для Pro — самую сильную)
  useEffect(() => {
    if (canUseModel(getModel('quiziw'), user.plan, user.role)) setModelId('quiziw');
  }, [user.plan, user.role]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  useEffect(() => {
    function onDoc(e) {
      if (pickRef.current && !pickRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [input]);

  function newChat() {
    setChatId(null);
    setMessages([]);
    setError('');
    setSideOpen(false);
    taRef.current?.focus();
  }

  async function openChat(id) {
    setSideOpen(false);
    if (id === chatId) return;
    setLoadingChat(true);
    setError('');
    try {
      const res = await fetch(`/api/chats/${id}`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не удалось открыть разговор');
      setChatId(id);
      setMessages(data.messages);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingChat(false);
    }
  }

  async function deleteChat(id) {
    if (!window.confirm('Удалить этот разговор?')) return;
    try {
      await fetch(`/api/chats/${id}`, { method: 'DELETE' });
      setChats((c) => c.filter((x) => x.id !== id));
      if (id === chatId) newChat();
    } catch {
      setError('Не удалось удалить разговор');
    }
  }

  async function send(textArg) {
    const text = (textArg ?? input).trim();
    if (!text || sending) return;
    if (!canUseModel(model, user.plan, user.role)) {
      setError(`${model.name} доступна по подписке Pro. Выберите другую модель.`);
      return;
    }
    setError('');
    setInput('');
    setSending(true);
    const tempId = 'tmp-' + Date.now();
    setMessages((m) => [...m, { id: tempId, role: 'user', content: text }]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, model: modelId, message: text }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || data.banned) {
        window.location.href = data.banned ? '/chat' : '/login';
        return;
      }
      if (data.chatId && !chatId) setChatId(data.chatId);

      if (!res.ok) {
        setError(data.error || 'Не удалось получить ответ');
        if (data.chatId) loadChats();
        return;
      }
      setMessages((m) => [...m, data.message]);
      loadChats();
    } catch {
      setError('Нет связи с сервером. Проверьте интернет и попробуйте снова.');
    } finally {
      setSending(false);
    }
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  }

  async function copy(id, text) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* буфер недоступен */
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  }

  const isPro = user.plan === 'pro';

  return (
    <div className="chat-shell">
      <div className={sideOpen ? 'scrim open' : 'scrim'} onClick={() => setSideOpen(false)} />
      <aside className={sideOpen ? 'sidebar open' : 'sidebar'} aria-label="Разговоры">
        <Brand />
        <button type="button" className="btn btn-primary" onClick={newChat}>
          + Новый разговор
        </button>
        <div className="side-label">Недавние</div>
        <nav className="chat-list" aria-label="История разговоров">
          {chats.length === 0 && <div className="side-empty">Здесь появятся ваши разговоры.</div>}
          {chats.map((c) => (
            <div key={c.id} className={c.id === chatId ? 'chat-item active' : 'chat-item'}>
              <button type="button" className="open" onClick={() => openChat(c.id)} title={c.title}>
                {c.title}
              </button>
              <button type="button" className="del" aria-label={`Удалить разговор «${c.title}»`} onClick={() => deleteChat(c.id)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
                </svg>
              </button>
            </div>
          ))}
        </nav>
        <div className="user-box">
          <div className="user-line">
            <span className="user-name">{user.username}</span>
            <span className={isPro ? 'plan-badge pro' : 'plan-badge'}>{isPro ? 'Pro' : 'Free'}</span>
          </div>
          {isPro && user.planExpires && <div className="plan-exp">Pro до {formatDate(user.planExpires)}</div>}
          {isPro && !user.planExpires && user.role !== 'admin' && <div className="plan-exp">Pro без срока</div>}
          <div className="user-actions">
            {user.role === 'admin' && (
              <Link href="/admin" className="btn btn-ghost">
                Админка
              </Link>
            )}
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Выйти
            </button>
          </div>
        </div>
      </aside>

      <main className="chat-main">
        <div className="topbar">
          <button type="button" className="menu-btn" aria-label="Открыть список разговоров" onClick={() => setSideOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <div className="model-pick" ref={pickRef}>
            <button
              type="button"
              className="model-btn"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="dot" style={{ background: model.color }} aria-hidden="true" />
              <span>{model.name}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {menuOpen && (
              <div className="model-menu" role="listbox" aria-label="Выбор модели">
                {MODELS.map((m) => {
                  const ok = canUseModel(m, user.plan, user.role);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={m.id === modelId}
                      className={`model-opt${m.id === modelId ? ' sel' : ''}${ok ? '' : ' locked'}`}
                      onClick={() => {
                        if (!ok) {
                          setError(`${m.name} доступна по подписке Pro. Её выдаёт администратор.`);
                        } else {
                          setModelId(m.id);
                          setError('');
                        }
                        setMenuOpen(false);
                      }}
                    >
                      <span className="dot" style={{ background: m.color }} aria-hidden="true" />
                      <span>
                        <span className="nm">{m.name}</span>
                        <span className="nt">{m.note}</span>
                      </span>
                      <span className="tg">{ok ? m.tag : 'Pro'}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <span className="spacer" />
          <Link href="/" className="btn btn-sm" style={{ color: 'var(--muted)' }}>
            О Darka
          </Link>
        </div>

        <div className="messages">
          <div className="messages-inner">
            {messages.length === 0 && !loadingChat && (
              <div className="empty-chat">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="" />
                <h2>Чем заняться сегодня, {user.username}?</h2>
                <p>Выберите модель вверху и напишите свой вопрос. Или начните с одной из идей.</p>
                <div className="suggest">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} type="button" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {loadingChat && <div className="muted">Загружаю разговор…</div>}
            {messages.map((m) =>
              m.role === 'user' ? (
                <div key={m.id} className="msg-user">
                  {m.content}
                </div>
              ) : (
                <div key={m.id} className="msg-bot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="av" src="/logo.png" alt="" />
                  <div className="body">
                    <div className="who" style={{ color: getModel(m.model)?.color || 'var(--purple)' }}>
                      {getModel(m.model)?.name || 'Darka'}
                    </div>
                    <Markdown text={m.content} />
                    <div className="msg-tools">
                      <button type="button" className="tool-btn" onClick={() => copy(m.id, m.content)}>
                        {copied === m.id ? 'Скопировано' : 'Копировать'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            )}
            {sending && (
              <div className="msg-bot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="av" src="/logo.png" alt="" />
                <div className="body">
                  <div className="who" style={{ color: model.color }}>
                    {model.name}
                  </div>
                  <span className="typing" role="status" aria-label="Darka печатает">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        <div className="composer">
          <div className="composer-inner">
            {error && (
              <div className="banner" role="alert">
                {error}
              </div>
            )}
            <div className="composer-box">
              <label htmlFor="ask" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
                Сообщение для Darka
              </label>
              <textarea
                id="ask"
                ref={taRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Напишите сообщение…"
                maxLength={8000}
              />
              <button type="button" className="send-btn" aria-label="Отправить" disabled={sending || !input.trim()} onClick={() => send()}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
            <div className="composer-note">Darka может ошибаться. Важное лучше проверять. Enter — отправить, Shift+Enter — новая строка.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
