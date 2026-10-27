import { NextResponse } from 'next/server';
import { publicDatabase } from '@/lib/publicCatalog';
import { mapProduct } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export async function GET() {
  const db = publicDatabase();
  const [products, categories, energy, subcategories] = await Promise.all([
    db.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false }),
    db.from('categories').select('*').eq('is_active', true).order('sort_order'),
    db.from('energy_products').select('*').order('created_at', { ascending: false }),
    db.from('energy_subcategories').select('*').eq('is_active', true).order('sort_order'),
  ]);
  if ([products, categories, energy, subcategories].some((result) => result.error))
    return NextResponse.json(
      { error: 'The catalog could not be loaded. Please try again.' },
      { status: 503 }
    );
  const mapped = (products.data || []).map(mapProduct);
  return NextResponse.json(
    {
      products: mapped,
      categories: (categories.data || []).map((c) => ({
        ...c,
        count: mapped.filter((p) => p.category === c.id).length,
      })),
      energy: (energy.data || []).map((p) => ({
        ...p,
        stockQuantity: p.stock_quantity,
        subcategory: p.subcategory_id,
        originalPrice: p.original_price,
        searchKeywords: p.search_keywords || [],
        relatedIds: p.related_ids || [],
      })),
      subcategories: [{ id: 'all', name: 'All Energy Products' }, ...(subcategories.data || [])],
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
