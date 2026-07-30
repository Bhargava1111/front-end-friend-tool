## Goal

1. Rebuild the product detail page to match the reference screens (sticky header with share + cart badge, framed hero image, stock/discount chips, rating line, price with inline quantity stepper, trust tiles, Description, Benefits, Specifications grid, dual "Go to Cart" / "Add to Cart" bottom bar).
2. Add real pack-size variants (100 g, 250 g, 500 g, 1 kg, 500 ml, 1 L, custom) that customers pick on the product page and admins manage per product.

Today the "Pack size" chips on the product page are fake — they link to other products in the same category. Cart and orders only store `product_id`, so variants must be added to the data layer to work for real.

## Database (one migration)

New table `product_variants`: `product_id`, `label` (e.g. "500 g"), `unit` (g / kg / ml / l / pcs), `unit_value`, `price`, `mrp`, `stock`, `sku`, `image_url`, `is_default`, `is_active`, `sort_order`, timestamps + update trigger. Public read for active rows, admin write via `has_role`, with GRANTs for anon/authenticated/service_role.

New optional columns for the richer PDP + specs block: `products.benefits` (text array), `products.brand_name` is already available via `brands`, plus `products.shelf_life`, `products.origin`, `products.rating`, `products.rating_count`.

Cart/order linkage: `cart_items.variant_id` (nullable, unique per user+product+variant) and `order_items.variant_id` + `variant_label`, so historical orders keep the chosen pack.

## Customer side

- Product page loads variants; the selected variant drives price, MRP, discount %, stock text, gallery image and add-to-cart. First `is_default` (else cheapest active) is preselected. Deep-link support via `?variant=` search param.
- Pack-size chips become a real segmented selector grouped by unit, showing label + price + strikethrough MRP, disabled when out of stock.
- Sections in reference order: hero + wishlist heart overlay, chips row, title, weight, rating, price + stepper, trust tiles, Description, Benefits bullet list, Specifications 2-column grid (Brand, Weight, Shelf, Origin), then existing bundle / reviews / FAQ / related rails.
- Bottom bar: outline "Go to Cart" and filled "Add to Cart", pill quantity stepper, safe-area padding.
- Cart, checkout and order pages show the variant label under each item name; cart quantity/remove actions key off product + variant.
- Product cards and rails show the default variant's price and a "N sizes" hint when a product has multiple variants.

## Admin side

- Product editor gains a Variants manager: repeatable rows (label, unit, unit value, price, MRP, stock, SKU, image, active, default) with quick-add presets for 100 g / 250 g / 500 g / 1 kg / 200 ml / 500 ml / 1 L, drag-free sort ordering, and validation (one default, unique labels, price > 0).
- New Benefits, Shelf life and Origin fields in the same editor, feeding the PDP Specifications and Benefits blocks.
- Product list shows variant count and price range instead of a single price.

## Technical notes

- Variant CRUD goes through `src/lib/admin.functions.ts` server functions using the authenticated Supabase client (admin role check), mirroring the existing `product_images` sync pattern (delete + reinsert on save).
- `PRODUCT_COLUMNS` in `catalog.server.ts` extends with the new columns; a new `attachVariants` helper batches variant fetches for lists, same shape as `attachGalleries`.
- `src/lib/types.ts` gains a `ProductVariant` type and `variants?: ProductVariant[]` on `Product`; `CartLine` gains `variant`.
- Cart/order server functions in `shop.functions.ts` accept an optional `variantId` and resolve price/stock from the variant when present, falling back to the product for variant-less items so existing data keeps working.
- All colors stay on existing semantic tokens; no hardcoded color utilities.
