begin;

-- Multiple cutout images on listings
alter table public.handplockat_listings
  add column if not exists images_cutout text[] not null default '{}'::text[];

update public.handplockat_listings
set images_cutout = case
  when coalesce(array_length(images_cutout, 1), 0) = 0 and image_cutout is not null and btrim(image_cutout) <> ''
    then array[image_cutout]
  else images_cutout
end;

-- Price-offer support on orders
alter table public.handplockat_orders
  add column if not exists order_type text not null default 'direct_buy',
  add column if not exists offered_price_sek integer null;

alter table public.handplockat_orders
  drop constraint if exists handplockat_orders_order_type_check;
alter table public.handplockat_orders
  add constraint handplockat_orders_order_type_check
  check (order_type in ('direct_buy','price_offer'));

create index if not exists handplockat_orders_type_status_idx
  on public.handplockat_orders (order_type, status, created_at desc);

-- Public view includes images_cutout
drop view if exists public.handplockat_listings_public;

create view public.handplockat_listings_public as
select
  id,
  title,
  description,
  category,
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
from public.handplockat_listings
where status in ('available','reserved');

grant select on public.handplockat_listings_public to anon;
grant select on public.handplockat_listings_public to authenticated;

commit;
