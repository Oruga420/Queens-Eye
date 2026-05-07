// POST /api/parse-event
// Body: { text: string, nowISO: string }
// Returns: { title, startISO, endISO?, cal?, where?, who?[] }
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You parse a short natural-language request into a structured calendar event.

Return STRICT JSON, no prose, no markdown fences. Schema:
{
  "title": string,
  "startISO": string (ISO 8601 with timezone offset),
  "endISO": string | null (omit or null if duration unstated; default to start + 30 minutes),
  "cal": "work" | "personal" | "team" | "focus" | "ext" | null,
  "where": string | null,
  "who": string[] | null
}

Rules:
- Resolve relative dates ("today", "tomorrow", "next Monday") relative to nowISO.
- Default duration = 30 minutes if not stated.
- Cal heuristics: meetings/1:1/sync/standup/board/hiring -> "work". coffee/lunch/yoga/dentist/family -> "personal". team-internal -> "team". focus/deep work/inbox/memo -> "focus". external customer/partner/press -> "ext".
- If ambiguous, prefer "personal".
- Do not invent attendees that were not mentioned.
- Output ONLY the JSON object.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY not configured on server." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const text = (body?.text || "").toString().trim();
  const nowISO = (body?.nowISO || new Date().toISOString()).toString();
  if (!text) {
    res.status(400).json({ error: "Missing 'text' in body." });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        { role: "user", content: `nowISO: ${nowISO}\nrequest: ${text}` },
      ],
    });
    const raw = msg.content?.[0]?.type === "text" ? msg.content[0].text : "";
    const jsonStart = raw.indexOf("{");
    const jsonEnd = raw.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      res.status(502).json({ error: "Model did not return JSON.", raw });
      return;
    }
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
    res.status(200).json(parsed);
  } catch (err) {
    console.error("parse-event error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
