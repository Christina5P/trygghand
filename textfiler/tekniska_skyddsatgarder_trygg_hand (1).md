# Tekniska skyddsåtgärder – Trygg Hand

**Gäller för:** Trygg Hand – Från beslut till nytt kapitel  
**Verksamhet:** Helhetskoordinator för dödsbon och äldreflytt  
**System:** Webbapplikation byggd i React/Vite (TypeScript) med Supabase (PostgreSQL)  
**Giltig från:** 2026-01-01  

---

## 1. Syfte

Detta dokument beskriver de tekniska och organisatoriska skyddsåtgärder som vidtas av Trygg Hand för att säkerställa konfidentialitet, integritet, tillgänglighet och spårbarhet vid behandling av personuppgifter i enlighet med dataskyddsförordningen (GDPR), särskilt artiklarna 5, 24, 25 och 32.

Dokumentet är avsett att kunna bifogas vid:
- tillsyn från Integritetsskyddsmyndigheten (IMY)
- avtal med samarbetspartners
- kommunal eller offentlig upphandling
- informationsförfrågningar från registrerade

---

## 2. Systemöversikt

Trygg Hand använder en molnbaserad applikation med följande huvudkomponenter:

- **Frontend:** React/Vite med TypeScript
- **Backend/Databas:** Supabase (PostgreSQL)
- **Autentisering:** Supabase Auth (JWT-baserad)
- **Fillagring:** Supabase Storage
- **Åtkomstmodell:** Roll- och ägarbaserad åtkomst med Row Level Security (RLS)

All kommunikation sker över krypterade anslutningar (HTTPS/TLS).

---

## 3. Dataminimering och ändamålsbegränsning (GDPR art. 5.1 b–c)

Systemet är utformat för att endast behandla personuppgifter som är nödvändiga för respektive ändamål, exempelvis:

- kontaktuppgifter vid kontaktförfrågan
- kunduppgifter kopplade till ärenden
- dokument kopplade till fullmakter eller dödsboärenden

Ingen persondata exponeras publikt och inga onödiga fält lagras.

---

## 4. Åtkomstkontroll och behörighetsstyrning (GDPR art. 32.1 b)

### 4.1 Autentisering

- Endast autentiserade användare får åtkomst till skyddade resurser
- Autentisering sker via Supabase Auth
- JWT används för att identifiera användare vid varje databasförfrågan

### 4.2 Roller

Följande roller används:

- **Användare/kund:** Åtkomst endast till egna uppgifter
- **Administratör:** Åtkomst till samtliga ärenden och administrativa funktioner
- **Anonym:** Endast möjlighet att skicka kontaktförfrågan

### 4.3 Row Level Security (RLS)

Samtliga tabeller som innehåller personuppgifter är skyddade med Row Level Security.

Exempel på tillämpning:
- kunder kan endast läsa och uppdatera sina egna ärenden
- administratörer har full åtkomst där detta krävs för uppdragets utförande
- ingen anonym åtkomst till lagrad persondata

---

## 5. Skydd av dokument och filer (GDPR art. 32.1 a)

Dokument och filer lagras i Supabase Storage med strikt åtkomstkontroll.

Principer:
- endast dokumentägare eller administratör kan läsa filer
- dokument organiseras per användare och ändamål
- ingen publik åtkomst till dokument med personuppgifter

Särskilt känsliga handlingar, såsom fullmakter, omfattas av förstärkt behörighetskontroll.

---

## 6. Loggning och spårbarhet (GDPR art. 5.2 – ansvarsskyldighet)

För att säkerställa spårbarhet används en separat audit-logg.

### 6.1 Vad som loggas

- tekniska händelser (skapa, uppdatera, radera)
- typ av objekt (t.ex. ärende, dokument)
- tidpunkt
- användar-ID (pseudonymiserat)

### 6.2 Vad som inte loggas

- innehåll i dokument
- fritextfält med personuppgifter
- känsliga personuppgifter

### 6.3 Åtkomst till loggar

- endast administratör har läsrättighet
- loggar kan inte ändras eller raderas av användare

Loggningen används uteslutande för säkerhet, felsökning och regelefterlevnad.

---

## 7. Skydd mot obehörig ändring och radering

- Direkt åtkomst till databasen är begränsad
- Administrativa nycklar används aldrig i frontend
- Uppdatering och radering styrs strikt via RLS
- Kritiska tabeller saknar DELETE-rättigheter för vanliga användare

---

## 8. Lagringstid och radering

Personuppgifter lagras inte längre än nödvändigt för ändamålet.

Rutiner finns för:
- radering av avslutade ärenden
- anonymisering där radering inte är möjlig
- loggning av radering (utan att återskapa persondata)

---

## 9. Privacy by Design och Privacy by Default (GDPR art. 25)

Systemet är byggt enligt principerna om inbyggt dataskydd:

- standardinställningar ger minsta möjliga åtkomst
- inga publika datavyer för personuppgifter
- funktioner kräver explicit behörighet

---

## 10. Sammanfattning

Trygg Hand har implementerat tekniska och organisatoriska skyddsåtgärder som säkerställer att personuppgifter behandlas på ett säkert, transparent och lagenligt sätt.

Åtgärderna uppfyller kraven i GDPR avseende:
- konfidentialitet
- integritet
- tillgänglighet
- ansvarsskyldighet

Dokumentet revideras vid behov, minst årligen eller vid större systemförändringar.

---

**Fastställt av:** Trygg Hand  
**Datum:** 2025-12-21

