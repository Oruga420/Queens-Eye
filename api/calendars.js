// GET /api/calendars            -> { calendars: [...] }
// PUT /api/calendars  body: { calendars: [...] } -> stores in Neon
import { kvGet, kvSet, isAuthed } from "../lib/db.js";

const KEY = "calendars";

export default async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    if (req.method === "GET") {
      const value = await kvGet(KEY);
      res.status(200).json({ calendars: Array.isArray(value) ? value : null });
      return;
    }
    if (req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const calendars = Array.isArray(body?.calendars) ? body.calendars : [];
      await kvSet(KEY, calendars);
      res.status(200).json({ ok: true, count: calendars.length });
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("calendars handler:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
