-- BRANDS
CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tagline text,
  logo_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.brands TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.brands TO authenticated;
GRANT ALL ON public.brands TO service_role;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brands public read" ON public.brands FOR SELECT TO anon, authenticated USING (is_active OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage brands" ON public.brands FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.products ADD COLUMN brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL;

-- COUPONS
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'percent',
  discount_value numeric NOT NULL DEFAULT 0,
  min_order numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons public read" ON public.coupons FOR SELECT TO anon, authenticated USING (is_active OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- REVIEWS
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  author_name text,
  rating integer NOT NULL DEFAULT 5,
  title text,
  body text,
  image_url text,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reviews_product_idx ON public.reviews(product_id);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (is_approved OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "own reviews insert" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reviews update" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reviews delete" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage reviews" ON public.reviews FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RETURN REQUESTS
CREATE TABLE public.order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_returns TO authenticated;
GRANT ALL ON public.order_returns TO service_role;
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own returns select" ON public.order_returns FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "own returns insert" ON public.order_returns FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins manage returns" ON public.order_returns FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER order_returns_updated_at BEFORE UPDATE ON public.order_returns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SETTINGS
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.app_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins manage settings" ON public.app_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ORDER EXTRAS
ALTER TABLE public.orders
  ADD COLUMN discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN coupon_code text,
  ADD COLUMN tax numeric NOT NULL DEFAULT 0,
  ADD COLUMN payment_method text NOT NULL DEFAULT 'cod',
  ADD COLUMN delivery_slot text;

-- SEED
INSERT INTO public.brands (name, slug, tagline, sort_order) VALUES
  ('Aashirvaad', 'aashirvaad', 'Atta & staples', 1),
  ('Cycle Pure', 'cycle-pure', 'Agarbatti & dhoop', 2),
  ('Nandini', 'nandini', 'Dairy & ghee', 3),
  ('24 Mantra', '24-mantra', 'Certified organic', 4),
  ('Tata Sampann', 'tata-sampann', 'Dals & spices', 5),
  ('Saffola', 'saffola', 'Cooking oils', 6);

INSERT INTO public.coupons (code, title, description, discount_type, discount_value, min_order, max_discount) VALUES
  ('FIRST100', '₹100 off your first order', 'Flat ₹100 off on orders above ₹399', 'flat', 100, 399, NULL),
  ('POOJA15', '15% off pooja essentials', 'Save 15% up to ₹150', 'percent', 15, 299, 150),
  ('FREESHIP', 'Free delivery', 'No delivery fee on orders above ₹249', 'free_shipping', 0, 249, NULL);

INSERT INTO public.app_settings (key, value) VALUES
  ('delivery_fee', '40'::jsonb),
  ('free_delivery_above', '499'::jsonb),
  ('tax_rate', '5'::jsonb),
  ('maintenance_mode', 'false'::jsonb),
  ('support_phone', '"+91 98400 12345"'::jsonb),
  ('support_email', '"care@srimahalakshmistores.in"'::jsonb);