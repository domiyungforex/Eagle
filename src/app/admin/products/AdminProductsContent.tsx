'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CONDITIONS,
  CONDITION_LABELS,
  type CatalogProduct,
  type CatalogCategory,
} from '@/lib/catalog';
import { useCatalog } from '@/lib/catalogContext';
import { formatPrice } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';
const input = 'mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm';
const button = 'rounded-xl bg-primary px-5 py-2.5 font-semibold text-white disabled:opacity-50';
type Form = Omit<CatalogProduct, 'rating' | 'reviews' | 'discount' | 'image' | 'alt'>;
const blank = (): Form => ({
  id: '',
  name: '',
  brand: '',
  category: '',
  price: 0,
  originalPrice: null,
  inStock: false,
  stockQuantity: 0,
  condition: 'new',
  description: '',
  warranty: '',
  badge: null,
  featured: false,
  isActive: false,
  images: [],
  specs: [],
});
async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { cache: 'no-store', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The action failed.');
  return data;
}
export default function AdminProductsContent() {
  const { refresh } = useCatalog();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [editing, setEditing] = useState(false);
  const [images, setImages] = useState('');
  const [specs, setSpecs] = useState('');
  const [query, setQuery] = useState('');
  const [condition, setCondition] = useState('all');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<CatalogProduct | null>(null);
  const [category, setCategory] = useState({
    id: '',
    name: '',
    image: '',
    description: '',
    is_active: true,
  });
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/products');
      setProducts(data.products);
      setCategories(data.categories);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function edit(product?: CatalogProduct) {
    setEditing(!!product);
    setForm(product || blank());
    setImages(product?.images.map((i) => i.src).join('\n') || '');
    setSpecs(product?.specs.map((s) => `${s.label}: ${s.value}`).join('\n') || '');
    setMessage('');
    setError('');
  }
  async function action(work: () => Promise<void>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
      setMessage(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The action failed.');
    } finally {
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    await action(async () => {
      const parsed = specs
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => {
          const split = line.indexOf(':');
          if (split < 1 || !line.slice(split + 1).trim())
            throw new Error('Use Name: Value for each specification.');
          return { label: line.slice(0, split).trim(), value: line.slice(split + 1).trim() };
        });
      await api('/api/admin/products', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          images: images
            .split('\n')
            .filter((line) => line.trim())
            .map((src) => ({ src: src.trim(), alt: form.name })),
          specs: parsed,
        }),
      });
      await load();
      await refresh();
      setForm(null);
    }, 'Product saved. Published changes are available in the store.');
  }
  const visible = products.filter(
    (p) =>
      (condition === 'all' || condition === p.condition) &&
      `${p.name} ${p.brand} ${p.id}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/admin" className="text-sm text-primary">
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-extrabold">Product Administration</h1>
            <p className="text-muted-foreground">
              Products, categories, stock and product details.
            </p>
          </div>
          <nav className="flex flex-wrap gap-3">
            <Link href="/shop" className="rounded-xl border bg-white px-4 py-3">
              View store
            </Link>
            <Link href="/admin/energy" className="rounded-xl border bg-white px-4 py-3">
              Energy products
            </Link>
            <button className={button} onClick={() => edit()}>
              Add product
            </button>
          </nav>
        </header>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">
            {message}
          </p>
        )}
        {deleting && (
          <section
            className="rounded-2xl border border-red-300 bg-white p-5"
            aria-label="Confirm product deletion"
          >
            <h2 className="font-bold">Delete {deleting.name}?</h2>
            <p className="my-3 text-sm">
              This permanently removes the product. To hide it instead, turn off Published in the
              editor.
            </p>
            <div className="flex gap-4">
              <button
                className="rounded-xl bg-red-600 px-4 py-2 text-white"
                disabled={busy}
                onClick={() =>
                  void action(async () => {
                    await api(`/api/admin/products?id=${encodeURIComponent(deleting.id)}`, {
                      method: 'DELETE',
                    });
                    setDeleting(null);
                    await load();
                    await refresh();
                  }, 'Product deleted.')
                }
              >
                Delete permanently
              </button>
              <button disabled={busy} onClick={() => setDeleting(null)}>
                Cancel deletion
              </button>
            </div>
          </section>
        )}
        {form && (
          <section className="rounded-2xl border bg-white p-5 md:p-8">
            <h2 className="mb-5 text-xl font-bold">{editing ? 'Edit product' : 'Add product'}</h2>
            <form onSubmit={save} className="grid gap-5 md:grid-cols-2">
              <label>
                Product name
                <input
                  className={input}
                  maxLength={200}
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                      id: editing
                        ? form.id
                        : e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-|-$/g, ''),
                    })
                  }
                />
              </label>
              <label>
                Product ID
                <input
                  className={input}
                  maxLength={120}
                  required
                  readOnly={editing}
                  pattern="[a-z0-9][a-z0-9-]*"
                  value={form.id}
                  onChange={(e) => setForm({ ...form, id: e.target.value })}
                />
              </label>
              <label>
                Brand
                <input
                  className={input}
                  maxLength={100}
                  required
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </label>
              <label>
                Category
                <select
                  className={input}
                  required
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Choose category</option>
                  {categories
                    .filter((c) => c.is_active || c.id === form.category)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Condition
                <select
                  className={input}
                  value={form.condition}
                  onChange={(e) =>
                    setForm({ ...form, condition: e.target.value as CatalogProduct['condition'] })
                  }
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>
                      {CONDITION_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Stock quantity
                <input
                  className={input}
                  type="number"
                  min={0}
                  step={1}
                  placeholder="Leave blank if not tracked"
                  value={form.stockQuantity ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stockQuantity: e.target.value === '' ? null : Number(e.target.value),
                      inStock: Number(e.target.value) > 0,
                    })
                  }
                />
              </label>
              {form.stockQuantity === null && (
                <label>
                  <input
                    type="checkbox"
                    checked={form.inStock}
                    onChange={(e) => setForm({ ...form, inStock: e.target.checked })}
                  />{' '}
                  Available to order
                </label>
              )}
              <label>
                Selling price (₦)
                <input
                  className={input}
                  type="number"
                  min={0}
                  step={1}
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </label>
              <label>
                Original price (₦, optional)
                <input
                  className={input}
                  type="number"
                  min={form.price}
                  step={1}
                  value={form.originalPrice ?? ''}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      originalPrice: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="md:col-span-2">
                Description
                <textarea
                  className={input}
                  required
                  maxLength={20000}
                  rows={5}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>
              <label className="md:col-span-2">
                Image URLs (HTTPS, one per line; first is the cover)
                <textarea
                  className={input}
                  required
                  rows={3}
                  value={images}
                  onChange={(e) => setImages(e.target.value)}
                />
              </label>
              <label>
                Upload image (PNG, JPEG or WebP, max 3 MB)
                <input
                  className={input}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file)
                      void action(async () => {
                        const body = new FormData();
                        body.set('file', file);
                        const result = await api('/api/admin/uploads', { method: 'POST', body });
                        setImages((text) => [text, result.url].filter(Boolean).join('\n'));
                      }, 'Image uploaded. Save the product to apply it.');
                  }}
                />
              </label>
              <label>
                Warranty
                <input
                  className={input}
                  maxLength={1000}
                  value={form.warranty}
                  onChange={(e) => setForm({ ...form, warranty: e.target.value })}
                />
              </label>
              <label className="md:col-span-2">
                Specifications (one per line: Name: Value)
                <textarea
                  className={input}
                  rows={4}
                  value={specs}
                  onChange={(e) => setSpecs(e.target.value)}
                />
              </label>
              <label>
                Badge
                <input
                  className={input}
                  maxLength={60}
                  value={form.badge || ''}
                  onChange={(e) => setForm({ ...form, badge: e.target.value || null })}
                />
              </label>
              <div className="flex items-center gap-5">
                <label>
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                  />{' '}
                  Featured
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  />{' '}
                  Published
                </label>
              </div>
              <div className="flex gap-4 md:col-span-2">
                <button className={button} disabled={busy}>
                  {busy ? 'Saving…' : 'Save product'}
                </button>
                <button disabled={busy} type="button" onClick={() => setForm(null)}>
                  Cancel edit
                </button>
              </div>
            </form>
          </section>
        )}
        <section className="rounded-2xl border bg-white p-5">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <h2 className="mr-auto text-xl font-bold">Products ({products.length})</h2>
            <input
              aria-label="Search products"
              className="rounded-xl border p-2"
              placeholder="Search products"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Filter by condition"
              className="rounded-xl border p-2"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="all">All conditions</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABELS[c]}
                </option>
              ))}
            </select>
            <button disabled={busy || loading} onClick={() => void load()}>
              Refresh
            </button>
          </div>
          {loading ? (
            <p role="status">Loading products…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="p-3">Product</th>
                    <th>Condition</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Visibility</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-3 font-semibold">
                        {p.name}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {p.brand}
                        </span>
                      </td>
                      <td className="p-3">{CONDITION_LABELS[p.condition]}</td>
                      <td className="whitespace-nowrap p-3">{formatPrice(p.price)}</td>
                      <td className="p-3">
                        {p.stockQuantity ?? (p.inStock ? 'Available' : 'Out of stock')}
                      </td>
                      <td className="p-3">{p.isActive ? 'Published' : 'Draft'}</td>
                      <td className="p-3">
                        <div className="flex gap-4">
                          <button className="text-primary" disabled={busy} onClick={() => edit(p)}>
                            Edit<span className="sr-only"> {p.name}</span>
                          </button>
                          {p.isActive && (
                            <Link href={`/products/${encodeURIComponent(p.id)}`}>View</Link>
                          )}
                          <button
                            className="text-red-600"
                            disabled={busy}
                            onClick={() => setDeleting(p)}
                          >
                            Delete<span className="sr-only"> {p.name}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && <p className="py-6">No matching products.</p>}
            </div>
          )}
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-3 text-xl font-bold">Categories</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Categories group products; new, used, refurbished and repaired are separate conditions.
          </p>
          <div className="mb-5 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c.id}
                className="rounded-full border px-3 py-2 text-sm"
                onClick={() =>
                  setCategory({
                    id: c.id,
                    name: c.name,
                    image: c.image || '',
                    description: c.description || '',
                    is_active: c.is_active,
                  })
                }
              >
                {c.name}
                {c.is_active ? '' : ' (hidden)'}
              </button>
            ))}
          </div>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                await api('/api/admin/categories', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(category),
                });
                await load();
                await refresh();
                setCategory({ id: '', name: '', image: '', description: '', is_active: true });
              }, 'Category saved.');
            }}
          >
            <label>
              Category ID
              <input
                className={input}
                required
                value={category.id}
                onChange={(e) => setCategory({ ...category, id: e.target.value })}
              />
            </label>
            <label>
              Category name
              <input
                className={input}
                required
                maxLength={100}
                value={category.name}
                onChange={(e) => setCategory({ ...category, name: e.target.value })}
              />
            </label>
            <label>
              Category image URL
              <input
                className={input}
                type="url"
                value={category.image}
                onChange={(e) => setCategory({ ...category, image: e.target.value })}
              />
            </label>
            <label>
              Description
              <input
                className={input}
                maxLength={2000}
                value={category.description}
                onChange={(e) => setCategory({ ...category, description: e.target.value })}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={category.is_active}
                onChange={(e) => setCategory({ ...category, is_active: e.target.checked })}
              />{' '}
              Visible in navigation
            </label>
            <button className={button} disabled={busy}>
              Save category
            </button>
          </form>
        </section>
        <section className="rounded-2xl border bg-white p-5">
          <h2 className="mb-4 text-xl font-bold">Change admin password</h2>
          <form
            className="grid gap-4 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              void action(async () => {
                if (password.length < 12 || password !== confirmation)
                  throw new Error('Use at least 12 characters and matching passwords.');
                const result = await createClient().auth.updateUser({ password });
                if (result.error) throw result.error;
                setPassword('');
                setConfirmation('');
              }, 'Password updated.');
            }}
          >
            <label>
              New password
              <input
                className={input}
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Confirm password
              <input
                className={input}
                type="password"
                autoComplete="new-password"
                minLength={12}
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
            <button className={`${button} self-end`} disabled={busy}>
              Update password
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
