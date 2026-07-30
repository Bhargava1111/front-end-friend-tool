## Verified current state

- `/categories` is a plain grid, no filters. `/category/$slug` lists products in a grid with no filter or sort controls at all.
- `/search` has sort chips only — no filter sheet (price, discount, rating, in-stock, brand).
- `product_images` table exists and the product detail page already renders a gallery from it, but the admin product form only edits a single `image_url` and one `video_url`; product cards and category/search grids show one static image with no video hint.
- Home has banner slider, category rail, flash sale, 2 offer cards, coupon strip, brand rail and product rails. No secondary offer-banner carousels, no festival/deal-of-the-day blocks.

## 1. Category browsing: "see all" + filters

- Add a left category strip on `/category/$slug` (like the reference screenshot): vertical scroll of all categories with thumbnails, current one highlighted, tap to switch.
- Filter bar above the grid: chips for Brand, Price, Discount, Rating, In stock, plus a sliders icon that opens a full filter sheet (price range slider, brand multi-select, min discount, min rating, in-stock toggle) with Apply/Clear. Result count shown, active filters as removable chips.
- Sort sheet: Relevance, Price low→high, Price high→low, Discount, Newest.
- All filter + sort state lives in the URL search params so links are shareable and back works.
- `/categories` gets a search-within-categories field and a "See all products" tile.
- Reuse the same filter sheet component on `/search`.

## 2. Product media: multiple images + video

- Extend the product detail gallery so video is a slide inside the gallery (thumbnail with play badge) instead of a separate block below, with swipe between images and video.
- Product cards get a multi-image hint: image dots when a product has more than one image, plus a small video badge, and hover/tap cycles to the second image.
- Load gallery images for grid listings so cards can show these hints (one extra query joined into the catalog fetch).
- Admin product form: manage a list of gallery images (add URL, reorder, remove — writing to `product_images`) and multiple video URLs.

## 3. Home: offer banners + more sections

- Second offer-banner carousel mid-page (auto-scrolling, dot indicators) driven by banners marked as promotional.
- New sections: Deal of the Day (single hero product with countdown), Buy Again (from recently ordered), Under ₹99 store, Festival / Pooja Picks with tabbed sub-filters (like the Rakhi Picks reference), Combo & Bundle offers, Top-rated picks, Category-wise "Shop by need" tiles, and a bank/payment offers strip.
- Sticky "Unlock free delivery — shop ₹X more" progress bar above the bottom nav when a cart is active, plus a floating cart pill with item count and image.
- "Back to top" floating pill after scrolling past the first fold.

## Technical notes

- Filters resolve client-side over the category product list where the data set is small; the search route passes filters to the existing `searchProducts` server function with added params.
- Banner promo grouping uses an added nullable `placement` column on `banners` (migration), defaulting existing rows to `hero`, so the admin can decide which banners appear as offer strips.
- Deal of the Day / Under ₹99 / Top-rated derive from existing product data and the `reviews` table; Buy Again reads existing orders. Festival Picks tabs use category slugs, no new tables.
- New shared components: `filter-sheet.tsx`, `sort-sheet.tsx`, `category-side-rail.tsx`, `offer-banner-carousel.tsx`, `free-delivery-bar.tsx`, plus additions to `home-sections.tsx`.
