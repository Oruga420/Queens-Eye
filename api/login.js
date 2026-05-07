// POST /api/login  body: { passcode: string }  -> { ok: true } | 401
//
// Server-side passcode check. The valid passcode is read from QE_PASSCODE
// env var, defaulting to "let-me-in" when not set.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const passcode = (body?.passcode || "").toString();
  const expected = process.env.QE_PASSCODE || "let-me-in";
  if (passcode !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.status(200).json({ ok: true });
}
