'use client';

import Link from 'next/link';
import { useState } from 'react';
import Brand from '@/components/Brand';

export default function AuthForm({ mode }) {
  const isRegister = mode === 'register';
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Что-то пошло не так');
        setBusy(false);
        return;
      }
      window.location.href = '/chat';
    } catch {
      setError('Нет связи с сервером. Проверьте интернет и попробуйте снова.');
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="wrap site-header" style={{ width: '100%' }}>
        <Brand />
      </div>
      <main className="auth-main">
        <form className="auth-card" onSubmit={submit}>
          <h1>{isRegister ? 'Создать аккаунт' : 'Войти'}</h1>
          <p className="hint">
            {isRegister
              ? 'Чтобы спрашивать Darka, нужен аккаунт. Он бесплатный.'
              : 'Войдите, чтобы продолжить разговор с Darka.'}
          </p>
          <div className="field">
            <label htmlFor="username">Имя пользователя</label>
            <input
              id="username"
              className="input"
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="например, darko_fan"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isRegister ? 'не короче 8 символов' : 'ваш пароль'}
              required
              minLength={isRegister ? 8 : undefined}
            />
          </div>
          <p className="form-error" role="alert">
            {error}
          </p>
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>
            {busy ? 'Подождите…' : isRegister ? 'Создать аккаунт' : 'Войти'}
          </button>
          <p className="auth-switch">
            {isRegister ? (
              <>
                Уже есть аккаунт? <Link href="/login">Войти</Link>
              </>
            ) : (
              <>
                Впервые здесь? <Link href="/register">Создать аккаунт</Link>
              </>
            )}
          </p>
        </form>
      </main>
    </div>
  );
}
