ALTER TABLE public.banners
  ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL;

ALTER TABLE public.banners
  ADD CONSTRAINT banners_placement_check CHECK (placement IN ('home','offers','coupons','brands'));

ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS banner_url text;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS banner_url text;

CREATE INDEX IF NOT EXISTS banners_placement_idx ON public.banners (placement, sort_order);