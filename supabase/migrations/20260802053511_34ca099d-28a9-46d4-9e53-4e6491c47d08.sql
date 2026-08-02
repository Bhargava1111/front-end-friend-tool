-- 1. Profile verification fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS address_text text,
  ADD COLUMN IF NOT EXISTS pincode text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS location_accuracy_m numeric,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE OR REPLACE FUNCTION public.validate_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.verification_status NOT IN ('pending','submitted','verified','rejected') THEN
    RAISE EXCEPTION 'invalid verification_status';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_profiles_verification ON public.profiles;
CREATE TRIGGER trg_profiles_verification
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_profile_verification();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Customers must not be able to self-verify.
CREATE OR REPLACE FUNCTION public.guard_profile_self_verify()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NEW.id = auth.uid()
     AND NEW.verification_status IS DISTINCT FROM OLD.verification_status
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
     AND NEW.verification_status <> 'submitted' THEN
    RAISE EXCEPTION 'only an admin can change verification status';
  END IF;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.guard_profile_self_verify() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_profiles_guard_verify ON public.profiles;
CREATE TRIGGER trg_profiles_guard_verify
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_self_verify();

-- Existing customers are treated as verified so nothing breaks for them.
UPDATE public.profiles SET verification_status = 'verified', verified_at = now()
WHERE verification_status = 'pending';

-- 2. Orders: delivery date
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_date date;

-- 3. Blog posts
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  body text NOT NULL DEFAULT '',
  cover_url text,
  author text,
  tags text[] NOT NULL DEFAULT '{}',
  read_minutes integer NOT NULL DEFAULT 4,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blog public read anon" ON public.blog_posts;
CREATE POLICY "blog public read anon" ON public.blog_posts
  FOR SELECT TO anon USING (is_published);

DROP POLICY IF EXISTS "blog read authenticated" ON public.blog_posts;
CREATE POLICY "blog read authenticated" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (is_published OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "blog admin write" ON public.blog_posts;
CREATE POLICY "blog admin write" ON public.blog_posts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_blog_updated_at ON public.blog_posts;
CREATE TRIGGER trg_blog_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.blog_posts (title, slug, excerpt, body, author, tags, read_minutes)
VALUES
 ('How to set up a simple daily pooja at home','simple-daily-pooja-setup',
  'A calm five-minute routine using everyday essentials from your kitchen shelf.',
  E'A daily pooja does not need to be elaborate. Begin with a clean surface, a lamp, and a few flowers.\n\n## What you need\n- A brass or clay lamp with sesame or ghee oil\n- Agarbatti or sambrani\n- Fresh flowers and a small plate for prasad\n\n## The routine\nLight the lamp, offer the flowers, and sit quietly for two minutes. Consistency matters far more than scale.',
  'Sri Mahalakshmi Stores', ARRAY['pooja','rituals'], 4),
 ('Choosing cold-pressed oils for everyday cooking','choosing-cold-pressed-oils',
  'Groundnut, sesame or coconut — what changes in flavour, smoke point and nutrition.',
  E'Cold-pressed oils retain more of the seed''s natural aroma because they are crushed slowly without heat.\n\n## Quick guide\n- **Groundnut**: high smoke point, great for frying\n- **Sesame**: earthy, ideal for tempering and pooja lamps\n- **Coconut**: sweet finish, best for South Indian curries\n\nStore in a dark bottle away from the stove.',
  'Sri Mahalakshmi Stores', ARRAY['grocery','kitchen'], 5),
 ('A monthly staples checklist for a family of four','monthly-staples-checklist',
  'Plan one trip a month and stop the small daily top-ups.',
  E'Buying staples monthly saves both money and time.\n\n## Grains and pulses\n10 kg rice, 3 kg toor dal, 2 kg urad dal, 2 kg besan.\n\n## Oils and spices\n5 L cooking oil, 500 g each of chilli, turmeric and coriander powder.\n\n## Pooja shelf\nCamphor, agarbatti, cotton wicks and a spare lamp oil bottle.',
  'Sri Mahalakshmi Stores', ARRAY['grocery','planning'], 3)
ON CONFLICT (slug) DO NOTHING;