
/backend/SupabaseEdgeFunction/analyze-image.ts
Importerar från "@google/generative-ai"
API-funktionen mellan appen och Gemini

/backend/SupabaseEdgeFunction/save-valuation.js
Tar emot den fullständiga datauppsättningen (originaldata + Gemini-analys + värdeberäkning) och uppdaterar den befintliga raden i tabellen valuations i Supabase.

Frontend:
/workspaces/trygghand/src/lib/services/geminiApiService.ts
Frontend-"bryggan" till analyze-image som är själva API-funktionen.
Här beskrivs prompten och intruktionerna till Gemini
import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { saveValuation } from "@/lib/valuations";
import { uploadImages } from "@/integrations/supabaseUpload";

/src/components/ValueEstimator.tsx
Gränssnittet för analysverktyget 
import { analyzeImageViaApi } from "@/lib/services/geminiApiService"; 
import { uploadImages } from '../integrations/supabaseUpload'; 
import { saveValuation } from "@/lib/valuations"; 

/src/components/ValuationManager.tsx
Gränssnitt "Skalet" för värdebedömningsverktyget som går att öppna/stänga
import ValueEstimator from "@/components/ValueEstimator";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useAuth } from "@/hooks/useAuth";


/src/integrations/supabaseUpload.ts
Laddar upp bilderna till Supabase Storage

/src/lib/valuations.ts
Sparar den nya värderingsposten, inklusive kund-ID, bild-URL:er och formulärdata, i tabellen valuations i supabase



import ValueEstimator from "@/components/ValueEstimator";


/src/pages/Portal/dialogs/ValuationDetailsDialog.tsx
Värderingskorten som visar detaljerad info i adminportalen
import { createClient, SupabaseClient } from '@supabase/supabase-js';


Sammanfattning av flödeskedjan

Frontend (ValuationsValuationDialogs) → Uppladdning (supabaseUploads).
Supabase Database (Insert) → Webhook → Edge Function Router (supabase edge function).
Router → analyze-image (Edge Function).
analyze-image → Anropar geminiAPIService (för AI-analys).
analyze-image → Anropar ValueEstimator (för värdeberäkning).
analyze-image → Anropar save-valuation (för att spara slutförd data).
AdminPortal → ValuationsView → Visar den uppdaterade datan i listan.
Admin Klick → ValuationDetailsDialog → Visar detaljerad rapport.