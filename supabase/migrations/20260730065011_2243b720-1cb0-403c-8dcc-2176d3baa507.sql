CREATE POLICY "admins insert orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert order items" ON public.order_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));