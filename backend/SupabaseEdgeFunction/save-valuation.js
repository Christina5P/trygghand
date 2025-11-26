// supabase/functions/save-valuation/index.ts (Edge Function)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
    // Initialisera Supabase Server Client
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    // Kontrollera metod (om du inte gör det via inställningar)
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        const { customer_id, analysis_result, image_urls } = await req.json(); // Läs body

        let customerIdToUse = customer_id;
        // Normalize customer_id: turn placeholder/invalid values to null
        if (!customerIdToUse || customerIdToUse === "_UNKNOWN_" || typeof customerIdToUse === "string" && customerIdToUse.trim() === "") {
            customerIdToUse = null;
        }

        if (typeof analysis_result !== "string" || !Array.isArray(image_urls)) {
            return new Response(JSON.stringify({ error: "Ogiltiga parametrar" }), { status: 400 });
        }

        const payload = {
            customer_id: customerIdToUse,
            analysis_result,
            image_urls,
        };

        const { data, error } = await supabase.from("valuations").insert(payload).select();

        if (error) throw error;

        // Skicka framgångsrikt svar
        return new Response(JSON.stringify({ success: true, data }), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
        });
        
    } catch (err) {
        // Hantera fel
        console.error("Error saving valuation:", err);
        const errorMessage = err instanceof Error ? err.message : "Okänt fel";
        
        return new Response(JSON.stringify({ error: errorMessage }), { 
            status: 500, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }
});