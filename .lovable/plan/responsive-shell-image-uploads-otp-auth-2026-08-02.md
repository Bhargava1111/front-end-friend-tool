# Responsive Shell, Image Uploads & OTP Auth

## What you get

1. **Full responsive app** — mobile keeps the current phone layout with bottom tabs; tablet/desktop gets a real wide layout (top header with nav + search, sticky category sidebar on listing pages, multi-column product grids, wide banners, footer). Admin panel also becomes desktop-first with a persistent sidebar.
2. **Image uploads everywhere in admin** — drag-and-drop / file picker with instant preview for banners, coupon banners, brand logo + banner, category images, product main image, product gallery (multiple), and product variant images. Pasting a URL still works as a fallback.
3. **Banner carousels driven by your uploads** — every banner strip (home hero, offers, coupons, brands) renders however many banners you upload (10+ scrolls smoothly), with swipe, dots, arrows on desktop, and per-placement ordering from admin.
4. **Auto-scroll fully removed** — product rails are manual swipe/scroll only, everywhere. The hero banner carousel keeps a slow slide (it can be turned off in admin settings).
5. **OTP login + register pages** — a single polished flow: phone/email entry → 6-digit OTP boxes → resend timer → success. Both modes are supported: real email OTP through Cloud auth, and simulated OTP (code `123456`) for phone/dev, switchable so it swaps cleanly to your Django backend later.
6. **Docs updated** — `docs/BACKEND_DJANGO_API.md` gets the new image-upload endpoints, banner placement fields, and the OTP request/verify contracts so your Django backend matches after you clone the repo.

## Technical details

**Storage**
- New public bucket `media` (folders: `banners/`, `brands/`, `coupons/`, `categories/`, `products/`, `variants/`).
- RLS on `storage.objects`: public read; insert/update/delete only for admins (`has_role`).
- New `<ImageUploadField>` component: client-side upload via the browser Supabase client, returns a public URL written into the existing `image_url` / `banner_url` / `logo_url` columns — no schema change needed for images.
- Product gallery uses the existing `product_images` table with a multi-file uploader plus drag-to-reorder.

**Responsive layout**
- `page-shell.tsx`: replace fixed `max-w-lg` with responsive container (`max-w-lg` on mobile, `max-w-6xl`/`max-w-7xl` from `md`).
- New `DesktopHeader` (logo, nav links, search, location, cart, account) rendered `md:` and up; `BottomNav` stays `md:hidden`.
- Home sections, product rails, category grids and coupon/brand cards get responsive grid variants instead of horizontal-only scroll on desktop.
- Product detail becomes two-column (gallery left, buy box right) on desktop; category page keeps sidebar + wider grid; cart/checkout become two-column.
- Admin routes get a persistent left sidebar on desktop, drawer on mobile, and tables switch from cards to real tables at `lg`.

**Banner carousel**
- Rewrite `banner-slider.tsx` as a reusable carousel: scroll-snap track, arrows on `md+`, dot/progress indicator that condenses when there are many slides, lazy image loading, `aria` labels.
- All placements (`home`, `offers`, `coupons`, `brands`) reuse it via the existing `getPlacementBanners` server fn.

**Auto-scroll**
- Delete `use-auto-scroll.ts` usage from `product-rail.tsx` and remove the `autoScroll` prop and all call-site usages.

**OTP auth**
- `/auth` rebuilt with tabs: Login / Register, each supporting Email OTP, Phone OTP, Password, and Google.
- Email OTP: `supabase.auth.signInWithOtp` (magic-code) + `verifyOtp`.
- Phone OTP: existing `demo_otp_codes` table + server fns for request/verify (code `123456` in demo mode), rate-limited and expiring.
- Shared `<OtpInput>` 6-box component, 30s resend cooldown, error states, `sonner` toasts.
- Register collects name + phone into `profiles`.

**Docs**
- `docs/BACKEND_DJANGO_API.md`: add `POST /api/media/upload`, banner placement/ordering fields, `POST /api/auth/otp/request`, `POST /api/auth/otp/verify`, register-with-OTP flow, and the product image/variant payload shapes.
