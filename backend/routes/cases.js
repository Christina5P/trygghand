const express = require('express');
const db = require('../db');
const router = express.Router();

// Helper to get exec function (req.db preferred)
function execForReq(req) {
  return req.db ? req.db.query : db.query;
}

// POST /api/cases
router.post('/', async (req, res) => {
  const payload = req.body || {};
  // req.user should be set by your auth middleware
  const user = req.user || null;
  const isAdmin = !!(user && (user.is_admin || user.isAdmin || user.role === 'admin'));
  const sessionUserId = user && (user.id || user.user_id || user.sub) ? String(user.id || user.user_id || user.sub) : null;

  // Basic validation (adjust required fields as needed)
  if (!payload.title) {
    return res.status(400).json({ error: 'title is required' });
  }

  // Determine owner_id: admin may set owner_id explicitly; non-admin owner forced to session user
  const ownerId = (isAdmin && payload.owner_id) ? payload.owner_id : sessionUserId;
  if (!ownerId) {
    return res.status(400).json({ error: 'owner_id required (or auth must provide a user)' });
  }

  try {
    const exec = execForReq(req);
    const q = `
      INSERT INTO cases (title, description, owner_id, customer_id, status, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
      RETURNING id, owner_id, customer_id, status, created_at
    `;
    const params = [
      payload.title,
      payload.description || null,
      ownerId,
      payload.customer_id || null,
      payload.status || 'new',
      payload.metadata ? JSON.stringify(payload.metadata) : null
    ];
    const result = await exec(q, params);

    // Notis: nytt ärende (Node backend)
    try {
      await fetch("https://trygghand.netlify.app/.netlify/functions/create-notification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "case_status",
          ref_id: result.rows[0].id,
          ref_type: "case",
          actor_id: ownerId,
          recipient_id: payload.customer_id || null,
          payload: { status: payload.status || 'new' }
        })
      });
    } catch (e) {
      console.error("Notification error", e);
    }

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting case', err);
    if (err && err.code === '42501') {
      return res.status(403).json({ error: 'forbidden_by_rls' });
    }
    return res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;