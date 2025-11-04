import express from "express";
import supabaseServer from "../../../../libs/shared/src/lib/supabase.server.js";
const supabase = supabaseServer;

const router = express.Router();

// bodyparser for JSON (if not applied globally in server)
router.use(express.json());

router.post("/save-valuation", async (req, res) => {
  try {
    let { customer_id, analysis_result, image_urls } = req.body;

    // Normalize customer_id: turn placeholder/invalid values to null
    if (!customer_id || customer_id === "_UNKNOWN_" || typeof customer_id === "string" && customer_id.trim() === "") {
      customer_id = null;
    }

    if (typeof analysis_result !== "string" || !Array.isArray(image_urls)) {
      return res.status(400).json({ error: "Ogiltiga parametrar" });
    }

    const payload = {
      customer_id,
      analysis_result,
      image_urls,
    };

    const { data, error } = await supabase.from("valuations").insert(payload).select();

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: error.message || "Fel vid sparande" });
    }

    return res.json({ success: true, data });
  } catch (err) {
    console.error("Error saving valuation:", err);
    return res.status(500).json({ error: err?.message || "Okänt fel" });
  }
});

export default router;