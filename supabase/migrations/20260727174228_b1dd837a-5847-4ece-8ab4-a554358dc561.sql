-- ENUMS
CREATE TYPE public.order_status AS ENUM ('pending','confirmed','packed','delivered','cancelled');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, avatar_url)
  VALUES (NEW.id,
          NEW.raw_user_meta_data ->> 'full_name',
          NEW.raw_user_meta_data ->> 'phone',
          NEW.raw_user_meta_data ->> 'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ADDRESSES
CREATE TABLE public.addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Home',
  recipient_name text NOT NULL,
  phone text NOT NULL,
  line1 text NOT NULL,
  line2 text,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.addresses TO authenticated;
GRANT ALL ON public.addresses TO service_role;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CATEGORIES
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  image_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon, authenticated USING (is_active);

-- BANNERS
CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  image_url text NOT NULL,
  link_slug text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banners public read" ON public.banners FOR SELECT TO anon, authenticated USING (is_active);

-- PRODUCTS
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  weight text,
  price numeric(10,2) NOT NULL,
  mrp numeric(10,2),
  stock int NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_best_seller boolean NOT NULL DEFAULT false,
  is_recommended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (is_active);
CREATE TRIGGER products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX products_category_idx ON public.products(category_id);

-- PRODUCT IMAGES
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product images public read" ON public.product_images FOR SELECT TO anon, authenticated USING (true);

-- CART
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER cart_items_updated_at BEFORE UPDATE ON public.cart_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- WISHLIST
CREATE TABLE public.wishlist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist" ON public.wishlist_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ORDERS
CREATE SEQUENCE public.order_number_seq START 1001;
GRANT USAGE, SELECT ON SEQUENCE public.order_number_seq TO authenticated, service_role;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_number text NOT NULL UNIQUE DEFAULT ('MNX-' || nextval('public.order_number_seq')),
  status public.order_status NOT NULL DEFAULT 'pending',
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  recipient_name text NOT NULL,
  phone text NOT NULL,
  address_text text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders select" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own orders cancel" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'pending') WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  product_weight text,
  image_url text,
  unit_price numeric(10,2) NOT NULL,
  quantity int NOT NULL,
  line_total numeric(10,2) NOT NULL
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own order items select" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "own order items insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- SEED CATEGORIES
INSERT INTO public.categories (name, slug, description, image_url, sort_order) VALUES
('Pooja Essentials','pooja-essentials','Everything for your daily rituals','https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1a1?w=600&q=80',1),
('Rice & Grains','rice-grains','Premium rice, millets and grains','https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&q=80',2),
('Dals & Pulses','dals-pulses','Everyday dals and pulses','https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80',3),
('Oils & Ghee','oils-ghee','Cold pressed oils and pure ghee','https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&q=80',4),
('Spices & Masala','spices-masala','Freshly ground spices','https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80',5),
('Dry Fruits','dry-fruits','Premium nuts and dry fruits','https://images.unsplash.com/photo-1508747703725-719777637510?w=600&q=80',6),
('Snacks & Sweets','snacks-sweets','Traditional snacks and sweets','https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=600&q=80',7),
('Puja Flowers & Garlands','puja-flowers','Fresh flowers and garlands','https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=600&q=80',8);

-- SEED BANNERS
INSERT INTO public.banners (title, subtitle, image_url, link_slug, sort_order) VALUES
('Festive Pooja Store','Up to 30% off on all pooja essentials','https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1a1?w=1200&q=80','pooja-essentials',1),
('Fresh From The Farm','Premium rice & grains delivered daily','https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200&q=80','rice-grains',2),
('Pure Cold-Pressed Oils','Traditional wood-pressed goodness','https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=1200&q=80','oils-ghee',3);

-- SEED PRODUCTS
INSERT INTO public.products (category_id, name, slug, description, weight, price, mrp, stock, image_url, is_featured, is_best_seller, is_recommended)
SELECT c.id, v.name, v.slug, v.description, v.weight, v.price, v.mrp, v.stock, v.image_url, v.feat, v.best, v.rec
FROM (VALUES
('pooja-essentials','Pure Cow Ghee Diya Oil','pure-cow-ghee-diya-oil','Ready-to-use cow ghee for lamps, made from A2 milk.','500 ml',349,449,40,'https://images.unsplash.com/photo-1610725664285-7c57e6355d10?w=800&q=80',true,true,true),
('pooja-essentials','Sandalwood Agarbatti Pack','sandalwood-agarbatti','Hand-rolled sandalwood incense sticks, long lasting fragrance.','100 g',99,149,120,'https://images.unsplash.com/photo-1602928321679-560bb453f190?w=800&q=80',true,false,true),
('pooja-essentials','Camphor Tablets (Kapur)','camphor-tablets','Pure white camphor tablets for aarti and havan.','100 g',129,159,80,'https://images.unsplash.com/photo-1600189261867-30e5ffe7b8da?w=800&q=80',false,true,false),
('pooja-essentials','Brass Puja Thali Set','brass-puja-thali-set','Handcrafted brass thali with bell, diya and kumkum holder.','1 set',899,1299,15,'https://images.unsplash.com/photo-1609151354448-c4a53450b6ba?w=800&q=80',true,false,true),
('pooja-essentials','Cotton Wicks (Batti)','cotton-wicks','Soft long cotton wicks for diyas, pack of 500.','Pack of 500',59,79,200,'https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1a1?w=800&q=80',false,false,true),
('rice-grains','Sona Masoori Rice','sona-masoori-rice','Premium aged Sona Masoori rice, light and aromatic.','5 kg',449,549,60,'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&q=80',true,true,false),
('rice-grains','Basmati Rice Premium','basmati-rice-premium','Extra long grain aged basmati rice.','1 kg',199,249,90,'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=800&q=80',false,true,true),
('rice-grains','Foxtail Millet','foxtail-millet','Nutritious unpolished foxtail millet.','1 kg',129,169,45,'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80',false,false,true),
('dals-pulses','Toor Dal (Arhar)','toor-dal','Unpolished toor dal, rich in protein.','1 kg',169,199,70,'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80',true,true,false),
('dals-pulses','Moong Dal','moong-dal','Split yellow moong dal, easy to cook.','1 kg',149,179,65,'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=800&q=80',false,false,true),
('dals-pulses','Chana Dal','chana-dal','Premium quality bengal gram split.','1 kg',119,149,80,'https://images.unsplash.com/photo-1585996746349-4b3fd0d6a6b7?w=800&q=80',false,false,false),
('oils-ghee','Wood Pressed Groundnut Oil','wood-pressed-groundnut-oil','Traditional chekku groundnut oil, unrefined.','1 L',389,449,35,'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80',true,true,true),
('oils-ghee','A2 Desi Cow Ghee','a2-desi-cow-ghee','Bilona method hand-churned cow ghee.','500 ml',799,999,20,'https://images.unsplash.com/photo-1610725664285-7c57e6355d10?w=800&q=80',true,true,true),
('oils-ghee','Cold Pressed Coconut Oil','cold-pressed-coconut-oil','Pure virgin coconut oil for cooking and pooja.','1 L',449,529,30,'https://images.unsplash.com/photo-1590779033100-9f60a05a013d?w=800&q=80',false,false,true),
('spices-masala','Turmeric Powder','turmeric-powder','Organic single-origin haldi powder.','200 g',89,119,150,'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=800&q=80',false,true,true),
('spices-masala','Kumkum Powder','kumkum-powder','Traditional temple-grade kumkum.','100 g',69,89,140,'https://images.unsplash.com/photo-1604608672516-f1b9b1a0a1a1?w=800&q=80',true,false,false),
('spices-masala','Sambar Masala','sambar-masala','Freshly ground authentic sambar masala.','200 g',129,159,75,'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=800&q=80',false,false,true),
('dry-fruits','Premium Almonds','premium-almonds','California almonds, crisp and fresh.','500 g',549,699,40,'https://images.unsplash.com/photo-1508747703725-719777637510?w=800&q=80',true,true,true),
('dry-fruits','Cashew Nuts W240','cashew-nuts-w240','Whole white cashews, grade W240.','500 g',649,799,25,'https://images.unsplash.com/photo-1536591375715-1f9d5a1e4b1e?w=800&q=80',false,true,false),
('dry-fruits','Seedless Raisins','seedless-raisins','Sun-dried golden kishmish.','250 g',179,219,60,'https://images.unsplash.com/photo-1596591606975-97ee5cef3a1e?w=800&q=80',false,false,true),
('snacks-sweets','Mysore Pak','mysore-pak','Ghee-rich traditional Mysore Pak.','500 g',399,449,20,'https://images.unsplash.com/photo-1606491956689-2ea866880c84?w=800&q=80',true,false,true),
('snacks-sweets','Ribbon Pakoda','ribbon-pakoda','Crispy homemade ribbon pakoda.','250 g',149,179,50,'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80',false,true,false),
('puja-flowers','Marigold Garland','marigold-garland','Fresh marigold garland, 3 feet.','1 piece',199,249,18,'https://images.unsplash.com/photo-1519378058457-4c29a0a2efac?w=800&q=80',true,true,true),
('puja-flowers','Lotus Flowers','lotus-flowers','Fresh lotus for special pooja, pack of 5.','Pack of 5',299,349,10,'https://images.unsplash.com/photo-1470137430626-983a37b8ea46?w=800&q=80',false,false,true)
) AS v(cat,name,slug,description,weight,price,mrp,stock,image_url,feat,best,rec)
JOIN public.categories c ON c.slug = v.cat;