// Темы оформления чата. Используются и на сервере (проверка настроек), и в интерфейсе.

export const THEME_PRESETS = [
  { id: 'darka', name: 'Darka', accent: '#8b5cf6', bg: '#0a0612' },
  { id: 'midnight', name: 'Полночь', accent: '#3b82f6', bg: '#060a18' },
  { id: 'emerald', name: 'Изумруд', accent: '#10b981', bg: '#06100c' },
  { id: 'sunset', name: 'Закат', accent: '#f97316', bg: '#120806' },
  { id: 'graphite', name: 'Графит', accent: '#a1a1aa', bg: '#09090b' },
];

export const DEFAULT_THEME = { preset: 'darka', accent: '#8b5cf6', bg: '#0a0612' };

const HEX = /^#[0-9a-fA-F]{6}$/;

// Приводит тему к безопасному виду: только известный id и корректные цвета
export function sanitizeTheme(t) {
  const accent = HEX.test(t?.accent) ? t.accent.toLowerCase() : DEFAULT_THEME.accent;
  const bg = HEX.test(t?.bg) ? t.bg.toLowerCase() : DEFAULT_THEME.bg;
  const preset = typeof t?.preset === 'string' && t.preset.length <= 20 ? t.preset : DEFAULT_THEME.preset;
  return { preset, accent, bg };
}

function hexToRgb(hex) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

// Смешивает два цвета: t = 0 — первый, t = 1 — второй
function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

// Превращает две выбранные пользователем краски в полный набор CSS-переменных
export function themeVars({ accent, bg }) {
  return {
    '--purple': mix(accent, '#ffffff', 0.2),
    '--purple-soft': mix(accent, '#ffffff', 0.45),
    '--purple-btn': accent,
    '--purple-deep': mix(accent, '#000000', 0.22),
    '--g-violet': accent,
    '--bg': bg,
    '--bg2': mix(bg, '#ffffff', 0.03),
    '--surface': mix(bg, '#ffffff', 0.06),
    '--surface2': mix(bg, '#ffffff', 0.1),
    '--surface3': mix(bg, '#ffffff', 0.13),
    '--line': mix(bg, '#ffffff', 0.14),
    '--line2': mix(bg, '#ffffff', 0.22),
  };
}
