# Admin-managed combo cards with images

The two cards on the home page ("Pooja Combo", "Monthly Staples") are currently hardcoded in the app, which is why they don't appear anywhere in the admin panel. This makes them manageable from the admin, with image upload.

## What you'll get

- A new **Combos** tab in Admin → Banners, alongside Home / Offers / Coupons / Brands.
- Each combo card has: title, subtitle, image, link (category), sort order, active toggle — same form and image uploader already used for banners.
- On the home page the combo cards render from the database. When a combo has an image, it shows as the card background with a readable dark overlay; without an image it falls back to the current marigold/green gradient look.
- If no combos exist yet, the current two hardcoded cards still show, so the home page never looks empty.
- Adding more than two combos keeps the responsive grid (2 columns on mobile, 4 on desktop).

## Technical notes

- Migration: extend the `banners.placement` allowed values to include `combos` (check constraint update only, no new table). Seed the two existing combo cards as rows so they're editable right away.
- `src/lib/storefront.functions.ts`: allow `combos` in the placement validator; add combos to the home payload.
- `src/routes/admin/banners.tsx`: add `combos` to `PLACEMENTS`.
- `src/components/home-sections.tsx`: `OfferCards` reads combos from the storefront data, falls back to `OFFER_CARDS` from `src/lib/mock-content.ts`.
- `docs/BACKEND_DJANGO_API.md`: document the `combos` placement.
