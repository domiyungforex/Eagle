'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { CatalogProduct } from '@/lib/catalog';
export default function AdminDashboardContent() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch('/api/admin/products', { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) setProducts(data.products);
      })
      .catch(() => {
        if (active) setError('The dashboard could not be loaded.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-7">
        <header>
          <Link href="/" className="text-primary">
            ← Back to site
          </Link>
          <h1 className="mt-3 text-3xl font-extrabold">Admin Dashboard</h1>
        </header>
        <nav className="flex flex-wrap gap-4">
          <Link
            href="/admin/products"
            className="rounded-xl bg-primary px-6 py-3 font-bold text-white"
          >
            Manage Products
          </Link>
          <Link href="/admin/energy" className="rounded-xl border bg-white px-6 py-3 font-bold">
            Manage Energy Products
          </Link>
        </nav>
        {loading && <p role="status">Loading dashboard…</p>}
        {error && <p role="alert">{error}</p>}
        {!loading && !error && (
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Products', value: products.length },
              { label: 'Published', value: products.filter((p) => p.isActive).length },
              { label: 'Out of stock', value: products.filter((p) => !p.inStock).length },
            ].map((item) => (
              <div className="rounded-2xl border bg-white p-6" key={item.label}>
                <p className="text-muted-foreground">{item.label}</p>
                <p className="text-3xl font-bold">{item.value}</p>
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
