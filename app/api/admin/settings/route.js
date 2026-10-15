import { requireUser, json } from '@/lib/auth';
import { getModelUrl, setModelUrl, checkModelUrl } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await requireUser({ admin: true });
  if (error) return error;
  try {
    return json({ modelUrl: await getModelUrl() });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось загрузить настройки' }, 500);
  }
}

export async function PUT(req) {
  const { error } = await requireUser({ admin: true });
  if (error) return error;

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Некорректный запрос' }, 400);
  }

  const check = checkModelUrl(body.modelUrl);
  if (!check.ok) return json({ error: check.error }, 400);

  try {
    await setModelUrl(check.value);
    return json({ modelUrl: check.value });
  } catch (e) {
    console.error(e);
    return json({ error: 'Не удалось сохранить адрес' }, 500);
  }
}
