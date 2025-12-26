Export valuations prices

This folder contains a small Node script to export valuation price fields into a CSV suitable for uploading to Supabase Table Editor.

Files:
- export_valuations_prices.js — Node script that queries `valuations` and writes `supabase/exports/valuations_prices_export.csv`.
- ../exports/valuations_prices_template.csv — CSV template you can edit and re-upload to the table editor.

Run (locally):

1. Install dependency if needed:

   npm install @supabase/supabase-js

2. Set env vars (get from Project -> Settings -> API in Supabase):

   export SUPABASE_URL="https://xyzcompany.supabase.co"
   export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

3. Run the script:

   node supabase/scripts/export_valuations_prices.js

4. The script writes `supabase/exports/valuations_prices_export.csv`. Download and open it to review before uploading.

Uploading to Table Editor:
- In Supabase console, go to Table Editor -> `valuations` -> Import CSV and select the generated file.
- Match columns (`id` -> id, `price_sek` -> price_sek, ...) and choose `Update existing rows by primary key` so the `id` column updates existing rows.

Security note:
- Use a Service Role key only on secure machines. Do not commit service role keys.
