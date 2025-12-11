// backend/routes/gdprDelete.js
/**
 * Express route för GDPR-borttagning
 * Körs på Node.js backend med säker service role key
 */

import express from "express";
import { deleteUserGDPR } from "../api/gdprDeleteUser.js";

const router = express.Router();

/**
 * POST /admin/gdpr-delete
 * Radera användare helt enligt GDPR
 */
router.post("/admin/gdpr-delete", async (req, res) => {
  try {
    const { userId, adminId, reason, adminPassword } = req.body;

    // Validering
    if (!userId || !adminId) {
      return res.status(400).json({
        success: false,
        error: "Missing userId or adminId",
      });
    }

    // Extra säkerhet: Verifiera admin-lösenord om det är konfigurerat
    const adminDeleteKey = process.env.ADMIN_DELETE_KEY;
    if (adminDeleteKey && adminPassword !== adminDeleteKey) {
      console.warn(`Unauthorized deletion attempt by ${adminId}`);
      return res.status(401).json({
        success: false,
        error: "Invalid admin credentials",
      });
    }

    // Anropa deletion-funktionen
    const result = await deleteUserGDPR({
      userId,
      adminId,
      reason: reason || "GDPR deletion request",
    });

    res.json(result);
  } catch (error) {
    console.error("Error in gdpr-delete route:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Unknown error",
    });
  }
});

export default router;
