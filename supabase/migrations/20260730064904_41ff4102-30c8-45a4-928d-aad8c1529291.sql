-- Product video
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS video_url text;

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  type text NOT NULL DEFAULT 'order',
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own notifications select" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own notifications update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own notifications delete" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() = user_id);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

-- Notify admins on new order, customer on status change
CREATE OR REPLACE FUNCTION public.notify_order_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE admin_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, title, body, type, order_id)
      VALUES (admin_id, 'New order ' || NEW.order_number,
              NEW.recipient_name || ' placed an order worth ₹' || NEW.total || '. Awaiting approval.',
              'admin_order', NEW.id);
    END LOOP;
    INSERT INTO public.notifications (user_id, title, body, type, order_id)
    VALUES (NEW.user_id, 'Order placed', 'Order ' || NEW.order_number || ' is awaiting confirmation.', 'order', NEW.id);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, title, body, type, order_id)
    VALUES (
      NEW.user_id,
      CASE NEW.status
        WHEN 'confirmed' THEN 'Order approved'
        WHEN 'packed' THEN 'Order packed'
        WHEN 'delivered' THEN 'Order delivered'
        WHEN 'cancelled' THEN 'Order cancelled'
        ELSE 'Order updated'
      END,
      'Order ' || NEW.order_number || ' is now ' || NEW.status || '.',
      'order', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_order_event() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_notify_insert AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();
CREATE TRIGGER orders_notify_update AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_event();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;