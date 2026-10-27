import 'server-only';
import { NextResponse } from 'next/server';
import { createClient } from './supabase/server';
export async function adminDatabase(request: Request) {
  const origin = request.headers.get('origin');
  if (request.method !== 'GET' && origin && origin !== new URL(request.url).origin)
    return { error: NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 }) };
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    return { error: NextResponse.json({ error: 'Sign in to continue.' }, { status: 401 }) };
  if (user.app_metadata?.role !== 'admin')
    return {
      error: NextResponse.json({ error: 'Administrator access required.' }, { status: 403 }),
    };
  return { db };
}
