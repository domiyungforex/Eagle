-- Applied to EaglesTech on 2026-10-17; restored after workspace maintenance.
BEGIN;
ALTER TABLE public.products
 ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'new' CHECK (condition IN ('new','used','refurbished','repaired')),
 ADD COLUMN IF NOT EXISTS stock_quantity integer CHECK (stock_quantity >= 0),
 ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
 ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(images) = 'array'),
 ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(specs) = 'array'),
 ADD COLUMN IF NOT EXISTS warranty text NOT NULL DEFAULT '';
ALTER TABLE public.energy_products
 ADD COLUMN IF NOT EXISTS condition text NOT NULL DEFAULT 'new' CHECK (condition IN ('new','used','refurbished','repaired')),
 ADD COLUMN IF NOT EXISTS stock_quantity integer CHECK (stock_quantity >= 0);
CREATE OR REPLACE FUNCTION public.is_admin_user() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT auth.uid() IS NOT NULL AND COALESCE(auth.jwt()->'app_metadata'->>'role','') = 'admin' $$;
CREATE OR REPLACE FUNCTION public.check_user_is_admin(p_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT p_user_id = auth.uid() AND public.is_admin_user() $$;
REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_user_is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_get_all_orders() RETURNS SETOF json LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 IF NOT public.is_admin_user() THEN RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501'; END IF;
 RETURN QUERY SELECT row_to_json(t) FROM (
  SELECT o.*, COALESCE((SELECT json_agg(oi.*) FROM public.order_items oi WHERE oi.order_id = o.id),'[]'::json) AS order_items
  FROM public.orders o ORDER BY o.created_at DESC
 ) t;
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_all_orders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_all_orders() TO authenticated;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_read_products ON public.products;
CREATE POLICY public_read_products ON public.products FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS admin_manage_products ON public.products;
CREATE POLICY admin_manage_products ON public.products FOR ALL TO authenticated USING ((SELECT public.is_admin_user())) WITH CHECK ((SELECT public.is_admin_user()));
DROP POLICY IF EXISTS users_manage_own_profile ON public.user_profiles;
CREATE POLICY users_manage_own_profile ON public.user_profiles FOR ALL TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id AND role = 'customer');
GRANT SELECT ON public.products, public.categories, public.energy_products, public.energy_subcategories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products, public.categories, public.energy_products, public.energy_subcategories TO authenticated;
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types) VALUES ('product-images','product-images',true,3145728,ARRAY['image/png','image/jpeg','image/webp']) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS product_images_admin_insert ON storage.objects;
CREATE POLICY product_images_admin_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND (SELECT public.is_admin_user()));
DROP POLICY IF EXISTS product_images_admin_select ON storage.objects;
CREATE POLICY product_images_admin_select ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'product-images' AND (SELECT public.is_admin_user()));
DROP POLICY IF EXISTS product_images_admin_update ON storage.objects;
CREATE POLICY product_images_admin_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND (SELECT public.is_admin_user())) WITH CHECK (bucket_id = 'product-images' AND (SELECT public.is_admin_user()));
DROP POLICY IF EXISTS product_images_admin_delete ON storage.objects;
CREATE POLICY product_images_admin_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND (SELECT public.is_admin_user()));
COMMIT;
