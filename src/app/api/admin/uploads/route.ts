import { NextResponse } from 'next/server';
import { adminDatabase } from '@/lib/adminAccess';
export async function POST(request: Request) {
  const access = await adminDatabase(request);
  if (access.error) return access.error;
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024)
    return NextResponse.json({ error: 'Choose an image smaller than 3 MB.' }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  const png = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71;
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  const type = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : '';
  if (!type || file.type !== type)
    return NextResponse.json({ error: 'Upload a PNG, JPEG or WebP image.' }, { status: 400 });
  const path = `${crypto.randomUUID()}.${png ? 'png' : jpeg ? 'jpg' : 'webp'}`;
  const { error } = await access.db.storage
    .from('product-images')
    .upload(path, bytes, { contentType: type });
  return NextResponse.json(
    error
      ? { error: 'Image upload failed.' }
      : { url: access.db.storage.from('product-images').getPublicUrl(path).data.publicUrl },
    { status: error ? 400 : 200 }
  );
}
