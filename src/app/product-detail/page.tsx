import { redirect } from 'next/navigation';
export default async function LegacyProductPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  redirect(id ? `/products/${encodeURIComponent(id)}` : '/shop');
}
