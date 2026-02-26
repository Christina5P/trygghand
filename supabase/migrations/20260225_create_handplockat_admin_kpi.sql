-- Skapar statistikfunktion för Handplockat admin-dashboard
create or replace function public.handplockat_admin_kpi()
returns jsonb
language plpgsql
as $$
declare
  available integer;
  reserved integer;
  sold integer;
  reservations_7d integer;
  sold_sum_30d integer;
begin
  select count(*) into available from handplockat_listings where status = 'available';
  select count(*) into reserved from handplockat_listings where status = 'reserved';
  select count(*) into sold from handplockat_listings where status = 'sold';
  select count(*) into reservations_7d from handplockat_orders where status = 'reserved' and created_at > now() - interval '7 days';
  select coalesce(sum(price_sek),0) into sold_sum_30d from handplockat_listings where status = 'sold' and updated_at > now() - interval '30 days';

  return jsonb_build_object(
    'available', available,
    'reserved', reserved,
    'sold', sold,
    'reservations_7d', reservations_7d,
    'sold_sum_30d', sold_sum_30d
  );
end;
$$;
