# Trygg Hand

## Development

- Install: `npm install`
- Run dev (frontend + backend): `npm run dev`
- Build: `npm run build`
- Preview: `npm run start`

## Feature flags

### Phone login (hidden by default)

Phone/SMS login UI is implemented but hidden unless explicitly enabled.

- Enable in local `.env` or in your deploy environment variables:
  - `VITE_ENABLE_PHONE_LOGIN=true`

When enabled, the **Telefon** tab becomes visible in the portal auth UI.

## Supabase / SQL

Personal data; stored for service delivery (contract).

See Supabase helper scripts in [supabase/scripts/README.md](supabase/scripts/README.md).

## GDPR export (admin)

Manual fallback via curl (replace placeholders):

```bash
curl -X POST "$SUPABASE_URL/functions/v1/gdpr-export" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{"request_id":"<REQUEST_ID>","action":"generate"}'
```

Admin download test (signed URL):

```bash
curl -X POST "$SUPABASE_URL/functions/v1/gdpr-export" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{"request_id":"<REQUEST_ID>","action":"download"}'
```

## GDPR cleanup (admin)

```bash
curl -X POST "$SUPABASE_URL/functions/v1/gdpr-maintenance" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -d '{"action":"cleanup","older_than_days":7}'
```

### Troubleshooting: `PGRST002` / schema cache errors

If the portal can’t fetch data and you see errors like `PGRST002` and/or logs similar to:

> Failed to load the schema cache ... `schema "valuations" does not exist`

Then PostgREST is configured to expose a schema that no longer exists.

## SEO/OG checklist (landningssidor)

Använd denna checklista när en ny sida ska delas korrekt i Facebook/LinkedIn.

1. Sätt explicita SEO-taggar på sidan (`title`, `description`, `canonical`, `og:url`, `og:image`) med absoluta URL:er.
2. Lägg OG-bild i `public/` (t.ex. `public/my-page-og.jpg`) så filen blir statisk i `dist/`.
3. Säkerställ att Netlify-regler för bild-URL:en ligger före SPA-fallback (`/* /index.html 200`).
4. Lägg till route i prerender-konfigurationen så bots får statisk HTML med rätt meta-tags.
5. Kör `npm run build` och verifiera:
  - att `dist/<route>/index.html` innehåller rätt `canonical` + `og:*`
  - att OG-bilden har MIME `image/jpeg` eller `image/png`.

Exempel för MIME-koll:

```bash
file --mime-type public/my-page-og.jpg dist/my-page-og.jpg
```

Efter deploy:

1. Öppna Facebook Sharing Debugger för sidans URL.
2. Klicka `Scrape Again` 2–3 gånger tills cache är uppdaterad.
3. Bekräfta titel, beskrivning och bild i debugger-resultatet.

## Reoptimera befintliga handplockat-bilder

För äldre annonser (skapade innan bildoptimeringen) finns ett script som konverterar stora `image_cutout`/`images_cutout` till mindre WebP i `handplockat-public`.

Krav:

- `SUPABASE_URL` (eller `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

Kör först dry-run:

```bash
npm run images:reoptimize-handplockat
```

Kör sedan write-mode:

```bash
npm run images:reoptimize-handplockat:write
```

Valfria flaggor:

- `--limit=50`
- `--only-id=<listing-id>`
- `--max-dimension=1600`
- `--quality=82`
