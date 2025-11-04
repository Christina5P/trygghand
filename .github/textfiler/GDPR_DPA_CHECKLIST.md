# GDPR / DPA - Checklista för Trygg Hand

Syfte: Enkel, handlingsorienterad checklista för att uppfylla GDPR-krav och förbereda/teckna DPA med leverantörer (t.ex. Supabase).

## Översikt
- [ ] Identifiera ansvarig person (personuppgiftsansvarig) och kontaktinfo (e‑post/telefon).
- [ ] Dokumentera databehandlingar i en "Record of Processing" (vad, varför, lagringstid, kategori av personuppgifter).

## Datainventering
- [ ] Lista alla personuppgiftskategorier (kundkontakt, adress, faktura, bilder, mm).
- [ ] Ange var data lagras (Supabase: tabeller, buckets, lokal lagring, tredjepartsverktyg).
- [ ] Kartlägg dataflöden till tredjepartsleverantörer.

## Rättslig grund & ändamål
- [ ] Ange rättslig grund för varje behandling (avtal, samtycke, berättigat intresse).
- [ ] Skriv korta ändamålsbeskrivningar per behandling.

## Lagringstid och radering
- [ ] Bestäm standardlagringstider (t.ex. konto: tills raderad, bokföring: 7 år).
- [ ] Implementera rutiner/skript för radering eller anonymisering.

## Samtycke och cookies
- [ ] Säkerställ cookie-banner (fungerar och loggar val).
- [ ] Initiera analytics först efter samtycke.
- [ ] Spara bevis på samtycke (t.ex. trygghand_cookie_consent).

## Personuppgiftsbiträden (DPA)
- [ ] Lista alla leverantörer (Supabase, Stripe, Google, mm).
- [ ] Begär/insamla leverantörens DPA (Supabase: kontakta support om standard‑DPA).
- [ ] Kontrollera sub‑processors och datalagrings‑regioner.
- [ ] Teckna och arkivera undertecknat DPA.

## Tekniska och organisatoriska åtgärder
- [ ] Begränsa nycklar: SUPABASE_SERVICE_ROLE endast server‑side.
- [ ] Använd miljövariabler för hemligheter; hantera i hostingens secrets.
- [ ] Roll‑ och åtkomstkontroll i Supabase (minsta privilegium).
- [ ] Kryptering i vila & i transit (kontrollera leverantörens nivåer).
- [ ] Säkerhetskopiering och återställningsrutiner dokumenterade.

## Incidenthantering
- [ ] Definiera intern process för dataincident (upptäckt → åtgärd → rapport).
- [ ] Ange tidsram för extern rapportering (IMY / tillsynsmyndighet: inom 72 h vid allvarlig incident).
- [ ] Kontaktinfo och ansvarig för incidentkommunikation.

## Användares rättigheter
- [ ] Rutiner för att hantera förfrågningar: åtkomst, rättelse, radering, begränsning, dataportabilitet.
- [ ] Mall‑epost / formulär för att ta emot begäran.
- [ ] Intern process: verifiering, utförande, dokumentation (svar inom 30 dagar).

## Revision & dokumentation
- [ ] Spara DPA, registreringar och incidenter i central plats (ex: /policies eller säker lagring).
- [ ] Schemalägg årlig genomgång av personuppgiftsregister och DPA.
- [ ] Dokumentera ändringar i databehandling och tekniska kontroller.

## Support‑flöde (kundhjälp)
- [ ] Skapa /clearcookies‑ruta för att rensa lokala consent‑cookies.
- [ ] Server‑endpoint för att ogiltigförklara sessioner (revocation) — kör endast server‑side med SUPABASE_SERVICE_ROLE + skyddad nyckel.
- [ ] Instruktioner för support: hur rensa cookies lokalt (webbläsar‑steg) och hur använda revoke‑endpoint.

## Checklista innan produktion / release
- [ ] Undertecknat DPA med Supabase (om krav).
- [ ] GDPRinfo‑sida och cookie‑policy publicerad och länkad i footer.
- [ ] Cookie‑banner testad i alla vyer (desktop/mobil) och analytics blockerad tills samtycke.
- [ ] Miljövariabler och secrets verifierade i hosting.
- [ ] Incident‑ och registerförfrågeprocess testad internt.

## Mallkontakt för Supabase (e‑postförslag)
Kopiera och skicka vid behov:
> Hej Supabase,  
> Vi använder Supabase för [ändamål]. Vi behöver ett databehandlaravtal (DPA) samt information om era sub‑processors och datalagringsregioner. Företag: [Namn], Org.nr: [xxxx], Kontakt: [namn, e‑post]. Vänligen återkom med DPA och signeringsinstruktioner.

---

Senast uppdaterad: 2025-10-16
