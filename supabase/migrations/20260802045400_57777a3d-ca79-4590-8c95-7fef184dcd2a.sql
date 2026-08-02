-- 1. Harden has_role: only allows checking the caller's own roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  END
$$;

-- 2. Remove has_role from anon-facing policies so anon no longer needs EXECUTE
DROP POLICY IF EXISTS "stores public read" ON public.store_locations;
CREATE POLICY "stores public read" ON public.store_locations FOR SELECT TO anon USING (is_active);
CREATE POLICY "stores read authenticated" ON public.store_locations FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "brands public read" ON public.brands;
CREATE POLICY "brands public read" ON public.brands FOR SELECT TO anon USING (is_active);
CREATE POLICY "brands read authenticated" ON public.brands FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "coupons public read" ON public.coupons;
CREATE POLICY "coupons public read" ON public.coupons FOR SELECT TO anon USING (is_active);
CREATE POLICY "coupons read authenticated" ON public.coupons FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "reviews public read" ON public.reviews;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon USING (is_approved);
CREATE POLICY "reviews read authenticated" ON public.reviews FOR SELECT TO authenticated
  USING (is_approved OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Active variants are public" ON public.product_variants;
CREATE POLICY "variants public read" ON public.product_variants FOR SELECT TO anon USING (is_active = true);
CREATE POLICY "variants read authenticated" ON public.product_variants FOR SELECT TO authenticated
  USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Lock down EXECUTE on SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_order_event() FROM PUBLIC, anon, authenticated;
