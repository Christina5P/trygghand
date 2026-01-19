// MUST be first import to load env vars before other modules
import "./loadEnv.js";

import express from "express";
import multer from "multer";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";
import gdprDeleteRouter from "./routes/gdprDelete.js";
import contactRequestsRouter from "./routes/contactRequests.js";
import adminRouter from "./routes/admin.js";

const app = express();
app.use(express.json()); // För att kunna läsa JSON body
app.use(cors()); // Tillåt cross-origin requests

// Ensure files are available in memory for buffer access
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 3001;

// Kontrollera Gemini API key
const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
let genAI = null;
if (!apiKey) {
  console.warn("GEMINI_API_KEY saknas. /api/gemini kommer vara inaktiv.");
} else {
  genAI = new GoogleGenerativeAI(apiKey);
}

// Registrera routes
app.use("/api", gdprDeleteRouter);
app.use("/api", contactRequestsRouter);
app.use("/api/admin", adminRouter);

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
    if (!genAI) {
      return res.status(503).json({ error: "Gemini not configured" });
    }
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

// Template download endpoint
app.get('/api/templates/download', async (req, res) => {
  try {
    const { path, bucket } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'Path parameter required' });
    }

    const bucketName = (bucket ? String(bucket) : 'fullmakts-filer').trim();
    if (!['fullmakts-filer', 'abonnemang', 'case-documents'].includes(bucketName)) {
      return res.status(400).json({ error: 'Invalid bucket' });
    }

    // Use service role client to generate signed URL
    const { createClient } = await import('@supabase/supabase-js');
    const serviceClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await serviceClient.storage
      .from(bucketName)
      .download(String(path));

    if (error) {
      console.error('Storage error:', error);
      return res.status(404).json({ error: 'Template not found' });
    }

    const blob = data;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = String(path).split('/').pop() || 'file';
    const contentType = blob.type || (filename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/\r|\n|\"/g, '')}"`);
    res.status(200).send(buffer);
  } catch (err) {
    console.error('Template download error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Template list endpoint (service role)
app.get('/api/templates/list', async (req, res) => {
  try {
    const prefix = (req.query.prefix || 'fullmaktsmallar') + '';

    const { createClient } = await import('@supabase/supabase-js');
    const serviceClient = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Supabase list expects a folder path without leading slash.
    const normalizedPrefix = prefix.replace(/^\/+/, '').replace(/\/+$/, '');
    const { data, error } = await serviceClient.storage
      .from('fullmakts-filer')
      .list(normalizedPrefix, { limit: 100 });

    if (error) {
      console.error('Storage list error:', error);
      return res.status(500).json({ error: 'Could not list templates' });
    }

    const templates = (data || [])
      .filter((f) => !!f?.name)
      .map((f) => ({
        name: f.name,
        storage_path: `${normalizedPrefix}/${f.name}`,
      }));

    res.json({ templates });
  } catch (err) {
    console.error('Template list error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => console.log(`Proxy server running on http://localhost:${PORT}`));
