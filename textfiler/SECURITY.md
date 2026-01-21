# SECURITY.md

## Säkerhets- och integritetspolicy

Detta dokument beskriver hur säkerhet, integritet och dataskydd är implementerat i systemet. Det är avsett för intern användning, revision, tillsyn (t.ex. IMY) samt för externa utvecklare eller leverantörer.

---

## 1. Övergripande säkerhetsprinciper

Systemet är byggt enligt principerna:

- **Privacy by Design & Default** (GDPR art. 25)
- **Least Privilege** – användare har endast minsta nödvändiga åtkomst
- **Defense in Depth** – flera skyddslager (Auth, RLS, funktioner, storage policies)
- **Separation of concerns** – roller, data och logik är separerade

All affärskritisk data skyddas av Row Level Security (RLS).

---

## 2. Autentisering (Supabase Auth)

- Autentisering sker via Supabase Auth
- Varje användare identifieras via `auth.uid()` (UUID)
- Ingen applikationslogik förlitar sig på klient-sända användar-ID:n

Roller hanteras **inte** via JWT-claims direkt, utan via databasstyrd rollmodell.

---

## 3. Auktorisation & roller

### Roller

Systemet använder följande roller:

- `admin`
- `authenticated` (standard inloggad användare)
- `anon` (ej inloggad)

Roller lagras i tabellen:

- `public.user_roles`

Kontroll sker via funktion:

```sql
has_role(auth.uid(), 'admin')
```

Denna funktion är:
- `SECURITY DEFINER`
- `STABLE`
- begränsad till `search_path = public`

---

## 4. Row Level Security (RLS)

### Grundregler

- **RLS är aktiverat på alla tabeller som innehåller personuppgifter**
- Det finns inga tabeller med känslig data utan aktiva policies
- `service_role` används endast för backend-jobb och är ej exponerad mot klient

### Exempelprinciper

- Användare kan endast läsa/uppdatera sina egna poster
- Admins har explicit definierad åtkomst – aldrig implicit
- INSERT, SELECT, UPDATE, DELETE styrs separat

Verifiering av RLS sker via separat verifieringsskript (`VERIFY_RLS.sql`).

---

## 5. Datatyper & personuppgifter

Systemet hanterar följande kategorier av personuppgifter:

- Kontaktuppgifter (namn, e-post, telefon)
- Ärendedata (cases, kommentarer)
- Fullmakter (metadata + dokument)

Åtkomst till dessa styrs strikt via RLS och bucket-specifika storage-policies.

---

## 6. Storage (Supabase Storage)

Buckets används för:

- Dokument
- Fullmakter
- Abonnemangsrelaterade filer

Principer:

- Användare kan endast läsa sina egna filer
- Admin kan läsa filer vid behov (t.ex. support)
- Ingen bucket är publik utan RLS-policy

Filåtkomst kontrolleras via:

```sql
storage.objects RLS policies
```

---

## 7. Loggning & spårbarhet

- Auth-händelser loggas av Supabase
- Administrativa åtgärder kan spåras via databashistorik
- Radering av användare loggas i separata loggtabeller

Loggar används endast för:
- säkerhet
- felsökning
- rättsliga krav

---

## 8. Dataminimering & retention

- Endast nödvändig data samlas in
- Onödiga fält eller duplicering undviks
- Data kan raderas eller anonymiseras vid begäran

Retention-policy definieras separat.

---

## 9. Incidenthantering

Vid misstänkt personuppgiftsincident:

1. Incident identifieras och isoleras
2. Åtkomst spärras vid behov
3. Bedömning görs inom 24h
4. IMY underrättas inom 72h vid krav
5. Berörda användare informeras vid hög risk

All incidenthantering dokumenteras.

---

## 10. Ansvar

- Systemägare ansvarar för säkerhetsbeslut
- Endast utsedda administratörer har admin-åtkomst
- Externa utvecklare ges aldrig service_role-nycklar

---

## 11. Revision & uppföljning

- RLS verifieras regelbundet
- Policies granskas vid ändringar i datamodell
- Detta dokument uppdateras vid större säkerhetsändringar

---

## 12. Sårbarheter i beroenden (npm)

Projektet använder npm för frontend-/verktygsberoenden. Sårbarheter hanteras enligt principen:

- Åtgärda med `npm audit fix` när det kan göras utan brytande ändringar.
- Undvik `npm audit fix --force` om det kräver major-version eller bryter verktyg/flöden.
- Om sårbarheter kvarstår: dokumentera beroendet, påverkan (runtime/dev), och riskbedömning.

### Kvarstående (jan 2026)

- `tar` (high) via npm-paketet `supabase` (Supabase CLI)
	- Typ: **devDependency** (verktyg/CLI), inte en runtime-dependency i klientbygget.
	- Status: `npm audit fix` reducerade sårbarheter men kvarstår eftersom fix kräver `npm audit fix --force` och en **semver-major** förändring av `supabase`.
	- Riskbedömning: Påverkar främst utvecklings-/CI-miljö (särskilt om CLI hanterar arkiv). Ingen direkt påverkan på körande frontend i produktion.
	- Åtgärd: Accepteras tillfälligt och följs upp vid nästa planerade dependency-uppdateringsfönster.

---

**Status:** Aktiv

**Senast uppdaterad:** 2025

