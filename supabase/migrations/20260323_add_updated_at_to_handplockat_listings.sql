-- 20260323_add_updated_at_to_handplockat_listings.sql
-- Lägg till updated_at och trigger för automatisk uppdatering

ALTER TABLE public.handplockat_listings
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_handplockat_listings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_handplockat_listings_updated_at ON public.handplockat_listings;
CREATE TRIGGER set_handplockat_listings_updated_at
  BEFORE UPDATE ON public.handplockat_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_handplockat_listings_updated_at();
