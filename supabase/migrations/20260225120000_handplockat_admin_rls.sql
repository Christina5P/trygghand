-- Aktivera RLS på tabeller
alter table handplockat_listings enable row level security;
alter table handplockat_orders enable row level security;
alter table profiles enable row level security;

-- Policy: tillåt admin att läsa alla listings
drop policy if exists "Admin kan läsa alla listings" on handplockat_listings;
create policy "Admin kan läsa alla listings"
  on handplockat_listings
  for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Policy: tillåt admin att läsa alla orders
drop policy if exists "Admin kan läsa alla orders" on handplockat_orders;
create policy "Admin kan läsa alla orders"
  on handplockat_orders
  for select
  using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

-- Policy: tillåt användare att läsa sin egen profil
drop policy if exists "Allow user to read own profile" on profiles;
create policy "Allow user to read own profile"
  on profiles
  for select
  using (auth.uid() = id);