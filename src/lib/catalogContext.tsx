'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CatalogProduct, CatalogCategory } from './catalog';
import type { EnergyProduct } from './data';
interface Catalog {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  energy: EnergyProduct[];
  subcategories: { id: string; name: string }[];
}
const empty: Catalog = { products: [], categories: [], energy: [], subcategories: [] };
const Context = createContext<
  Catalog & { loading: boolean; error: string; refresh: () => Promise<void> }
>({ ...empty, loading: true, error: '', refresh: async () => {} });
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [catalog, setCatalog] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/catalog', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCatalog(data);
      setError('');
    } catch {
      setError('The catalog could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return (
    <Context.Provider value={{ ...catalog, loading, error, refresh }}>{children}</Context.Provider>
  );
}
export const useCatalog = () => useContext(Context);
