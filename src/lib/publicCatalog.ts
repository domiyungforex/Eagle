import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { cache } from 'react';
import { mapProduct } from './catalog';
export function publicDatabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) },
    }
  );
}
export const getProduct = cache(async (id: string) => {
  const { data, error } = await publicDatabase()
    .from('products')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw new Error('The product catalog could not be loaded. Please try again.');
  return data ? mapProduct(data) : null;
});
