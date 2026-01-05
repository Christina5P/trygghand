# Verify SQL Facit – Slutlig version

Detta dokument används för verifiering av säkerhet, RLS och RPC inför och efter drift.

> Använd kryssrutorna nedan för att markera status per kontrollpunkt.

---

## 1. Kontrollera att inga SECURITY DEFINER-views finns

- [ ] **Godkänd**
- [ ] **Ej godkänd**

```sql
SELECT relname, relkind
FROM pg_class
WHERE relkind = 'v'
AND relname = 'valuations';
```

**Förväntat resultat:**  
- 0 rader  
- eller view utan `SECURITY DEFINER`

**Kommentar / Avvikelse:**  
_

---

## 2. Kontrollera kund-RPC för valuations

- [ ] **Godkänd**
- [ ] **Ej godkänd**

```sql
SELECT proname, pg_get_function_identity_arguments(oid)
FROM pg_proc
WHERE proname LIKE 'customer_%valuation%';
```

**Verifiera att:**  
- Endast avsedda customer-RPC:er finns  
- Inga generella eller felaktigt namngivna funktioner

**Kommentar / Avvikelse:**  
_

---

## 3. Kontrollera admin-RPC för valuations

- [ ] **Godkänd**
- [ ] **Ej godkänd**

```sql
SELECT proname
FROM pg_proc
WHERE proname LIKE 'admin_%valuation%';
```

**Verifiera att:**  
- Admin-funktioner är tydligt separerade  
- Namngivning följer fastställd standard

**Kommentar / Avvikelse:**  
_

---

## 4. Verifiera att `valuations` inte nås via REST

- [ ] **Godkänd**
- [ ] **Ej godkänd**

```sql
-- Kör som authenticated user
SELECT * FROM public.valuations;
```

**Förväntat resultat:**  
- `ERROR` eller `404`  
- Tabellen ska inte vara direkt åtkomlig via REST

**Kommentar / Avvikelse:**  
_

---

## 5. Kontrollera RLS på bas-tabellen

- [ ] **Godkänd**
- [ ] **Ej godkänd**

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'valuations';
```

**Verifiera att:**  
- RLS är aktiverat  
- Endast avsedda policies finns  
- Ingen policy ger bred åtkomst till `anon` eller `authenticated`

**Kommentar / Avvikelse:**  
_

---

## Sammanfattning

- **Granskad av:**  
- **Datum:**  
- **Miljö (dev / test / prod):**  

**Övergripande status:**  
- [ ] Godkänd för drift  
- [ ] Kräver åtgärder innan drift
