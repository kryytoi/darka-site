'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// Кнопки в шапке и в призывах: меняются в зависимости от того, вошёл ли пользователь.
export function useMe() {
  const [me, setMe] = useState(undefined); // undefined — ещё грузится
  useEffect(() => {
    let alive = true;
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => alive && setMe(d.user || null))
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, []);
  return me;
}

export default function HeaderActions() {
  const me = useMe();
  if (me) {
    return (
      <div className="header-actions">
        {me.role === 'admin' && (
          <Link href="/admin" className="btn btn-ghost">
            Админка
          </Link>
        )}
        <Link href="/chat" className="btn btn-primary">
          Открыть чат
        </Link>
      </div>
    );
  }
  return (
    <div className="header-actions">
      <Link href="/login" className="btn">
        Войти
      </Link>
      <Link href="/register" className="btn btn-primary">
        Создать аккаунт
      </Link>
    </div>
  );
}

export function CtaButton({ className = 'btn btn-primary btn-lg', children = 'Начать разговор' }) {
  const me = useMe();
  return (
    <Link href={me ? '/chat' : '/register'} className={className}>
      {me ? 'Открыть чат' : children}
    </Link>
  );
}
