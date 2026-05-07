// POST /api/assistant
// Body: { messages: [{role: "user"|"assistant", content: string}, ...], agenda?: string }
// Streams a single non-streaming reply from Claude as { reply: string }.
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are Queens-eye's calendar assistant for an executive. Tone: terse, helpful, calm, concrete. No fluff.

When the user pastes an agenda or meeting list, on the FIRST message:
- Give a 1-line summary of the day (counts: total / external / focus / breaks).
- List the first 5 items concisely.
- End with one specific suggestion (prep notes, focus block, conflict).

On follow-ups: answer the specific question. If asked about prep, give 1-2 specific items per meeting. If asked about conflicts, name the overlap and propose a fix. If asked about focus time, propose one concrete window.

Never invent meetings the user did not mention. Never use em dashes or en dashes (use periods, commas, colons, or "to"). Use plain ASCII formatting (HTML <b>, <ul>, <li> are fine; no markdown).`;

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
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) {
    res.status(400).json({ error: "Missing 'messages' in body." });
    return;
  }

  // Sanitize incoming messages.
  const cleanMessages = messages
    .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: cleanMessages,
    });
    const reply = msg.content?.[0]?.type === "text" ? msg.content[0].text : "";
    res.status(200).json({ reply });
  } catch (err) {
    console.error("assistant error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
