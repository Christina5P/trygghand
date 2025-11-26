import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, Part } from "@google/generative-ai";

// --- SÄKER SERVER-SIDAN LOGIK ---

// 1. Initialisering och API-nyckel
// Använd process.env och INGEN VITE_ prefix. Keyn är endast tillgänglig på servern.
const apiKey = process.env.GEMINI_API_KEY; 
if (!apiKey) {
  console.error("FEL: GEMINI_API_KEY saknas i .env.local eller deployment settings.");
  throw new Error("API key not configured.");
}
const genAI = new GoogleGenerativeAI(apiKey);

// Svarstyp för API-anropet
type Data = {
  analysisJson: string;
} | {
  error: string;
};

// JSON-format som AI:n ska returnera (identiskt med din prompt)
const ANALYSIS_JSON_SCHEMA = `{
  "foremal_beskrivning": "Detaljerad beskrivning av föremålet/föremålen.",
  "skick": "Uppskattat skick (t.ex. 'Bra skick med normalt slitage').",
  "varde_min_sek": 0,
  "varde_max_sek": 0,
  "motivering": "Kortfattad motivering för prisintervallet baserat på märke, ålder och marknadstrender."
}`;


// Huvudfunktion som hanterar API-anropet
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Endast POST är tillåtet' });
  }

  try {
    const { imageParts, extraPrompt } = req.body as { imageParts: Part[], extraPrompt: string };
    
    if (!imageParts || imageParts.length === 0) {
      return res.status(400).json({ error: "Inga Base64 bilddelar mottogs." });
    }

    // 2. Skapa prompten (från din ursprungliga fil)
    const extraInfoText = extraPrompt && extraPrompt.trim() ? `\n\nYtterligare information från användaren: ${extraPrompt.trim()}` : "";
    const prompt = `Fyll i följande JSON-schema baserat på bilderna. Alltid svara exakt i detta format, inga extra kommentarer eller text utanför JSON-objektet:${extraInfoText}
${ANALYSIS_JSON_SCHEMA}
`;
    const systemInstruction = "Du är en expert på andrahandsvärdering av lösöre. Ditt enda uppdrag är att returnera värderingen i det strikta JSON-format som specificeras i användarprompten.";

    // Kombinera text och bilddata (Base64)
    const parts: Part[] = [
      { text: prompt }, 
      ...imageParts
    ];

    // 3. Anropa Gemini API (Säkert på servern)
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction 
    });

    const response = await model.generateContent({ 
      contents: [{ role: "user", parts: parts }],
      generationConfig: {
        temperature: 0.1, 
        responseMimeType: "application/json", 
      }
    } as any); 

   let candidateString: string | undefined = (response as any).text;

    if (!candidateString || candidateString.trim().length === 0) {
      console.error("Gemini returned empty response:", response);
      return res.status(500).json({ error: "AI returnerade inget användbart innehåll." });
    }

    // 4. Returnera det råa JSON-svaret till klienten
    // Klienten (ValueEstimator) hanterar sedan parsingen av denna sträng.
    return res.status(200).json({ analysisJson: candidateString });

  } catch (error) {
    console.error("FATAL ERROR in API route:", error);
    const errorMessage = error instanceof Error ? error.message : "Okänt serverfel vid AI-anrop.";
    res.status(500).json({ error: `AI-värderingen misslyckades: ${errorMessage}` });
  }
}