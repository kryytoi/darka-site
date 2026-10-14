// Вложения в сообщениях.
// Файлы хранятся прямо в тексте сообщения в виде блоков:
//
//   [Файл: src/app/page.js]
//   ...содержимое...
//   [Конец файла]
//
// Так бэкенд модели и база данных работают с ними без изменений.
// Этот модуль используется и в браузере, и на сервере, поэтому здесь нет браузерных или серверных зависимостей.

export const MAX_ATTACHMENTS = 60; // файлов в одном сообщении
export const MAX_FILE_BYTES = 300 * 1024; // размер одного файла на диске
export const MAX_FILE_CHARS = 100000; // символов в одном файле
export const MAX_TOTAL_CHARS = 200000; // символов во всех файлах одного сообщения
export const MAX_MESSAGE_CHARS = 230000; // предел сообщения на сервере (файлы + текст)
export const MAX_IMPORT_FILES = 60; // файлов за один импорт папки из GitHub

const BLOCK_RE = /\[Файл: ([^\]\n]+)\]\n([\s\S]*?)\n\[Конец файла\]/g;

const TEXT_EXT = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'yaml', 'yml', 'xml', 'html', 'htm', 'css', 'scss',
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'vue', 'svelte', 'py', 'java', 'kt', 'go', 'rs', 'rb', 'php',
  'c', 'h', 'cpp', 'hpp', 'cs', 'swift', 'sh', 'bash', 'sql', 'toml', 'ini', 'cfg', 'env', 'log',
  'gitignore', 'dockerfile', 'makefile',
]);
const TEXT_NAMES = new Set(['dockerfile', 'makefile', 'license', 'readme']);

export function isTextName(name) {
  const base = String(name).split('/').pop().toLowerCase();
  if (TEXT_NAMES.has(base)) return true;
  const dot = base.lastIndexOf('.');
  if (dot === -1) return false;
  return TEXT_EXT.has(base.slice(dot + 1));
}

export function fileBlock(name, content) {
  const safe = String(name).replace(/[[\]\r\n]/g, '_');
  return `[Файл: ${safe}]\n${content}\n[Конец файла]`;
}

// Собирает текст сообщения из файлов и текста пользователя.
export function buildMessage(files, text) {
  return [...files.map((f) => fileBlock(f.name, f.content)), text].filter(Boolean).join('\n\n');
}

// Разбирает сообщение обратно на файлы и обычный текст (для показа в интерфейсе).
export function splitMessage(content) {
  const files = [];
  const text = String(content || '')
    .replace(BLOCK_RE, (_, name, body) => {
      files.push({ name, content: body });
      return '';
    })
    .trim();
  return { files, text };
}

// В истории для модели старые файлы не повторяем целиком: иначе контекст быстро переполнится.
export function compactAttachments(content) {
  return String(content || '').replace(BLOCK_RE, (_, name) => `[Файл: ${name} — передан ранее]`);
}

// Проверяет, сколько файлов можно добавить к уже выбранным. Возвращает принятые файлы и ошибки.
export function validateAttachments(current, incoming) {
  const accepted = [];
  const errors = [];
  let count = current.length;
  let total = current.reduce((sum, a) => sum + a.content.length, 0);

  for (const f of incoming) {
    if (count >= MAX_ATTACHMENTS) {
      errors.push(`Можно прикрепить не больше ${MAX_ATTACHMENTS} файлов.`);
      break;
    }
    if (f.content.length > MAX_FILE_CHARS) {
      errors.push(`«${f.name}» слишком большой для одного файла.`);
      continue;
    }
    if (total + f.content.length > MAX_TOTAL_CHARS) {
      errors.push(`«${f.name}» не помещается в общий лимит вложений.`);
      continue;
    }
    accepted.push(f);
    count += 1;
    total += f.content.length;
  }
  return { accepted, errors };
}

// Читает файл из браузера как текст. Бросает понятную ошибку, если файл не подходит.
export async function readTextFile(file) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`«${file.name}» больше 300 КБ.`);
  }
  if (!isTextName(file.name)) {
    throw new Error(`«${file.name}»: пока можно прикреплять только текстовые файлы (код, txt, md, json, csv).`);
  }
  const content = await file.text();
  if (content.includes('\u0000')) {
    throw new Error(`«${file.name}» похож на двоичный файл.`);
  }
  return { name: file.name, content };
}
