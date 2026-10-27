'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CONDITION_LABELS, type CatalogProduct } from '@/lib/catalog';
import { useCatalog } from '@/lib/catalogContext';
import { useCart } from '@/lib/cartContext';
import { formatPrice, getWhatsAppLink } from '@/lib/data';
import AppImage from '@/components/ui/AppImage';
import ProductCard from '@/components/ProductCard';
export default function ProductDetailContent({ product }: { product: CatalogProduct }) {
  const { products, categories } = useCatalog();
  const { addItem } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [added, setAdded] = useState(false);
  const available =
    product.inStock && (product.stockQuantity === null || product.stockQuantity > 0);
  const limit = Math.min(50, product.stockQuantity ?? 50);
  function add(checkout = false) {
    if (!available) return;
    for (let i = 0; i < quantity; i++)
      addItem({
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image: product.image,
        alt: product.alt,
      });
    setAdded(true);
    if (checkout) router.push('/checkout');
  }
  return (
    <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-16">
      <nav
        aria-label="Breadcrumb"
        className="mb-8 flex flex-wrap gap-2 text-sm text-muted-foreground"
      >
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/shop">Shop</Link>
        <span>/</span>
        <Link href={`/shop?category=${encodeURIComponent(product.category)}`}>
          {categories.find((c) => c.id === product.category)?.name || product.category}
        </Link>
        <span>/</span>
        <span>{product.name}</span>
      </nav>
      <div className="mb-12 grid gap-8 lg:grid-cols-2 lg:gap-16">
        <section aria-label="Product images">
          <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
            <AppImage
              key={product.images[selectedImage].src}
              src={product.images[selectedImage].src}
              alt={product.images[selectedImage].alt}
              fill
              priority
              sizes="(max-width:1024px) 100vw,50vw"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-auto">
              {product.images.map((image, index) => (
                <button
                  key={`${index}-${image.src}`}
                  aria-label={`View image ${index + 1}`}
                  aria-pressed={index === selectedImage}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border"
                  onClick={() => setSelectedImage(index)}
                >
                  <AppImage src={image.src} alt={image.alt} fill />
                </button>
              ))}
            </div>
          )}
        </section>
        <section>
          <p className="mb-2 text-sm font-bold uppercase tracking-wider text-primary">
            {product.brand}
          </p>
          <h1 className="mb-4 text-3xl font-extrabold">{product.name}</h1>
          <p className="mb-4 font-semibold">Condition: {CONDITION_LABELS[product.condition]}</p>
          <div className="mb-3 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-extrabold">{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span className="text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <p className={`mb-5 font-semibold ${available ? 'text-green-700' : 'text-red-600'}`}>
            {available ? 'In Stock' : 'Out of Stock'}
            {product.stockQuantity !== null && available
              ? ` — ${product.stockQuantity} available`
              : ''}
          </p>
          <p className="mb-6 whitespace-pre-wrap text-muted-foreground">
            {product.description || 'Contact EaglesTech for more information about this product.'}
          </p>
          <div className="mb-5 flex items-center gap-4">
            <span>Quantity:</span>
            <button
              aria-label="Decrease quantity"
              className="rounded-lg border px-4 py-2"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
            >
              −
            </button>
            <span>{quantity}</span>
            <button
              aria-label="Increase quantity"
              className="rounded-lg border px-4 py-2 disabled:opacity-40"
              onClick={() => setQuantity((q) => Math.min(limit, q + 1))}
              disabled={!available || quantity >= limit}
            >
              +
            </button>
          </div>
          <div className="mb-5 flex flex-wrap gap-3">
            <button
              disabled={!available}
              onClick={() => add()}
              className="rounded-xl bg-primary px-8 py-3 font-bold text-white disabled:opacity-40"
            >
              {added ? 'Added to Cart!' : 'Add to Cart'}
            </button>
            <button
              disabled={!available}
              onClick={() => add(true)}
              className="rounded-xl border border-primary px-8 py-3 font-bold text-primary disabled:opacity-40"
            >
              Buy Now
            </button>
          </div>
          <a
            className="font-semibold text-green-700"
            target="_blank"
            rel="noopener noreferrer"
            href={getWhatsAppLink(`Hi EaglesTech, I need help with ${product.name}.`)}
          >
            Ask about this product on WhatsApp
          </a>
          {product.warranty && (
            <p className="mt-6 rounded-xl bg-muted p-4">
              <strong>Warranty:</strong> {product.warranty}
            </p>
          )}
        </section>
      </div>
      <section className="mb-12">
        <h2 className="mb-4 text-xl font-bold">Product Details & Specifications</h2>
        <dl className="max-w-3xl overflow-hidden rounded-2xl border">
          {[
            { label: 'Brand', value: product.brand },
            { label: 'Condition', value: CONDITION_LABELS[product.condition] },
            ...product.specs,
          ].map((spec, index) => (
            <div
              key={`${index}-${spec.label}`}
              className="grid grid-cols-2 gap-3 border-b px-5 py-4 even:bg-muted"
            >
              <dt className="font-semibold">{spec.label}</dt>
              <dd>{spec.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section>
        <h2 className="mb-5 text-xl font-bold">Related Products</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {products
            .filter((p) => p.category === product.category && p.id !== product.id)
            .slice(0, 4)
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      </section>
    </div>
  );
}
