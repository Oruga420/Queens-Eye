// GET  /api/events            -> { events: [...] }
// PUT  /api/events  body: { events: [...] } -> stores and returns { ok, count }
//
// Single hardcoded key. No auth. For one-user deployments only.
import { kv } from "@vercel/kv";

const KEY = "qe:events";

function isAuthed(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || "";
  const expected = "Bearer " + (process.env.QE_PASSCODE || "let-me-in");
  return auth === expected;
}

export default async function handler(req, res) {
  if (!isAuthed(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    if (req.method === "GET") {
      const events = (await kv.get(KEY)) || [];
      res.status(200).json({ events });
      return;
    }
    if (req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const events = Array.isArray(body?.events) ? body.events : [];
      await kv.set(KEY, events);
      res.status(200).json({ ok: true, count: events.length });
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("events handler:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
