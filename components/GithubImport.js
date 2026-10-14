'use client';

import { useEffect, useRef, useState } from 'react';

// Окно импорта папки из публичного репозитория GitHub.
// Файлы приходят с сервера через /api/github/import и передаются родителю через onImport.
export default function GithubImport({ onClose, onImport }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function submit(e) {
    e.preventDefault();
    if (!url.trim() || busy) return;
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/github/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Не удалось импортировать папку');
      onImport(data.files || [], data);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="gh-import-title">
        <div className="modal-head">
          <h3 id="gh-import-title">Импорт папки из GitHub</h3>
          <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose} disabled={busy}>
            ×
          </button>
        </div>
        <p className="modal-hint">
          Вставьте ссылку на папку публичного репозитория, например <code>github.com/owner/repo/tree/main/src</code>. Файлы
          прикрепятся к сообщению, и вы сможете написать к ним вопрос. Приватные репозитории не импортируются.
        </p>
        <form onSubmit={submit}>
          <input
            ref={inputRef}
            className="input"
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://github.com/owner/repo/tree/main/папка"
            aria-label="Ссылка на репозиторий или папку"
            disabled={busy}
          />
          {err && (
            <div className="form-error" role="alert" style={{ marginTop: 14 }}>
              {err}
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !url.trim()}>
              {busy ? 'Загружаю…' : 'Импортировать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
