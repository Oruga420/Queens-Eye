// GET  /api/calendars            -> { calendars: [...] }
// PUT  /api/calendars  body: { calendars: [...] } -> stores
import { kv } from "@vercel/kv";

const KEY = "qe:calendars";

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
      const calendars = (await kv.get(KEY)) || null;
      res.status(200).json({ calendars });
      return;
    }
    if (req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      const calendars = Array.isArray(body?.calendars) ? body.calendars : [];
      await kv.set(KEY, calendars);
      res.status(200).json({ ok: true, count: calendars.length });
      return;
    }
    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("calendars handler:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
