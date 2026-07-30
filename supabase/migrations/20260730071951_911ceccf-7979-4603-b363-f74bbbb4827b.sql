CREATE TABLE public.demo_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  purpose text NOT NULL DEFAULT 'login',
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.demo_otp_codes TO service_role;

ALTER TABLE public.demo_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no client access to demo otp codes"
  ON public.demo_otp_codes FOR SELECT USING (false);

CREATE INDEX demo_otp_codes_lookup_idx
  ON public.demo_otp_codes (identifier, purpose, created_at DESC);

CREATE TRIGGER demo_otp_codes_set_updated_at
  BEFORE UPDATE ON public.demo_otp_codes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();