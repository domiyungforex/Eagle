import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/lib/catalog.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022 },
}).outputText;
const { validateProduct } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`
);
const fixture = {
  id: 'verification-product',
  name: 'Verification Product',
  brand: 'Verification',
  category: 'smartphones',
  price: 10000,
  originalPrice: 12500,
  stockQuantity: 3,
  condition: 'used',
  isActive: true,
  description: 'Validation fixture.',
  images: [{ src: 'https://example.com/product.png', alt: 'Product' }],
  specs: [{ label: 'Storage', value: '256 GB' }],
};
assert.equal(validateProduct(fixture).discount, 20);
assert.equal(validateProduct({ ...fixture, stockQuantity: 0, inStock: true }).in_stock, false);
for (const condition of ['new', 'used', 'refurbished', 'repaired'])
  assert.equal(validateProduct({ ...fixture, condition }).condition, condition);
for (const patch of [
  { price: -1 },
  { price: 1.5 },
  { originalPrice: 100 },
  { stockQuantity: -1 },
  { stockQuantity: 1.5 },
  { condition: 'unknown' },
  { description: '' },
  { id: '../admin' },
  { images: [] },
  { images: [{ src: 'javascript:alert(1)', alt: '' }] },
  { images: [{ src: 'https://user:password@example.com/photo.jpg', alt: '' }] },
  { specs: [{ label: '', value: 'Bad' }] },
])
  assert.throws(() => validateProduct({ ...fixture, ...patch }));
console.log('PASS: product input validation, four conditions, stock rules and image URLs.');
if (process.env.TEST_BASE_URL) {
  const { createServerClient } = await import('@supabase/ssr');
  const cookies = new Map();
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (values) => values.forEach((c) => cookies.set(c.name, c.value)),
      },
    }
  );
  const login = await db.auth.signInWithPassword({
    email: process.env.ADMIN_TEST_EMAIL,
    password: process.env.ADMIN_TEST_PASSWORD,
  });
  if (login.error) throw new Error(login.error.message);
  assert.equal(login.data.user.app_metadata.role, 'admin');
  const check = await db.rpc('check_user_is_admin', { p_user_id: login.data.user.id });
  assert.equal(check.error, null);
  assert.equal(check.data, true);
  const base = process.env.TEST_BASE_URL;
  const cookie = [...cookies]
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join('; ');
  const request = (path, method = 'GET', body, authorized = true, origin) =>
    fetch(base + path, {
      method,
      redirect: 'manual',
      headers: {
        ...(authorized ? { Cookie: cookie } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  assert.equal((await request('/api/admin/products', 'GET', null, false)).status, 401);
  assert.equal(
    (await request('/api/admin/products', 'POST', fixture, true, 'https://foreign.example')).status,
    403
  );
  assert.equal(
    (await request('/api/admin/products', 'POST', { ...fixture, price: -1 })).status,
    400
  );
  const response = await request('/api/admin/products');
  assert.equal(response.status, 200);
  const inventory = await response.json();
  const product = {
    ...fixture,
    id: `verification-${crypto.randomUUID()}`,
    category: inventory.categories[0].id,
    isActive: false,
  };
  let created = false;
  let uploaded;
  try {
    const result = await request('/api/admin/products', 'POST', product);
    assert.equal(result.status, 200, await result.text());
    created = true;
    assert.equal((await request(`/products/${product.id}`, 'GET', null, false)).status, 404);
    product.isActive = true;
    product.description = 'Verified product details saved through administration.';
    assert.equal((await request('/api/admin/products', 'PATCH', product)).status, 200);
    const catalog = await (await request('/api/catalog', 'GET', null, false)).json();
    assert.equal(catalog.products.find((p) => p.id === product.id).condition, 'used');
    const page = await request(`/products/${product.id}`, 'GET', null, false);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Verified product details saved through administration/);
    product.stockQuantity = 0;
    product.condition = 'repaired';
    assert.equal((await request('/api/admin/products', 'PATCH', product)).status, 200);
    const updated = await (await request('/api/catalog', 'GET', null, false)).json();
    assert.equal(updated.products.find((p) => p.id === product.id).inStock, false);
    assert.equal((await request('/admin/products', 'GET', null, false)).status, 307);
    assert.equal((await request('/admin/products')).status, 200);
    for (const p of catalog.products) {
      const page = await request(`/products/${encodeURIComponent(p.id)}`, 'GET', null, false);
      assert.equal(page.status, 200, p.id);
      assert.ok((await page.text()).includes(p.name.replaceAll('&', '&amp;')), p.name);
    }
    for (const p of catalog.energy)
      assert.equal(
        (await request(`/energy/${encodeURIComponent(p.id)}`, 'GET', null, false)).status,
        200,
        p.id
      );
    const form = new FormData();
    form.set(
      'file',
      new Blob(
        [
          Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jh4kAAAAASUVORK5CYII=',
            'base64'
          ),
        ],
        { type: 'image/png' }
      ),
      'verification.png'
    );
    const upload = await fetch(base + '/api/admin/uploads', {
      method: 'POST',
      headers: { Cookie: cookie },
      body: form,
    });
    assert.equal(upload.status, 200, await upload.clone().text());
    const info = await upload.json();
    uploaded = decodeURIComponent(new URL(info.url).pathname.split('/').pop());
    assert.equal((await fetch(info.url)).status, 200);
    product.isActive = false;
    assert.equal((await request('/api/admin/products', 'PATCH', product)).status, 200);
    assert.equal((await request(`/products/${product.id}`, 'GET', null, false)).status, 404);
    assert.equal((await request('/products/does-not-exist', 'GET', null, false)).status, 404);
    const legacy = await request('/product-detail?id=macbook-air-m3', 'GET', null, false);
    assert.equal(legacy.status, 307);
    assert.equal(legacy.headers.get('location'), '/products/macbook-air-m3');
    console.log(
      'PASS: admin login, access control, create/edit/publish/unpublish/stock, all catalog detail pages, upload and legacy redirects.'
    );
  } finally {
    if (created) {
      const removed = await request(`/api/admin/products?id=${product.id}`, 'DELETE');
      assert.equal(removed.status, 200, 'Verification product cleanup failed');
    }
    if (uploaded) {
      const removed = await db.storage.from('product-images').remove([uploaded]);
      assert.equal(removed.error, null, 'Verification image cleanup failed');
    }
    await db.auth.signOut();
    console.log('PASS: verification product and image cleanup.');
  }
}
