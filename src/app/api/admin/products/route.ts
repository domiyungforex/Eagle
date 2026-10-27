import { NextResponse } from 'next/server';
import { adminDatabase } from '@/lib/adminAccess';
import { mapProduct, validateProduct } from '@/lib/catalog';
export async function GET(request: Request) {
  const access = await adminDatabase(request);
  if (access.error) return access.error;
  const [products, categories] = await Promise.all([
    access.db.from('products').select('*').order('created_at', { ascending: false }),
    access.db.from('categories').select('*').order('sort_order'),
  ]);
  if (products.error || categories.error)
    return NextResponse.json({ error: 'Could not load product administration.' }, { status: 503 });
  return NextResponse.json(
    { products: (products.data || []).map(mapProduct), categories: categories.data || [] },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
async function save(request: Request, editing: boolean) {
  const access = await adminDatabase(request);
  if (access.error) return access.error;
  let product;
  try {
    product = validateProduct(await request.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid product.' },
      { status: 400 }
    );
  }
  const query = editing
    ? access.db.from('products').update(product).eq('id', product.id)
    : access.db.from('products').insert(product);
  const { data, error } = await query.select().single();
  if (error)
    return NextResponse.json(
      {
        error:
          error.code === '23505'
            ? 'This product ID already exists.'
            : 'Product was not saved. Check its category and try again.',
      },
      { status: error.code === '23505' ? 409 : 400 }
    );
  return NextResponse.json({ product: mapProduct(data) });
}
export const POST = (request: Request) => save(request, false);
export const PATCH = (request: Request) => save(request, true);
export async function DELETE(request: Request) {
  const access = await adminDatabase(request);
  if (access.error) return access.error;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Choose a product.' }, { status: 400 });
  const { data, error } = await access.db
    .from('products')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error)
    return NextResponse.json({ error: 'The product could not be deleted.' }, { status: 400 });
  return NextResponse.json(data ? { deleted: id } : { error: 'Product not found.' }, {
    status: data ? 200 : 404,
  });
}
