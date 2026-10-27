# EaglesTech product administration

## Implemented

- Existing storefront styling retained; shop, featured products, hero products, search, energy listings and category counts read the database.
- Every published product has a current detail page, with its gallery, description, condition, specifications, price and availability. Drafts and deleted products return 404.
- `/admin/products`: create, edit, publish/unpublish, permanently delete, stock quantity, stock status, price, original price, new/used/refurbished/repaired condition, images, warranty, specifications, badges and featured status.
- Category creation, renaming, images and visibility. Product condition is distinct from category.
- Existing energy editor retained and extended with condition and stock quantity.
- Admin routes verify the signed-in user on the server. Mutations require server-controlled `app_metadata.role = admin`; database RLS independently protects writes.
- The product photo bucket accepts PNG, JPEG and WebP up to 3 MB. Secret Supabase keys are not needed by the application.

## Configuration

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key) and `NEXT_PUBLIC_SITE_URL` in the existing Vercel project. The intended site URL is `https://eaglestechh.vercel.app`.

The product-administration migration was applied to project `lqebvezsavsyltlvyrsm` on October 17, 2026. Its source is retained in `supabase/migrations/20261016233919_product_administration.sql`. Review migration history before applying it elsewhere; it does not seed or replace products.

An existing dedicated administrator account was provisioned for the owner. Credentials are provided separately and are not included in source, archives or environment examples.

## Verification

- `npm ci`
- `npm run type-check`
- `npm run build` with the three public environment variables configured.
- `node scripts/verify-product-admin.mjs` for input and condition validation.
- For authenticated integration checks, supply `TEST_BASE_URL`, the two Supabase public variables, `ADMIN_TEST_EMAIL` and `ADMIN_TEST_PASSWORD` to the same script. It creates its own uniquely named verification product, exercises draft/publish/edit/stock/detail/unpublish/delete flows, checks all catalog detail URLs, uploads a temporary test image, and cleans up both records. Run only against an environment authorized for these checks.

Production build, type checking and live-database integration checks passed on October 21, 2026. Lint completed with legacy type/accessibility warnings. Browser interaction checks and production release are still pending access to the correct Vercel project and GitHub write permissions. This source archive is not proof of a deployment.
