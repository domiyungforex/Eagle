import { Metadata } from 'next';
import type { EnergyProduct } from '@/lib/data';
import { publicDatabase } from '@/lib/publicCatalog';
import { cache } from 'react';
export const dynamic = 'force-dynamic';
const getProduct = cache(async (id: string) => {
  const { data, error } = await publicDatabase()
    .from('energy_products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error('The energy catalog could not be loaded.');
  return data
    ? ({
        ...data,
        subcategory: data.subcategory_id,
        originalPrice: data.original_price,
        searchKeywords: data.search_keywords || [],
        relatedIds: data.related_ids || [],
        stockQuantity: data.stock_quantity,
      } as EnergyProduct)
    : null;
});
import EnergyProductDetailContent from './components/EnergyProductDetailContent';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: 'Product Not Found | EaglesTech' };
  return {
    title: `${product.name} | EaglesTech Energy`,
    description: product.description.slice(0, 160),
  };
}

export default async function EnergyProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  return <EnergyProductDetailContent product={product} />;
}
