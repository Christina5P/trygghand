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
