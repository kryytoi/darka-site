import { getSessionUser, json, publicUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return json({ user: null });
    return json({ user: publicUser(user) });
  } catch {
    return json({ user: null });
  }
}
