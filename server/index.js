import { createRequire } from "module";
const require = createRequire(import.meta.url);

const express = require("express");
const multer = require("multer");
require("dotenv").config();

const upload = multer();
const app = express();
const PORT = process.env.PORT || 5174;

app.post("/api/gemini", upload.any(), async (req, res) => {
  try {
    console.log("POST /api/gemini - files:", (req.files || []).map((f) => f.originalname));
    const filenames = (req.files || []).map((f) => f.originalname).join(", ") || "inga filer";
    return res.json({ analysis: `Server placeholder analysis for: ${filenames}` });
  } catch (err) {
    console.error("Proxy error:", err && (err.stack || err.message || err));
    return res.status(500).json({ error: "Proxy error", details: (err && err.message) || String(err) });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled error middleware:", err && (err.stack || err.message || err));
  res.status(500).json({ error: "Unhandled server error" });
});

app.listen(PORT, () => {
  console.log(`Proxy server listening on http://localhost:${PORT}`);
});