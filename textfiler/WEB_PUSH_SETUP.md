# Web Push för kundportalen (Trygg Hand)

## Val av trigger-strategi
Val: **B) App-lagret via säkrade Edge Functions**.

Motivering:
- `cases` och `case_comments` skapas redan via Edge Functions i projektet.
- Enkel och robust implementation utan extra Postgres HTTP-extension-beroenden.
- Håller `service_role` enbart server-side och följer befintlig arkitektur.

## GDPR och säkerhet
- Push-payload innehåller endast teknisk metadata: `type`, `caseId`, `messageId`, `url`.
- Titel/body genereras server-side i `send-push` med **generisk text**.
- Inga meddelandetexter, namn, personnummer, adresser, belopp eller annan känslig data skickas i push.
- URL för klick är endast portal-routes (`/portal...`) och kräver inloggning i appen.
- Inga service keys i frontend.

## Nya tabeller
Migration: `supabase/migrations/20260303110000_create_push_notifications.sql`

Skapar:
- `public.push_subscriptions`
- `public.push_notification_preferences`
- `public.push_delivery_state`

Ingår:
- RLS-policies för own/select/insert/delete enligt auth.uid
- admin/service-läsning via policy
- `updated_at` trigger
- retention-funktion: `public.purge_inactive_push_subscriptions(interval)`

## VAPID keys
Generera nycklar lokalt (Node):

```bash
node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log('PUBLIC='+k.publicKey); console.log('PRIVATE='+k.privateKey);"
```

## Supabase secrets
Sätt secrets i projektet:

```bash
supabase secrets set \
  PUSH_VAPID_PUBLIC_KEY="<PUBLIC_KEY>" \
  PUSH_VAPID_PRIVATE_KEY="<PRIVATE_KEY>" \
  PUSH_VAPID_SUBJECT="mailto:kontakt@trygghand.com"
```

Frontend (Vite env):

```bash
VITE_PUSH_VAPID_PUBLIC_KEY=<PUBLIC_KEY>
```

För lokal utveckling (rekommenderat):

```bash
echo 'VITE_PUSH_VAPID_PUBLIC_KEY=<PUBLIC_KEY>' >> .env.local
npm run dev:push
```

## Deploy
1. Kör migrationer:

```bash
supabase db push
```

2. Deploya funktioner:

```bash
supabase functions deploy send-push
supabase functions deploy add-case-comment
supabase functions deploy admin-add-case-comment
supabase functions deploy admin-save-case
```

## Lokal smoke test (innan deploy)
1. Starta Supabase lokalt om det inte redan kör:

```bash
supabase start
```

2. Sätt lokala function-secrets (använd testnycklar):

```bash
supabase secrets set \
  PUSH_VAPID_PUBLIC_KEY="<PUBLIC_KEY>" \
  PUSH_VAPID_PRIVATE_KEY="<PRIVATE_KEY>" \
  PUSH_VAPID_SUBJECT="mailto:kontakt@trygghand.com"
```

3. Kör funktionen lokalt:

```bash
supabase functions serve send-push --no-verify-jwt
```

4. Hämta din lokala service role key:

```bash
grep SUPABASE_SERVICE_ROLE_KEY supabase/.env
```

5. Testa invoke (ersätt placeholders):

```bash
curl -i -X POST "http://127.0.0.1:54321/functions/v1/send-push" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -d '{
    "userId": "<USER_UUID>",
    "type": "new_message",
    "caseId": "<CASE_UUID>",
    "messageId": "<MESSAGE_UUID>",
    "url": "/portal?caseId=<CASE_UUID>"
  }'
```

6. Förväntat resultat:
- HTTP 200 med `ok: true`.
- `delivered` > 0 om användaren har giltig subscription.
- `deleted` ökar om endpoints är ogiltiga (404/410).
- Inga fulla endpoint-URL:er i logs (maskerade värden).

## Event-flöde
- Nytt ärende via `admin-save-case` -> anropar `send-push` (`type: case_update`).
- Nytt meddelande via `add-case-comment`/`admin-add-case-comment` -> anropar `send-push` (`type: new_message`).

`send-push` gör:
- Hämtar subscriptions för `userId`.
- Filtrerar på preferenser/kategorier.
- Respekterar quiet hours.
- Rate-limitar (20 sek) och batchar snabba events.
- Rensar subscriptions vid `404/410`.
- Maskerar endpoint i logs.

## Testplan
### Chrome Android / Desktop Chrome
1. Logga in i kundportal.
2. Slå på "Aktivera notiser".
3. Slå på minst en kategori, t.ex. "Nytt meddelande".
4. Skapa nytt meddelande i ett ärende via admin eller kundflöde.
5. Verifiera push i bakgrund (stäng tabben men ha browser aktiv).
6. Klicka notis -> portal öppnas på säker route (`/portal?caseId=...`).

### Safari iOS
- Web Push kräver installerad webbapp (Add to Home Screen) på iOS 16.4+.
- Testa från hemskärmsikon, inte vanlig Safari-tab.
- Om ej stöds: UI visar fallback "Din webbläsare stödjer inte push-notiser".

## Underhåll
- Kör rensning t.ex. månadsvis:

```sql
select public.purge_inactive_push_subscriptions(interval '18 months');
```

- Rekommendation: kör via scheduler/cron.
