-- 20260323_add_clothingType_to_handplockat_listings.sql
-- Lägg till clothingType (Dam/Herr/Barn) till handplockat_listings

ALTER TABLE public.handplockat_listings
  ADD COLUMN IF NOT EXISTS clothingType text null;

-- Lägg till i public view om så önskas
DROP VIEW IF EXISTS public.handplockat_listings_public;
CREATE VIEW public.handplockat_listings_public AS
SELECT
  id,
  title,
  description,
  category,
  clothingType,
  dimensions_mm,
  price_sek,
  cta_typ,
  bid_start_sek,
  status,
  skick,
  pickup_area,
  pickup_window,
  pickup_deadline_at,
  auction_end_at,
  payment_method,
  image_cutout,
  images_cutout,
  created_at
FROM public.handplockat_listings
WHERE status in ('available','reserved');

grant select on public.handplockat_listings_public to anon;
grant select on public.handplockat_listings_public to authenticated;
