import { requireUser, json } from '@/lib/auth';
import {
  MAX_FILE_BYTES,
  MAX_FILE_CHARS,
  MAX_IMPORT_FILES,
  MAX_TOTAL_CHARS,
  isTextName,
} from '@/lib/attachments';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Папки, которые не нужны модели: зависимости, сборка, служебные данные Git.
const SKIP_SEGMENTS = new Set(['node_modules', '.git', '.next', '.vercel', 'dist', 'build', 'out', 'vendor', 'coverage', '__pycache__']);
const LOCK_FILE = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|Cargo\.lock|poetry\.lock)$/;
const GH_HEADERS = { Accept: 'application/vnd.github+json', 'User-Agent': 'darka-site', 'X-GitHub-Api-Version': '2022-11-28' };

// Принимает ссылки вида github.com/owner/repo, github.com/owner/repo/tree/branch/папка или owner/repo.
// Токен GitHub не используется: импорт работает только с публичными репозиториями.
export function parseGithubUrl(raw) {
  let s = String(raw || '').trim();
  if (!s || s.length > 500) return null;
  s = s.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
  const parts = s.split(/[?#]/)[0].replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const [owner, rawRepo, kind, ...rest] = parts;
  const repo = rawRepo.replace(/\.git$/, '');
  if (!/^[A-Za-z0-9-]{1,39}$/.test(owner) || !/^[\w.-]{1,100}$/.test(repo)) return null;

  let branch = null;
  let path = '';
  if (kind === 'tree' || kind === 'blob') {
    if (rest.length) {
      branch = rest[0];
      path = rest.slice(1).join('/');
    }
  } else if (kind) {
    return null;
  }
  if (path.split('/').some((seg) => seg === '..' || seg === '.')) return null;
  return { owner, repo, branch, path };
}

async function ghJson(url) {
  try {
    const res = await fetch(url, { headers: GH_HEADERS, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    const data = res.ok ? await res.json() : null;
    return { status: res.status, ok: res.ok, data };
  } catch {
    return { status: 0, ok: false, data: null };
  }
}

async function fetchText(owner, repo, branch, path) {
  const enc = (p) => p.split('/').map(encodeURIComponent).join('/');
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${enc(branch)}/${enc(path)}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'darka-site' }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FILE_BYTES) return null;
    // fatal: true — если файл не UTF-8 текст, декодирование упадёт и файл будет пропущен
    const text = new TextDecoder('utf-8', { fatal: true }).decode(buf);
    if (text.includes('\u0000')) return null;
    return text;
  } catch {
    return null;
  }
}

export async function POST(req) {
  const { error } = await requireUser();
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Некорректный запрос' }, 400);
  }

  const ref = parseGithubUrl(body.url);
  if (!ref) {
    return json({ error: 'Укажите ссылку вида https://github.com/владелец/репозиторий/tree/ветка/папка' }, 400);
  }

  const { owner, repo } = ref;
  const api = `https://api.github.com/repos/${owner}/${repo}`;

  const meta = await ghJson(api);
  if (meta.status === 404) {
    return json({ error: 'Репозиторий не найден. Импорт работает только с публичными репозиториями.' }, 404);
  }
  if (meta.status === 403 || meta.status === 429) {
    return json({ error: 'GitHub временно ограничил запросы. Попробуйте чуть позже.' }, 429);
  }
  if (!meta.ok) return json({ error: 'Не удалось открыть репозиторий на GitHub.' }, 502);
  if (meta.data.private) {
    return json({ error: 'Этот репозиторий приватный. Импорт работает только с публичными.' }, 403);
  }

  const branch = ref.branch || meta.data.default_branch;
  const tree = await ghJson(`${api}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  if (tree.status === 403 || tree.status === 429) {
    return json({ error: 'GitHub временно ограничил запросы. Попробуйте чуть позже.' }, 429);
  }
  if (tree.status === 404) return json({ error: 'Ветка не найдена.' }, 404);
  if (!tree.ok || !Array.isArray(tree.data?.tree)) {
    return json({ error: 'Не удалось прочитать файлы репозитория.' }, 502);
  }

  const prefix = ref.path ? `${ref.path.replace(/\/+$/, '')}/` : '';
  const candidates = tree.data.tree
    .filter((e) => e.type === 'blob')
    .filter((e) => !prefix || e.path.startsWith(prefix))
    .filter((e) => !e.path.split('/').some((seg) => SKIP_SEGMENTS.has(seg)))
    .filter((e) => !LOCK_FILE.test(e.path) && isTextName(e.path))
    .filter((e) => (e.size ?? 0) <= MAX_FILE_BYTES)
    .sort((a, b) => a.path.split('/').length - b.path.split('/').length || a.path.localeCompare(b.path));

  const chosen = candidates.slice(0, MAX_IMPORT_FILES);
  let skipped = candidates.length - chosen.length;

  // Скачиваем по 8 файлов параллельно, чтобы не упереться в лимит времени функции
  const texts = [];
  for (let i = 0; i < chosen.length; i += 8) {
    const part = await Promise.all(chosen.slice(i, i + 8).map((e) => fetchText(owner, repo, branch, e.path)));
    texts.push(...part);
  }

  const files = [];
  let total = 0;
  chosen.forEach((entry, i) => {
    const text = texts[i];
    if (text == null || text.length > MAX_FILE_CHARS || total + text.length > MAX_TOTAL_CHARS) {
      skipped += 1;
      return;
    }
    total += text.length;
    files.push({ name: entry.path, content: text });
  });

  if (!files.length) {
    return json({ error: 'В этой папке нет подходящих текстовых файлов.' }, 422);
  }

  return json({
    repo: `${owner}/${repo}`,
    branch,
    path: ref.path,
    files,
    skipped,
    truncated: tree.data.truncated === true,
  });
}
