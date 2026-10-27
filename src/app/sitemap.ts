import { MetadataRoute } from 'next';
import { publicDatabase } from '@/lib/publicCatalog';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://eaglestechh.vercel.app';
  const db = publicDatabase();
  const [products, energy] = await Promise.all([
    db.from('products').select('id,updated_at').eq('is_active', true),
    db.from('energy_products').select('id,updated_at'),
  ]);
  if (products.error || energy.error) throw new Error('The sitemap could not be generated.');
  return [
    { url: `${base}/`, priority: 1 },
    { url: `${base}/shop`, priority: 0.8 },
    { url: `${base}/energy`, priority: 0.8 },
    ...(products.data || []).map((p) => ({
      url: `${base}/products/${encodeURIComponent(p.id)}`,
      lastModified: p.updated_at,
      priority: 0.8,
    })),
    ...(energy.data || []).map((p) => ({
      url: `${base}/energy/${encodeURIComponent(p.id)}`,
      lastModified: p.updated_at,
      priority: 0.8,
    })),
  ];
}
