# Kundflöde (Customers) – Översikt

Den här filen beskriver hur kundflödet fungerar, vilka filer som ingår och hur de hänger ihop. Fokus ligger på att en kund kan vara **antingen aktiv (customers-tabellen)** eller **arkiverad (archived_customers-tabellen)**.

## Datamodell & Supabase
- `customers` (Postgres): aktiva kunder. Kolumnen `is_customer` används för aktivering; i vår kod hämtas bara `is_customer=true` och deaktiverade rader tas bort vid arkivering.
- `archived_customers` (Postgres): arkiverade kunder. Innehåller kopia av kunddata (`original_data`) + metadata (`archived_by`, `archived_reason`, `archived_at`). RLS: endast admins får läsa/skriva (se `add_delete_policy_archived_customers.sql`).
- Migrationer/SQL:
  - `textfiler/migrate_inactive_customers_to_archive.sql`: flyttar inaktiva kunder från `customers` till `archived_customers` med `ON CONFLICT DO UPDATE` och tar bort dem ur `customers`.
  - `textfiler/add_delete_policy_archived_customers.sql`: lägger till DELETE-policy för arkiverade kunder så admins kan ta bort dem.

## React-komponenter
- `src/pages/Portal/AdminPortal.tsx`
  - Innehåller alla admin-tabbar. Fliken **"Kunder"** visar både aktiv hantering och arkiverade kunder.
  - Räknaren för Kunder baseras på aktiva kunder (hooken returnerar redan filtrerade).
  - Använder komponenterna `CustomerManagement` (aktiva) och `ArchivedCustomersList` (arkiverade).

- `src/hooks/useAdminData.ts`
  - Central data-fetch för admin.
  - `fetchCustomers` hämtar **endast aktiva** (`is_customer = true`) från `customers` och sorterar på namn. Detta gör att allt i UI visar bara aktiva.

- `src/pages/Portal/views/CustomerManagement.tsx`
  - Visar endast **aktiva** kunder (de som hooken levererar).
  - **Deaktivera & Arkivera**: 
    1) Insert i `archived_customers` (sparar all originaldata). 
    2) Delete från `customers` (kunden försvinner från aktiva). 
  - UI: grön badge "Aktiv" och en knapp för att arkivera. Ingen aktiveringsknapp här eftersom bara aktiva listas.

- `src/pages/Portal/views/ArchivedCustomersList.tsx`
  - Visar arkiverade kunder från `archived_customers` (sorterat på `archived_at` desc).
  - **Återställ**: hämtar arkiverad rad, `upsert` till `customers` med `is_customer=true`, tar bort från `archived_customers`. Fångar dubbletter via `onConflict: 'id'`.
  - **Ta bort**: raderar från `archived_customers` (kräver DELETE-policy). Bekräftelseprompt innan.
  - UI: badge "Arkiverad", knappar Återställ/Radera.

## Flöde (sammanfattning)
- **Aktiv → Arkiv**: Admin klickar "Deaktivera & Arkivera" i `CustomerManagement` → kunden skrivs in i `archived_customers` och tas bort från `customers`. Kunden försvinner omedelbart från aktiva listan och dyker upp i Arkiverade-listan.
- **Arkiv → Aktiv**: Admin klickar "Återställ" i `ArchivedCustomersList` → kunden `upsert`:as till `customers` med `is_customer=true` och tas bort från arkivet. Kunden syns åter i aktiva listan.
- **Radera permanent**: Admin klickar "Radera" i `ArchivedCustomersList` → raden tas bort från `archived_customers` (endast admins, via policy).

## Viktiga kopplingar
- **AdminPortal ↔ useAdminData**: Tabben "Kunder" får `customers` (aktiva) + `ArchivedCustomersList` använder sin egen fetch.
- **CustomerManagement** använder `onDataUpdated` (från AdminPortal) för att refetcha efter arkivering/deaktivering.
- **ArchivedCustomersList** anropar både `fetchArchivedCustomers` (intern) och `onDataUpdated` (AdminPortal) efter återställning/radering.

## Vad händer vid migrationen?
- Kör `migrate_inactive_customers_to_archive.sql` i Supabase SQL Editor:
  - Alla `is_customer=false` flyttas till `archived_customers` (med `ON CONFLICT DO UPDATE`).
  - Samma rader tas bort från `customers`.
  - Därefter består `customers` endast av aktiva kunder.

## Rättigheter (RLS)
- `archived_customers`: behöver SELECT/INSERT/DELETE/UPDATE för admins. Scriptet `add_delete_policy_archived_customers.sql` lägger till DELETE-policy. Se till att dina policies tillåter det aktuella admin-upplägget.

## Snabb felsökning
- Ser du en kund i båda listor? 
  - Kör migration-scriptet så att `is_customer=false` flyttas bort. 
  - Säkerställ att `fetchCustomers` hämtar endast `is_customer=true` (redan implementerat).
- Kan inte återställa? 
  - Kontrollera att upsert har `onConflict: 'id'` (implementerat). 
  - Kontrollera RLS/rollen för att skriva i `customers`.
- Ta bort arkiverad kund fungerar inte? 
  - Kontrollera att DELETE-policy för `archived_customers` är på plats (se `add_delete_policy_archived_customers.sql`).

## Relaterade filer
- `src/pages/Portal/AdminPortal.tsx`
- `src/hooks/useAdminData.ts`
- `src/pages/Portal/views/CustomerManagement.tsx`
- `src/pages/Portal/views/ArchivedCustomersList.tsx`
- `textfiler/migrate_inactive_customers_to_archive.sql`
- `textfiler/add_delete_policy_archived_customers.sql`
