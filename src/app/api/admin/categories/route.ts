import { NextResponse } from 'next/server';
import { adminDatabase } from '@/lib/adminAccess';
export async function POST(request: Request) {
  const access = await adminDatabase(request);
  if (access.error) return access.error;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid category.' }, { status: 400 });
  }
  if (
    !body ||
    typeof body.id !== 'string' ||
    !/^[a-z0-9][a-z0-9-]{0,119}$/.test(body.id) ||
    typeof body.name !== 'string' ||
    !body.name.trim() ||
    body.name.length > 100
  )
    return NextResponse.json({ error: 'Enter a category name and valid ID.' }, { status: 400 });
  if (
    body.image &&
    (typeof body.image !== 'string' ||
      !body.image.startsWith('https://') ||
      body.image.length > 2000)
  )
    return NextResponse.json({ error: 'Use an HTTPS image URL.' }, { status: 400 });
  const { error } = await access.db.from('categories').upsert(
    {
      id: body.id,
      name: body.name.trim(),
      description: String(body.description || '').slice(0, 2000),
      image: body.image || '',
      alt: body.name.trim(),
      is_active: body.is_active !== false,
    },
    { onConflict: 'id' }
  );
  return NextResponse.json(error ? { error: 'Category was not saved.' } : { saved: true }, {
    status: error ? 400 : 200,
  });
}
