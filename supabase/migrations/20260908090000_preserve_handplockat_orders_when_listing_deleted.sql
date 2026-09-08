alter table public.handplockat_orders
  alter column listing_id drop not null;

alter table public.handplockat_orders
  drop constraint if exists handplockat_orders_listing_id_fkey;

alter table public.handplockat_orders
  add constraint handplockat_orders_listing_id_fkey
  foreign key (listing_id)
  references public.handplockat_listings(id)
  on delete set null;