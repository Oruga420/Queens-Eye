// GET /api/events            -> { events: [...] }
// PUT /api/events  body: { events: [...] } -> stores in Neon and returns { ok, count }
import { kvGet, kvSet, isAuthed } from "../lib/db.js";

const KEY = "events";

export default async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    if (req.method === "GET") {
      const value = await kvGet(KEY);
      const events = Array.isArray(value) ? value : [];
      res.status(200).json({ events });
      return;
    }
    if (req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const events = Array.isArray(body?.events) ? body.events : [];
      await kvSet(KEY, events);
      res.status(200).json({ ok: true, count: events.length });
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("events handler:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
