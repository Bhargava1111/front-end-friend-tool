
-- roles
CREATE TYPE public.app_role AS ENUM ('admin','customer');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "own roles select" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- store locations
CREATE TABLE public.store_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address_text text NOT NULL,
  city text NOT NULL,
  state text NOT NULL,
  pincode text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  phone text,
  opening_hours text NOT NULL DEFAULT '7:00 AM - 10:00 PM',
  delivery_radius_km numeric NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_locations TO authenticated;
GRANT ALL ON public.store_locations TO service_role;
ALTER TABLE public.store_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores public read" ON public.store_locations FOR SELECT TO anon, authenticated USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage stores" ON public.store_locations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER store_locations_updated_at BEFORE UPDATE ON public.store_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- address coordinates
ALTER TABLE public.addresses
  ADD COLUMN latitude double precision,
  ADD COLUMN longitude double precision,
  ADD COLUMN landmark text;

-- admin management policies
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage banners" ON public.banners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins manage product images" ON public.product_images FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins read orders" ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins read order items" ON public.order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins read profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

INSERT INTO public.store_locations (name, address_text, city, state, pincode, latitude, longitude, phone, opening_hours, delivery_radius_km) VALUES
('Sri Mahalakshmi Stores — T. Nagar','12, Ranganathan Street, T. Nagar','Chennai','Tamil Nadu','600017',13.0418,80.2341,'+91 98400 11223','7:00 AM - 10:00 PM',6),
('Sri Mahalakshmi Stores — Adyar','45, Sardar Patel Road, Adyar','Chennai','Tamil Nadu','600020',13.0067,80.2570,'+91 98400 11224','7:00 AM - 10:00 PM',5),
('Sri Mahalakshmi Stores — Anna Nagar','8, 2nd Avenue, Anna Nagar','Chennai','Tamil Nadu','600040',13.0850,80.2101,'+91 98400 11225','6:30 AM - 10:30 PM',7),
('Sri Mahalakshmi Stores — Velachery','101, Velachery Main Road','Chennai','Tamil Nadu','600042',12.9791,80.2210,'+91 98400 11226','7:00 AM - 9:30 PM',5),
('Sri Mahalakshmi Stores — Mylapore','23, North Mada Street, Mylapore','Chennai','Tamil Nadu','600004',13.0339,80.2695,'+91 98400 11227','6:00 AM - 10:00 PM',4);
