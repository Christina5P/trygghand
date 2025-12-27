-- Migration: add price fields to valuations and backfill from analysis_result/analysis
-- Run in Supabase SQL editor or psql connected to your database

BEGIN;

-- 1) Add nullable columns for normalized prices
ALTER TABLE IF EXISTS valuations
  ADD COLUMN IF NOT EXISTS price_sek integer,
  ADD COLUMN IF NOT EXISTS price_min_sek integer,
  ADD COLUMN IF NOT EXISTS price_max_sek integer;

-- 2) Backfill from JSON fields (analysis_result or analysis)
-- Handles numeric strings and numeric values. Uses coalesce to prefer explicit price, then min/max.

-- Set single price from analysis_result.price or analysis.price
UPDATE valuations
SET price_sek = (
  CASE
    WHEN (analysis_result->>'price') IS NOT NULL AND (analysis_result->>'price') ~ '^\\d+$' THEN (analysis_result->>'price')::integer
    WHEN (analysis->>'price') IS NOT NULL AND (analysis->>'price') ~ '^\\d+$' THEN (analysis->>'price')::integer
    WHEN (analysis_result->>'price') IS NOT NULL THEN NULL
    ELSE price_sek
  END
)
WHERE (analysis_result->>'price') IS NOT NULL OR (analysis->>'price') IS NOT NULL;

-- Set min/max from analysis_result.varde_min_sek / varde_max_sek or analysis.varde_min_sek / varde_max_sek
UPDATE valuations
SET
  price_min_sek = (
    CASE
      WHEN (analysis_result->>'varde_min_sek') IS NOT NULL AND (analysis_result->>'varde_min_sek') ~ '^\\d+' THEN (analysis_result->>'varde_min_sek')::integer
      WHEN (analysis->>'varde_min_sek') IS NOT NULL AND (analysis->>'varde_min_sek') ~ '^\\d+' THEN (analysis->>'varde_min_sek')::integer
      ELSE price_min_sek
    END
  ),
  price_max_sek = (
    CASE
      WHEN (analysis_result->>'varde_max_sek') IS NOT NULL AND (analysis_result->>'varde_max_sek') ~ '^\\d+' THEN (analysis_result->>'varde_max_sek')::integer
      WHEN (analysis->>'varde_max_sek') IS NOT NULL AND (analysis->>'varde_max_sek') ~ '^\\d+' THEN (analysis->>'varde_max_sek')::integer
      ELSE price_max_sek
    END
  )
WHERE (analysis_result->>'varde_min_sek') IS NOT NULL OR (analysis_result->>'varde_max_sek') IS NOT NULL OR (analysis->>'varde_min_sek') IS NOT NULL OR (analysis->>'varde_max_sek') IS NOT NULL;

-- 3) If min/max exist but single price missing, set price_sek to min as a sensible default
UPDATE valuations
SET price_sek = price_min_sek
WHERE price_sek IS NULL AND price_min_sek IS NOT NULL;

COMMIT;

-- Notes:
-- - Review a small sample before running on production.
-- - If analysis_result stores numbers in other keys, extend the UPDATE queries.
-- - Optionally add indexes on price_sek for faster filtering: CREATE INDEX ON valuations(price_sek);
