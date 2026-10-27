import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProduct } from '@/lib/publicCatalog';
import { CartProvider } from '@/lib/cartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductDetailContent from '@/app/product-detail/components/ProductDetailContent';
export const dynamic = 'force-dynamic';
interface Props {
  params: Promise<{ id: string }>;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).id);
  return product
    ? {
        title: `${product.name} | EaglesTech`,
        description: product.description.slice(0, 160),
        alternates: { canonical: `/products/${encodeURIComponent(product.id)}` },
        openGraph: { title: product.name, images: [{ url: product.image, alt: product.alt }] },
      }
    : { title: 'Product Not Found | EaglesTech' };
}
export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).id);
  if (!product) notFound();
  return (
    <CartProvider>
      <Header />
      <main className="min-h-screen bg-background pt-20">
        <ProductDetailContent key={product.id} product={product} />
      </main>
      <Footer />
    </CartProvider>
  );
}
