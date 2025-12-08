# Implementerad: Villkorad Laddning av Google Analytics

## Sammanfattning
Google Analytics (GA) spårningsskript laddas **ENDAST** när:
1. Användaren är **utloggad** (inte inloggad i portalen)
2. Användaren har **godkänt** statistik-cookies via cookie-bannern

## Implementerade Filer

### 1. `/src/components/GoogleAnalytics.tsx` (NY)
**Funktion:** Villkorsstyrd laddning av GA-skript baserat på:
- Användarens inloggningsstatus (via `useAuth`)
- Cookie-samtycke (`trygghand_cookie_consent`)

**Logik:**
```typescript
if (GA_MEASUREMENT_ID && !user && hasAnalyticsConsent) {
  // Ladda GA-skript dynamiskt
}
```

**Konfiguration:**
- GA-cookies sätts med `cookie_expires: 365 * 24 * 60 * 60` (12 månader)
- Säkerhetsflags: `SameSite=Lax;Secure`

### 2. `/src/App.tsx` (UPPDATERAD)
**Ändring:** Lade till `<GoogleAnalytics />` komponenten i App-trädets rot:
```tsx
<AuthProvider>
  <CookieBanner />
  <GoogleAnalytics />  // ← NY
  <QueryClientProvider>
```

Detta säkerställer att GA-komponenten har tillgång till autentiseringskontext och körs på alla sidor.

### 3. `/src/components/CookieBanner.tsx` (UPPDATERAD)
**Ändring:** När användaren accepterar analytics-cookies, laddar sidan om för att aktivera GA:
```typescript
const acceptAll = () => {
  setCookie(COOKIE_NAME, JSON.stringify({ analytics: true, marketing: true }), 365);
  setVisible(false);
  window.dispatchEvent(new Event("cookieConsentGiven"));
  window.location.reload(); // ← Aktiverar GA omedelbart
};
```

### 4. `.env.example` (NY)
Dokumenterar konfigurationsvariabler:
```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

## Konfigurationssteg

### Steg 1: Lägg till GA Measurement ID
1. Skaffa ditt Google Analytics Measurement ID (format: `G-XXXXXXXXXX`)
2. Lägg till i `.env` filen:
   ```bash
   VITE_GA_MEASUREMENT_ID=G-YOUR-ACTUAL-ID
   ```

### Steg 2: Verifiera Cookie-Livslängd
✅ **Egen samtyckes-cookie (`trygghand_cookie_consent`):**
- Max-Age: `31536000` sekunder (12 månader)
- Redan korrekt implementerat i `CookieBanner.tsx`

✅ **Google Analytics cookies:**
- Livslängd: `365 * 24 * 60 * 60` sekunder (12 månader)
- Konfigurerat via `cookie_expires` i `GoogleAnalytics.tsx`

### Steg 3: Testa Implementationen

#### Test 1: Utloggad + Samtycke Godkänt
1. Öppna sidan i inkognitoläge
2. Acceptera "Acceptera alla" i cookie-bannern
3. Öppna DevTools → Network
4. Bekräfta att `googletagmanager.com/gtag/js` laddas
5. Kontrollera att GA-cookies sätts (Application → Cookies)

#### Test 2: Inloggad Användare
1. Logga in på portalen (`/portal`)
2. Öppna DevTools → Network
3. Bekräfta att **INGEN** begäran till `googletagmanager.com` görs
4. Källkoden ska **inte** innehålla GA-skriptet

#### Test 3: Samtycke Nekat
1. Rensa cookies (`/clearcookies`)
2. Välj "Endast nödvändiga" i cookie-bannern
3. Öppna DevTools → Network
4. Bekräfta att **INGEN** GA-begäran görs

## Tekniska Detaljer

### Serversidans Logik (Client-Side Rendering)
Detta är en React-app med CSR (Client-Side Rendering). Villkorsstyrd laddning sker:
- **Runtime:** När komponenten `GoogleAnalytics` körs i webbläsaren
- **Kontroll:** Via React hooks (`useEffect`, `useAuth`)
- **Resultat:** GA-skript **injiceras aldrig** i DOM för inloggade användare

### Säkerhet
- GA Measurement ID läses från miljövariabler (`import.meta.env.VITE_GA_MEASUREMENT_ID`)
- Ingen känslig data exponeras (API-nycklar finns endast på servern via `.env`)
- Skriptet laddas via HTTPS med `Secure` och `SameSite=Lax` flags

## GDPR-Efterlevnad

✅ **Krav uppfyllda:**
1. GA-spårning aktiveras **endast** efter uttryckligt samtycke
2. Cookie-livslängder överensstämmer med lagkrav (≤12 månader)
3. Inloggade användare spåras **inte** (skriptet laddas aldrig)
4. Användaren kan återkalla samtycke via `/clearcookies`

## Support och Felsökning

### Problem: GA laddas inte trots samtycke
**Lösning:**
1. Kontrollera att `VITE_GA_MEASUREMENT_ID` är satt i `.env`
2. Starta om dev-servern efter `.env`-ändringar
3. Rensa cache och cookies

### Problem: GA laddas för inloggade användare
**Lösning:**
1. Kontrollera att `useAuth()` returnerar korrekt `user`-objekt
2. Verifiera i DevTools Console: `console.log(user)` i `GoogleAnalytics.tsx`

### Problem: Cookie-livslängd fel
**Lösning:**
1. Inspektera cookie i DevTools → Application → Cookies
2. Kontrollera `Max-Age` eller `Expires` attribut
3. Bekräfta att värdet är ~31536000 sekunder

## Nästa Steg (Valfritt)

### 1. Google Tag Manager (GTM)
För avancerad tagghantering, byt till GTM:
- Ersätt `gtag.js` med GTM-containerskript
- Behåll samma villkorsstyrd laddning

### 2. Server-Side Tracking
För SSR/SSG (t.ex. Next.js):
- Flytta villkorslogik till server-komponenter
- Undvik att skicka GA-skript i HTML för inloggade users

### 3. Consent Management Platform (CMP)
För större webbplatser:
- Integrera med CMP-lösning (ex. OneTrust, Cookiebot)
- Behåll villkorsstyrd laddning baserat på CMP-status

## Kontakt
Vid frågor eller problem, kontakta utvecklingsteamet.
