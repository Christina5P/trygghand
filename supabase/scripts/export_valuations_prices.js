// Usage:
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in env (service role recommended)
// npm install @supabase/supabase-js
// node supabase/scripts/export_valuations_prices.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) in the environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

(async function main() {
  try {
    const { data, error } = await supabase
      .from('valuations')
      .select('id, price_sek, price_min_sek, price_max_sek, analysis_result')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const outDir = path.join(process.cwd(), 'supabase', 'exports');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const rows = [];
    // Header: id,price_sek,price_min_sek,price_max_sek,varde_min_from_analysis,varde_max_from_analysis
    rows.push('id,price_sek,price_min_sek,price_max_sek,varde_min_from_analysis,varde_max_from_analysis');

    (data || []).forEach((r) => {
      const vmin = r.analysis_result?.varde_min_sek ?? r.analysis_result?.varde_min ?? '';
      const vmax = r.analysis_result?.varde_max_sek ?? r.analysis_result?.varde_max ?? '';
      const line = [r.id ?? '', r.price_sek ?? '', r.price_min_sek ?? '', r.price_max_sek ?? '', vmin ?? '', vmax ?? '']
        .map((c) => String(c).replace(/"/g, '""'))
        .map((c) => `"${c}"`).join(',');
      rows.push(line);
    });

    const outPath = path.join(outDir, 'valuations_prices_export.csv');
    fs.writeFileSync(outPath, rows.join('\n'), 'utf8');
    console.log('Wrote', outPath);
  } catch (err) {
    console.error('Failed to export valuations:', err.message || err);
    process.exit(1);
  }
})();
