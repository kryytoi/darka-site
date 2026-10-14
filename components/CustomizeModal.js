'use client';

import { useEffect, useState } from 'react';
import { THEME_PRESETS, sanitizeTheme } from '@/lib/theme';

const PROMPT_LIMIT = 4000;

const PROMPT_IDEAS = [
  'Отвечай коротко и по делу, без вступлений.',
  'Обращайся ко мне на «ты», пиши просто, без канцелярита.',
  'Сначала дай ответ, потом объясни, если это нужно.',
  'Если чего-то не знаешь, так и скажи, не придумывай.',
];

// Окно кастомизации: тема оформления и главный промпт.
// Тема применяется сразу (предпросмотр), при закрытии без сохранения откатывается.
export default function CustomizeModal({ savedTheme, savedPrompt, onPreview, onSaved, onClose }) {
  const [tab, setTab] = useState('theme');
  const [theme, setTheme] = useState(savedTheme);
  const [prompt, setPrompt] = useState(savedPrompt);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !busy) onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  function pickPreset(p) {
    const next = { preset: p.id, accent: p.accent, bg: p.bg };
    setTheme(next);
    onPreview(next);
  }

  function pickCustom(field, value) {
    const next = { ...theme, preset: 'custom', [field]: value };
    setTheme(next);
    onPreview(next);
  }

  async function save() {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: sanitizeTheme(theme), systemPrompt: prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Не удалось сохранить');
      onSaved(data);
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  }

  const activePreset = THEME_PRESETS.find((p) => p.id === theme.preset);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="customize-title">
        <div className="modal-head">
          <h3 id="customize-title">Кастомизация</h3>
          <button type="button" className="icon-btn" aria-label="Закрыть" onClick={onClose} disabled={busy}>
            ×
          </button>
        </div>

        <div className="tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'theme'} className={tab === 'theme' ? 'tab on' : 'tab'} onClick={() => setTab('theme')}>
            Тема
          </button>
          <button type="button" role="tab" aria-selected={tab === 'prompt'} className={tab === 'prompt' ? 'tab on' : 'tab'} onClick={() => setTab('prompt')}>
            Главный промпт
          </button>
        </div>

        {tab === 'theme' && (
          <div role="tabpanel">
            <div className="swatch-grid">
              {THEME_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={theme.preset === p.id ? 'swatch on' : 'swatch'}
                  aria-pressed={theme.preset === p.id}
                  onClick={() => pickPreset(p)}
                  style={{ background: p.bg }}
                >
                  <span className="swatch-dot" style={{ background: p.accent }} aria-hidden="true" />
                  <span className="swatch-name">{p.name}</span>
                </button>
              ))}
            </div>

            <div className="custom-row">
              <label className="color-field">
                <span>Акцент</span>
                <input type="color" value={theme.accent} onChange={(e) => pickCustom('accent', e.target.value)} />
              </label>
              <label className="color-field">
                <span>Фон</span>
                <input type="color" value={theme.bg} onChange={(e) => pickCustom('bg', e.target.value)} />
              </label>
              <div className="custom-note">
                {theme.preset === 'custom' ? 'Своя тема' : activePreset ? `Тема: ${activePreset.name}` : ''}
              </div>
            </div>
          </div>
        )}

        {tab === 'prompt' && (
          <div role="tabpanel">
            <p className="modal-hint" style={{ marginBottom: 12 }}>
              Этот текст Darka получает перед каждым вашим сообщением как инструкцию: как отвечать, каким тоном и в каком
              формате. Он действует во всех разговорах этого аккаунта.
            </p>
            <textarea
              className="prompt-area"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_LIMIT))}
              placeholder="Например: Отвечай дружелюбно, короткими абзацами. В конце давай один совет."
              rows={7}
              aria-label="Главный промпт"
            />
            <div className="prompt-meta">
              <span>{prompt.length} / {PROMPT_LIMIT}</span>
              <button type="button" className="link-btn" onClick={() => setPrompt('')} disabled={!prompt}>
                Очистить
              </button>
            </div>
            <div className="idea-list">
              {PROMPT_IDEAS.map((idea) => (
                <button
                  key={idea}
                  type="button"
                  className="idea"
                  onClick={() => setPrompt((p) => (p ? `${p.trimEnd()}\n${idea}` : idea).slice(0, PROMPT_LIMIT))}
                >
                  + {idea}
                </button>
              ))}
            </div>
          </div>
        )}

        {err && (
          <div className="form-error" role="alert" style={{ marginTop: 14 }}>
            {err}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
            {busy ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
