# VERIFY_RLS.sql

Syfte: Verifiera att Row Level Security (RLS) och rollstyrning fungerar korrekt i produktion.

⚠️ Kör dessa tester i Supabase SQL Editor med olika roller (anon, authenticated, admin).

---

## 1. Grundkontroller

```sql
-- Kontrollera att RLS är aktiv
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname IN ('public', 'storage');
```

Förväntat: `rowsecurity = true` på alla tabeller med persondata.

---

## 2. Anonym användare (anon)

```sql
-- Ska MISSLYCKAS
SELECT * FROM public.customers;
SELECT * FROM public.cases;
SELECT * FROM public.contacts;
```

```sql
-- Ska LYCKAS
INSERT INTO public.contacts (name, email, message)
VALUES ('Test', 'test@test.se', 'Kontaktförfrågan');
```

---

## 3. Autentiserad användare (icke-admin)

```sql
-- Ska endast visa egna uppgifter
SELECT * FROM public.customers WHERE id = auth.uid();
SELECT * FROM public.cases;
```

```sql
-- Ska MISSLYCKAS
SELECT * FROM public.user_roles;
DELETE FROM public.contacts;
```

---

## 4. Admin-användare

```sql
-- Ska lyckas
SELECT * FROM public.contacts;
SELECT * FROM public.cases;
SELECT * FROM public.user_roles;
```

```sql
-- Admin CRUD-test
UPDATE public.contacts SET status = 'completed';
```

---

## 5. Storage – dokument

```sql
-- Autentiserad användare: endast egna filer
SELECT * FROM storage.objects WHERE bucket_id = 'documents';
```

```sql
-- Admin: full åtkomst
SELECT * FROM storage.objects;
```

---

## 6. Negativa tester (ska blockeras)

```sql
-- Kund försöker läsa annan kunds ärende
SELECT * FROM public.cases WHERE customer_id != auth.uid();
```

```sql
-- Kund försöker ta bort dokument
DELETE FROM storage.objects WHERE bucket_id = 'documents';
```

---

## 7. Slutsats

Om ovanstående beteenden uppfylls:

✅ RLS fungerar korrekt  
✅ Roller är korrekt separerade  
✅ GDPR art. 25 & 32 uppfylls

---

Ansvarig: Trygg Hand
Datum: 2025-12-21

