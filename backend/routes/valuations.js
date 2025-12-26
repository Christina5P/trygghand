import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// --- GDPR/SÄKERHET: Endast Icke-Exponerade Miljövariabler ska användas på servern! ---
// Vi använder endast SUPABASE_URL och SUPABASE_SERVICE_ROLE_KEY som LÄSES IN AV SERVERN.
// VIKTIGT: VITE_-prefixade variabler ska INTE finnas här, eftersom de exponeras av misstag.
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  // Detta är en kritisk serverkonfigurationsvarning!
  console.error("[valuations] FEL: SUPABASE_URL eller SERVICE_ROLE_KEY saknas!");
  // Servern bör inte tillåtas starta utan dessa i en produktionsmiljö.
  // Vi skapar en null-klient, men returnerar 500 vid anrop.
}

// Service Role Client (dbClient) används för ALLA operationer. 
// Även Auth-verifiering sker via Service Role Clienten.
const dbClient = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

/**
 * Funktion för att validera om användaren är administratör.
 * Detta är en temporär lösning som bör ersättas av anrop till en PostgREST function/view (t.ex. is_admin(uuid))
 * om du vill undvika att hämta hela kundobjektet.
 */
async function isAdmin(userId) {
    if (!dbClient) return false;
    // Använd public.profiles baserat på din databasstruktur
    const { data, error } = await dbClient
        .from("profiles") // Byt till din faktiska profiltabell
        .select("user_role") // Byt till din faktiska rollkolumn
        .eq("id", userId)
        .single();
    
    // Antar att 'admin' rollen har tilldelats.
    return !error && data?.user_role === 'admin'; 
}

// ----------------------------------------------------------------------------------
// GET /api/valuations
// Åtkomst för både kund (via RLS) och administratör
// ----------------------------------------------------------------------------------
router.get("/valuations", async (req, res) => {
  try {
    if (!dbClient) {
      return res.status(500).json({ error: "Server inte konfigurerad" });
    }

    // Kunden använder RLS/PostgREST som tar hand om filtreringen.
    // Denna server-side route kommer endast användas för admin-åtkomst eller debugging.
    
    // Du kan behålla detta GET-anrop för klienter som HAR Auth-token.
    // Låt klienten anropa PostgREST direkt i din React-kod för att dra nytta av RLS!
    // Att köra GET i en server-side route som denna med Service Role Key Kringgår RLS
    // och är därför ENDAST lämpligt för Admin-paneler som behöver läsa ALL data,
    // ELLER om du vill lägga till extra server-side logik.
    
    // OM DENNA ROUTE SKA ANVÄNDAS AV KUNDER: Den måste hantera token och 403-svar
    // istället för att bara ge 500 om kunden försöker anropa den utan RLS.

    return res.status(501).json({ error: "GET /api/valuations är inaktiv. Använd Supabase RLS direkt från klienten för GDPR-säker åtkomst." });

  } catch (err) {
    console.error("[valuations] Oväntat fel:", err);
    return res.status(500).json({ error: "Oväntat serverfel" });
  }
});

// ----------------------------------------------------------------------------------
// POST /api/valuations/save - GDPR: Säkerställer att ID:n matchar token
// Använder service_role för att garantera insert, men kontrollerar användarbehörighet.
// ----------------------------------------------------------------------------------
router.post("/valuations/save", async (req, res) => {
  try {
    if (!dbClient) {
      return res.status(500).json({ error: "Server inte konfigurerad" });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }
    
    // ANVÄND Service Role Client för Auth.getUser() för att verifiera token.
    const { data: userData, error: userError } = await dbClient.auth.getUser(token);
    
    if (userError || !userData?.user?.id) {
      console.warn("[valuations-save] Ogiltig token", userError?.message);
      return res.status(401).json({ error: "Ogiltig eller utgången token" });
    }

    const authUserId = userData.user.id;

    // --- DATAVALIDERING & SANERING (GDPR Art. 5: Minimering & Integritet) ---
    const { customer_id: requestedCustomerId, analysis, image_urls } = req.body || {};
    
    // 1. Sanera 'analysis' (fixar .trim() kraschen)
    const sanitizedAnalysis = typeof analysis === "string" ? analysis.trim().slice(0, 50000) : null;
    
    // 2. Definiera det ID som faktiskt ska användas.
    const effectiveCustomerId = requestedCustomerId || authUserId;

    // 3. GDPR: Förhindra att användare sparar data åt andra (om inte admin).
    if (requestedCustomerId && requestedCustomerId !== authUserId) {
        // Kontrollerar om användaren har behörighet att spara åt andra
        const userIsAdmin = await isAdmin(authUserId); 
        
        if (!userIsAdmin) {
            console.warn(`[valuations-save] Användare ${authUserId} försökte spara värdering för ${requestedCustomerId}`);
            return res.status(403).json({ error: "Förbjudet: Du får endast spara värderingar åt dig själv." });
        }
    }

    const insertPayload = {
      customer_id: effectiveCustomerId,
      analysis: sanitizedAnalysis,
      image_urls: image_urls || []
    };

    // --- ANVÄND RPC-FUNKTION FÖR ATT SKRIVA (Säkert och RLS-undantag) ---
    // Antar att 'insert_valuation' finns i schemat 'public' och hanterar 'valuations.valuations'.
    // Använd service role för att kringgå RLS
    const { data, error } = await dbClient
      .from("valuations.valuations") // <--- FIX: Använd korrekt schema/tabell
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error("[valuations-save] Insert misslyckades:", error);
      return res.status(500).json({ error: error.message, details: error });
    }

    return res.status(200).json({ data });
  } catch (err) {
    console.error("[valuations] Oväntat fel vid spara:", err);
    return res.status(500).json({ error: "Oväntat serverfel" });
  }
});


// ----------------------------------------------------------------------------------
// DELETE /api/valuations/:id - GDPR: Rätt till radering (RTE)
// ----------------------------------------------------------------------------------
router.delete("/valuations/:id", async (req, res) => {
  try {
    if (!dbClient) {
      return res.status(500).json({ error: "Server inte konfigurerad" });
    }

    const authHeader = req.headers.authorization || "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

    if (!token) {
      return res.status(401).json({ error: "Missing bearer token" });
    }

    // ANVÄND Service Role Client för Auth.getUser()
    const { data: userData, error: userError } = await dbClient.auth.getUser(token);
    
    if (userError || !userData?.user?.id) {
      return res.status(401).json({ error: "Ogiltig eller utgången token" });
    }

    const authUserId = userData.user.id;
    const valuationId = req.params.id;

    if (!valuationId) {
      return res.status(400).json({ error: "Missing valuation ID" });
    }

    // 1. Verifiera ägare/admin-status FÖRE radering
    const { data: valuation, error: fetchError } = await dbClient
      .from("valuations.valuations") // Använd korrekt schema/tabell
      .select("customer_id")
      .eq("id", valuationId)
      .single();

    if (fetchError || !valuation) {
      return res.status(404).json({ error: "Valuation not found" });
    }

    // Admin-check använder den nya async-funktionen
    const isAdminUser = await isAdmin(authUserId); 
    const isOwner = valuation.customer_id === authUserId;

    if (!isOwner && !isAdminUser) {
      console.warn(`[valuations-delete] Användare ${authUserId} försökte radera värdering ${valuationId}`);
      return res.status(403).json({ error: "Förbjudet: Du får endast radera dina egna värderingar" });
    }

    // 2. Utför radering med service_role (GDPR RTE)
    const { error: deleteError } = await dbClient
      .from("valuations.valuations") // Använd korrekt schema/tabell
      .delete()
      .eq("id", valuationId);

    if (deleteError) {
      console.error("[valuations-delete] Delete misslyckades:", deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[valuations-delete] Oväntat fel:", err);
    return res.status(500).json({ error: "Oväntat serverfel" });
  }
});

export default router;