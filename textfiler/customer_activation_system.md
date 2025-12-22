# Funktionalitet: Manuell Kundaktivering och Åtkomstkontroll

## Överblick
Implementering av ett säkert, administratörstyrt system för att bevilja/återkalla åtkomst till premium-sidan `/min-sida`. Endast användare markerade som kunder (via `is_customer = true`) får tillgång. Självregistrering är avstängd; alla konton skapas av admin via portalen.

---

## 1. Implementering

### 1.1 Typ-uppdateringar (`src/types.ts`)
**Nytt fält i Customer-interface:**
```typescript
interface Customer {
  // ... befintliga fält
  is_customer?: boolean; // true om användaren är en aktiv kund
}
```

**Nytt i AuthContextType (`src/hooks/useAuth.ts`):**
```typescript
interface AuthContextType {
  // ... befintliga
  isCustomer: boolean; // Convenience flag: customer?.is_customer === true
}
```

### 1.2 Route Guard: `CustomerRoute.tsx`
**Plats:** `src/components/CustomerRoute.tsx`

**Funktion:**
- Skyddar rutter som endast kunder ska komma åt
- Kontrollerar `user` och `isCustomer` status
- Visar behörighetssida om åtkomst nekas
- Omsluter skyddade rutter med `<Outlet />`

**Användning i App.tsx:**
```tsx
<Route element={<CustomerRoute />}>
  <Route path="/min-sida" element={<Portal />} />
</Route>
```

### 1.3 Administratörsverktyg: `CreateCustomerForm.tsx`
**Plats:** `src/components/CreateCustomerForm.tsx`

**Funktionalitet (invite-flöde):**
- Validerar att e-post är unik.
- Anropar edge-funktionen `invite-customer` (Service Role) som:
  - skapar auth-user med temporärt lösenord (email_confirm=true)
  - upsertar kundraden med `is_customer=true` (onConflict: id)
  - skickar välkomstmail via Brevo med login-länk + lösenord
- Toastar resultat.

**Användning:**
```tsx
<CreateCustomerForm onCustomerCreated={handleRefresh} />
```

### 1.4 Kundhantering: `CustomerManagement.tsx`
**Plats:** `src/pages/Portal/views/CustomerManagement.tsx`

**Funktionalitet:**
- Listar alla kunder med status (Aktiv/Inaktiv)
- En-klicks aktivering/deaktivering av kundstatus
- Uppdaterar `is_customer` direkt i databasen
- Visual feedback med badges och loading states

### 1.5 Admin Portal Integration
**Plats:** `src/pages/Portal/AdminPortal.tsx`

**Nytt:**
- Ny flik: "Kundhantering"
- Integrering av `CreateCustomerForm` och `CustomerManagement`
- Admin kan skapa och aktivera/deaktivera kunder från en plats

---

## 2. Databasschema

### Supabase `customers` tabell
Måste innehålla följande kolumner:

| Kolumn | Typ | Beskrivning |
|--------|------|-------------|
| `id` | uuid | Primärnyckel, länkad till `auth.users.id` |
| `email` | text | Användarens e-post |
| `name` | text | Användarens namn |
| `phone` | text | Valfritt telefonnummer |
| `is_admin` | boolean | Admin-flagga (optional) |
| `is_customer` | **boolean** | **NYT**: True om aktiv kund |
| `created_at` | timestamp | Skapat datum |

**Migration (SQL):**
```sql
ALTER TABLE public.customers 
ADD COLUMN is_customer BOOLEAN DEFAULT FALSE;
```

---

## 3. Flöden

### 3.1 Adminflöde: Skapa Ny Kund (Invite)

```
Admin öppnar AdminPortal
  ↓
Klickar på "Kundhantering" flik
  ↓
Fyller i "Skapa Ny Kund" formulär (namn, e-post, telefon)
  ↓
Edge-funktion "invite-customer" körs (Service Role):
  - Auth: createUser med temporärt lösenord (email_confirm=true)
  - DB: upsert customer (is_customer=true) on id
  - Mail: Brevo skickar login-länk + lösenord
  ↓
Kan logga in på /min-sida
```

### 3.2 Adminflöde: Konvertera Kontakt → Kund (Lösenord via Brevo)

```
Admin öppnar Kontakt-tabben
  ↓
Klickar "Konvertera till kund" på en kontakt
  ↓
Edge-funktion "convert-contact-to-customer" körs (Service Role):
  - Skapar Auth-user med slumpat lösenord (email_confirm=true)
  - Upsert customer kopplad till auth.user.id (onConflict: id)
  - Markerar contact_requests.status = converted
  - Skickar e-post via Brevo med inloggningslänk + lösenord
  ↓
Kontaktkortet försvinner från kontaktlistan och kunden syns i kundhantering
```

### 3.3 Användarflöde: Åtkomst till `/min-sida`

```
Outentifierad användare
  ↓ Besöker /min-sida
  ↓
CustomerRoute kontrollerar: user === null
  ↓
Visar "Åtkomst Nekad" → Länk till /portal för inloggning
  ↓
---
Inloggad men NOT is_customer
  ↓ Besöker /min-sida
  ↓
CustomerRoute kontrollerar: isCustomer === false
  ↓
Visar "Åtkomst Nekad" → Länk för att kontakta oss
  ↓
---
Inloggad AND is_customer === true
  ↓ Besöker /min-sida
  ↓
CustomerRoute godkänner åtkomst
  ↓
Portal renderas normalt
```

### 3.4 Adminflöde: Deaktivera Kund

```
Admin öppnar "Kundhantering" flik
  ↓
Admin ser lista med alla kunder (Aktiv/Inaktiv)
  ↓
Admin klickar "Deaktivera" på en kund
  ↓
Backend uppdaterar is_customer = false
  ↓
Kunden kan inte längre komma åt /min-sida
  ↓
Nästa gång kunden försöker besöka /min-sida:
  → Se "Åtkomst Nekad" sida
```

---

## 4. Testinstruktioner

### Test 1: Skapa ny kund via admin (invite)
1. Logga in som admin (`/portal` → admin-användare)
2. Gå till "Kundhantering" flik
3. Fyll i formulär: namn, e-post, telefon
4. Klicka "Skapa & Skicka Inbjudan"
5. **Förväntat:** Toast "Kund skapad"
6. **Verifiera:** Invite-mail från Supabase

### Test 2: Konvertera kontakt → kund (lösenordsmail via Brevo)
1. Skapa/finn en contact-request med unik e-post
2. I AdminPortal Kontakt-tabben, klicka "Konvertera till kund"
3. **Förväntat:** Toast "Konvertering slutförd"
4. **Verifiera:** Kundrad skapad (customers), contact.status=converted, e-post skickad med lösenord (Brevo)

### Test 3: Kund kan inte komma åt `/min-sida` utan `is_customer`
1. Skapa auth.user utan `is_customer` i customers
2. Logga in och besök `/min-sida`
3. **Förväntat:** Behörighetssida visas

### Test 4: Aktiverad kund kan komma åt `/min-sida`
1. Skapa ny kund via formulär (skapar med `is_customer = true`)
2. Kunden ställer in lösenord från invitationsemail
3. Logga in
4. Besök `/min-sida`
5. **Förväntat:** Portal renderas utan begränsningar

### Test 5: Deaktivera kund
1. Admin navigerar till "Kundhantering"
2. Klicka "Deaktivera" på en aktiv kund
3. Logout och login igen med den kunden
4. Besök `/min-sida`
5. **Förväntat:** Behörighetssida ("Du har inte tillgång till denna sida")

---

## 5. Säkerhet

✅ **Admin-only functionality:**
- Enbart admin-användare kan se `AdminPortal` (kräver `is_admin = true`)
- CreateCustomerForm och CustomerManagement är inne i AdminPortal

✅ **Backend-validering:**
- Supabase RLS-regler bör begränsa `is_customer` uppdateringar till admins

✅ **Frontend-skydd:**
- Route Guard omöjliggör direkt navigation till `/min-sida` utan riktig `isCustomer` status

### Brevo-konfiguration (för kontakt→kund-lösenordsmail)
- Edge-funktionen `convert-contact-to-customer` använder Brevo för att skicka första lösenordet.
- Sätt följande secrets i Supabase Edge Functions:
  - `BREVO_API_KEY` – din Brevo API-nyckel (v3 REST API)
  - `BREVO_SENDER_EMAIL` – avsändaradress (måste vara verifierad i Brevo), t.ex. `no-reply@trygghand.se`
  - `BREVO_SENDER_NAME` – avsändarnamn, t.ex. `Trygghand`
  - `APP_LOGIN_URL` – länk i mailet, t.ex. `https://app.trygghand.se/login`
  - (redan befintliga) `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- Deploya funktionen efter att secrets satts: `npx supabase functions deploy convert-contact-to-customer`

---

## 6. Framtida Förbättringar

1. **RLS-regler:** Lägg till Row-Level Security i Supabase för att säkerställa enbart admins kan ändra `is_customer`
2. **E-post Templates:** Anpassa invitationsemail-mall i Supabase Auth
3. **Bulk-operationer:** Importera CSV med kunder för batch-skapande
4. **Webhooks:** Skapa Supabase-webhook för att synkronisera externa system när `is_customer` ändras
5. **Audit Log:** Logga admin-åtgärder (vem aktiverade/deaktiverade när)

---

## 7. Filer och Ändringar

| Fil | Typ | Beskrivning |
|-----|------|-------------|
| `src/types.ts` | Uppdaterad | Lade till `is_customer` till Customer-interface |
| `src/hooks/useAuth.ts` | Uppdaterad | Lade till `isCustomer` convenience flag |
| `src/components/CustomerRoute.tsx` | **NY** | Route Guard för kundskyddade rutter |
| `src/components/CreateCustomerForm.tsx` | **NY** | Admin-formulär för kundskap (invite) |
| `supabase/functions/invite-customer` | **NY** | Edge-funktion (create auth user + customer, Brevo mail) |
| `supabase/functions/convert-contact-to-customer` | **NY** | Edge-funktion (create auth user + customer, Brevo mail) |
| `src/pages/Portal/views/CustomerManagement.tsx` | **NY** | Admin-verktyg för aktivering/deaktivering |
| `src/pages/Portal/AdminPortal.tsx` | Uppdaterad | Ny "Kundhantering" flik |
| `src/App.tsx` | Uppdaterad | Ny `<CustomerRoute />` skyddad rutter |

---

## 8. Kontakt & Support

För frågor eller problem, se teknisk dokumentation eller kontakta utvecklingsteamet.
