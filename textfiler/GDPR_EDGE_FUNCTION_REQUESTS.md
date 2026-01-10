# GDPR Edge Functions – exempelrequests

## Förutsättningar
- Du behöver en giltig JWT i `Authorization: Bearer <token>`.
- Edge Functions körs i Supabase. Byt ut `<PROJECT_REF>`.

Bas-URL:
- `https://<PROJECT_REF>.functions.supabase.co`

---

## Destruktiva admin-åtgärder (UUID + confirm)

### Soft delete kund

`POST /admin-soft-delete-customer`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/admin-soft-delete-customer" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"<CUSTOMER_UUID>","confirm":true}'
```

### Restore kund

`POST /admin-restore-customer`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/admin-restore-customer" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"<CUSTOMER_UUID>","confirm":true}'
```

### Restore valuation

`POST /admin-restore-valuation`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/admin-restore-valuation" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"valuation_id":"<VALUATION_UUID>","confirm":true}'
```

### Konvertera contact_request till kund (UUID + confirm)

`POST /convert-contact-to-customer`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/convert-contact-to-customer" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"contact_request_id":"<CONTACT_REQUEST_UUID>","confirm":true}'
```

---

## Innehållsskapande admin-åtgärder (fri text tillåten med skydd)

### Skapa/uppdatera case

`POST /admin-save-case`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/admin-save-case" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"case_id":null,"customer_id":"<CUSTOMER_UUID>","title":"Titel","description":"Beskrivning","status":"pending","created_at":null,"scheduled_date":null}'
```

### Lägg till case-kommentar

`POST /admin-add-case-comment`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/admin-add-case-comment" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"case_id":"<CASE_UUID>","comment":"Kommentar (max 2000 tecken)"}'
```

### Skapa subscription cancellation

`POST /admin-create-subscription-cancellation`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/admin-create-subscription-cancellation" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"customer_id":"<CUSTOMER_UUID>","subscription_id":null,"provider":"Telia","service_type":"bredband","custom_service_name":null,"notice_period":null,"last_due_date":null,"provider_contact":null,"notes":"Anteckning (max 2000)"}'
```

### Uppdatera subscription cancellation

`POST /admin-update-subscription-cancellation`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/admin-update-subscription-cancellation" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"cancellation_id":"<CANCELLATION_UUID>","status":"processing","notes":"(max 2000)"}'
```

### Sätt status (enum-only)

`POST /admin-set-subscription-cancellation-status`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/admin-set-subscription-cancellation-status" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"cancellation_id":"<CANCELLATION_UUID>","status":"completed"}'
```

### Lägg till cancellation comment

`POST /admin-add-cancellation-comment`

```bash
curl -sS -X POST \
  "https://<PROJECT_REF>.functions.supabase.co/admin-add-cancellation-comment" \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{"cancellation_id":"<CANCELLATION_UUID>","message":"Kommentar (max 2000)","is_internal":false}'
```

---

## Förväntade felkoder (exempel)

- `400` – ogiltig JSON, saknad `confirm`, ogiltig UUID, text för lång.
- `401` – saknar/ogiltig JWT.
- `403` – JWT OK men saknar admin-roll.
- `404` – objekt saknas.
- `409` – konflikt (t.ex. redan soft-deletad / inte soft-deletad vid restore).
- `500` – intern serverkonfiguration eller databaskörning misslyckades.
