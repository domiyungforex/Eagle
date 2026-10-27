export const CONDITIONS = ['new', 'used', 'refurbished', 'repaired'] as const;
export type Condition = (typeof CONDITIONS)[number];
export const CONDITION_LABELS: Record<Condition, string> = {
  new: 'New',
  used: 'Used',
  refurbished: 'Refurbished',
  repaired: 'Repaired / Fixed',
};
export interface CatalogProduct {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number | null;
  image: string;
  alt: string;
  discount: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  badge: string | null;
  featured: boolean;
  description: string;
  condition: Condition;
  stockQuantity: number | null;
  isActive: boolean;
  warranty: string;
  images: { src: string; alt: string }[];
  specs: { label: string; value: string }[];
}
export interface CatalogCategory {
  id: string;
  name: string;
  description: string;
  image: string;
  alt: string;
  count: number;
  is_active: boolean;
}
export function mapProduct(row: Record<string, any>): CatalogProduct {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand || '',
    category: row.category_id || '',
    price: Number(row.price),
    originalPrice: row.original_price == null ? null : Number(row.original_price),
    image: row.image || '/assets/images/no_image.png',
    alt: row.alt || row.name,
    discount: row.discount || 0,
    rating: Number(row.rating || 0),
    reviews: row.reviews || 0,
    inStock: row.in_stock && (row.stock_quantity == null || row.stock_quantity > 0),
    badge: row.badge,
    featured: row.featured,
    description: row.description || '',
    condition: row.condition || 'new',
    stockQuantity: row.stock_quantity ?? null,
    isActive: row.is_active ?? true,
    warranty: row.warranty || '',
    images: row.images?.length
      ? row.images
      : [{ src: row.image || '/assets/images/no_image.png', alt: row.alt || row.name }],
    specs: row.specs || [],
  };
}
export function validateProduct(input: Record<string, any>) {
  const text = (key: string, max: number, required = false) => {
    const value = typeof input[key] === 'string' ? input[key].trim() : '';
    if ((required && !value) || value.length > max) throw new Error(`Invalid ${key}.`);
    return value;
  };
  const id = text('id', 120, true);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id))
    throw new Error('Use lowercase letters, numbers and hyphens for the ID.');
  if (!CONDITIONS.includes(input.condition)) throw new Error('Choose a valid condition.');
  if (!Number.isSafeInteger(input.price) || input.price < 0)
    throw new Error('Enter a non-negative whole naira price.');
  if (
    input.originalPrice != null &&
    (!Number.isSafeInteger(input.originalPrice) || input.originalPrice < input.price)
  )
    throw new Error('Original price must be at least the selling price.');
  if (
    input.stockQuantity != null &&
    (!Number.isSafeInteger(input.stockQuantity) || input.stockQuantity < 0)
  )
    throw new Error('Stock must be a non-negative whole number.');
  if (!Array.isArray(input.images) || !input.images.length || input.images.length > 10)
    throw new Error('Add between 1 and 10 images.');
  for (const image of input.images) {
    if (
      !image ||
      typeof image.src !== 'string' ||
      image.src.length > 2000 ||
      !image.src.startsWith('https://') ||
      typeof image.alt !== 'string' ||
      image.alt.length > 300
    )
      throw new Error('Use valid HTTPS image URLs.');
    const url = new URL(image.src);
    if (url.username || url.password) throw new Error('Image URLs cannot contain credentials.');
  }
  if (
    !Array.isArray(input.specs) ||
    input.specs.length > 50 ||
    input.specs.some(
      (s) =>
        !s ||
        typeof s.label !== 'string' ||
        !s.label.trim() ||
        s.label.length > 100 ||
        typeof s.value !== 'string' ||
        !s.value.trim() ||
        s.value.length > 1000
    )
  )
    throw new Error('Each specification needs a name and value.');
  return {
    id,
    name: text('name', 200, true),
    brand: text('brand', 100, true),
    category_id: text('category', 120, true),
    description: text('description', 20000, true),
    price: input.price,
    original_price: input.originalPrice ?? null,
    discount: input.originalPrice
      ? Math.round(((input.originalPrice - input.price) / input.originalPrice) * 100)
      : 0,
    stock_quantity: input.stockQuantity ?? null,
    in_stock: input.stockQuantity == null ? input.inStock === true : input.stockQuantity > 0,
    condition: input.condition,
    is_active: input.isActive === true,
    featured: input.featured === true,
    badge: text('badge', 60) || null,
    warranty: text('warranty', 1000),
    images: input.images,
    image: input.images[0].src,
    alt: input.images[0].alt || input.name,
    specs: input.specs,
  };
}
