import express from "express";
import multer from "multer";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import saveValuationRouter from "./routes/save-valuation.js";

dotenv.config();

const app = express();
// Ensure files are available in memory for buffer access
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 5174;

// Kontrollera Gemini API key
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY saknas i .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

app.use("/api", saveValuationRouter);

/**
 * Konvertera FileBuffer till GenerativeImagePart
 */
function bufferToGenerativePart(file) {
  const base64 = file.buffer.toString("base64");
  return {
    inlineData: {
      data: base64,
      mimeType: file.mimetype,
    },
  };
}

// POST /api/gemini
app.post("/api/gemini", upload.any(), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "Inga filer skickade" });
    }

    const imageParts = req.files.map(bufferToGenerativePart);

    const prompt = `Du är expert på att värdera begagnade föremål på svenska. 
Analysera bilderna och ge kategori, skick, uppskattat värde, rekommendation, motivering och försäljningstips.`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const result = await model.generateContent([...imageParts, { text: prompt }]);
    const text = await result.response.text();

    return res.json({ analysis: text });
  } catch (err) {
    console.error("Gemini proxy error:", err && (err.message || err));
    return res.status(500).json({ error: "Proxy error", details: err && (err.message || String(err)) });
  }
});

app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));
