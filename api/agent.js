// POST /api/agent
// Body: { messages: [{role, content}], events: [{id,title,start,end,cal,where,who}], nowISO: string }
// Response: { reply: string, mutations: [ {type:"create",event:{...}} | {type:"update",id,patch:{...}} | {type:"delete",id} ] }
//
// Tool-use driven. The model picks one or more tools to mutate the calendar.
// If the request is ambiguous (e.g. "move my 3pm" matches multiple events),
// the model is instructed NOT to call a tool and to ask the user instead.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are Queens-eye's calendar agent. You manage a calendar by calling tools. Bias hard toward action: create the event with sensible defaults instead of asking. Reply in ONE short line.

TIMEZONE
All times are America/Toronto. You output Toronto-LOCAL date and time (no offsets, no Z). The frontend converts to a real timestamp. Output:
- "date": YYYY-MM-DD in Toronto. For "today" use the todayToronto context value. For "tomorrow" use todayToronto + 1 day.
- "start_local" and "end_local": 24-hour Toronto wall time as HH:MM. 8pm = 20:00. 9pm = 21:00. 9am = 09:00. 12pm = 12:00. Midnight = 00:00.
NEVER output an offset, NEVER output Z, NEVER output ISO with T. Just date plus HH:MM strings.

CALENDARS (the only valid "cal" values): "queen", "oru", "house".
Loose matching (case-insensitive, any language):
- queen, q, the queen, reina -> queen
- oru, o, oruga, work, trabajo -> oru
- house, home, casa, hogar, h, family, familia -> house
If the user did not name any calendar at all, default to "house".

INPUT FORMAT (loose, any order, any language)
The user types a comma- or space-separated message that contains some of:
- a verb cue: agrega, agendar, add, schedule, meeting, junta, evento, new, nueva
- a calendar (queen / oru / house, with the loose matches above)
- a company or topic, usually a short noun (e.g. "Vet", "Promise", "Shelby")
- a time or time range (e.g. "8pm 9pm", "8-9pm", "9am 10am", "manana 9am 1 hora")
- trailing free text describing what the meeting is about. THIS IS THE TITLE.

Verb cues are NOT the title. "agrega junta" means "add a meeting", not an event called "Junta".

If the user gives a time RANGE (e.g. "8pm 9pm"), it is ONE event with start=8pm and end=9pm. It is NOT two events.

If only a single time is given (e.g. "9am"), default the duration to 30 minutes.

If the user gives both an explicit title AND trailing description text, use the explicit title. If only trailing text is provided after the time, that text IS the title.

NEVER ASK CLARIFYING QUESTIONS WHEN CREATING
Pick the most reasonable defaults and create_event. The user can always edit afterwards. Defaults:
- calendar: "house" if not stated
- company: empty string if not stated
- title: derive from trailing text, or use the company as a fallback ("Meeting with Vet")
- duration: 30 min if no end time stated

EDITS AND DELETES
The user identifies the event by day and time (Toronto local). Match against the provided events list.
- If exactly ONE event matches, call update_event or delete_event.
- If MULTIPLE events match, do NOT call any tool. Reply with one short line listing the candidates and asking which one.

QUESTIONS (no mutation)
If the user is asking about the calendar (summary, prep, conflicts, focus time), do not call tools. Reply in one or two short lines.

OUTPUT STYLE
- Reply in the SAME LANGUAGE the user wrote in.
- One line maximum, terse and direct.
- Never use em dashes or en dashes. Use commas, periods, colons, "to", or parentheses.
- After creating, confirm in the format: "Added: <Cal>, <Company>, <Title> at <time>."
- After updating: "Updated <title> to <change>."
- After deleting: "Deleted <title>."
- After multi-create: one line summary like "Added 3 events." (do not list them).`;

const TOOLS = [
  {
    name: "create_event",
    description: "Add a new calendar event. Times are Toronto-local; do not output any timezone offset, the frontend handles that.",
    input_schema: {
      type: "object",
      properties: {
        title:       { type: "string", description: "What the meeting is about. The user's trailing description text usually goes here." },
        company:     { type: "string", description: "Company or topic. Empty string if not given." },
        cal:         { type: "string", enum: ["queen", "oru", "house"], description: "queen, oru, or house. home/casa/family map to house." },
        date:        { type: "string", description: "Toronto-local date as YYYY-MM-DD. For 'today' use the todayToronto value from context." },
        start_local: { type: "string", description: "Toronto-local 24-hour time as HH:MM. For 8pm use 20:00. For 9am use 09:00." },
        end_local:   { type: "string", description: "Toronto-local 24-hour time as HH:MM. If only a start time was given, set this to 30 minutes after start_local." },
        where:       { type: "string", description: "Optional location or link." },
        who:         { type: "array", items: { type: "string" }, description: "Optional attendee names." },
      },
      required: ["title", "company", "cal", "date", "start_local", "end_local"],
    },
  },
  {
    name: "update_event",
    description: "Change fields on an existing event. Pick the id from the events list. Only call when exactly one event matches the user's reference.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "Exact id of the existing event." },
        patch: {
          type: "object",
          properties: {
            title:       { type: "string" },
            company:     { type: "string" },
            cal:         { type: "string", enum: ["queen", "oru", "house"] },
            date:        { type: "string", description: "Toronto-local YYYY-MM-DD." },
            start_local: { type: "string", description: "Toronto-local HH:MM." },
            end_local:   { type: "string", description: "Toronto-local HH:MM." },
            where:       { type: "string" },
            who:         { type: "array", items: { type: "string" } },
          },
        },
      },
      required: ["id", "patch"],
    },
  },
  {
    name: "delete_event",
    description: "Remove an event by id. Only call when exactly one event matches the user's reference.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The exact id of the event to delete." },
      },
      required: ["id"],
    },
  },
];

function torontoParts(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const out = {};
  for (const p of dtf.formatToParts(d)) out[p.type] = p.value;
  return {
    date: `${out.year}-${out.month}-${out.day}`,
    time: `${out.hour === "24" ? "00" : out.hour}:${out.minute}`,
  };
}

function compactEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.slice(0, 200).map((e) => {
    const startISO = e.start instanceof Date ? e.start.toISOString() : e.start;
    const endISO = e.end instanceof Date ? e.end.toISOString() : e.end;
    const sp = torontoParts(startISO);
    const ep = torontoParts(endISO);
    return {
      id: e.id,
      title: e.title,
      company: e.company,
      cal: e.cal,
      where: e.where,
      who: e.who,
      date: sp?.date,
      start_local: sp?.time,
      end_local: ep?.time,
    };
  });
}

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
  const events = compactEvents(body?.events);
  const nowISO = (body?.nowISO || new Date().toISOString()).toString();
  const userTZ = (body?.userTZ || "America/Toronto").toString();
  const nowOffset = (body?.nowOffset || "-04:00").toString();
  const todayToronto = (body?.todayToronto || nowISO.slice(0, 10)).toString();
  const nowToronto = (body?.nowToronto || nowISO).toString();

  const cleanMessages = messages
    .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  const contextBlock = `userTZ: ${userTZ}
todayToronto: ${todayToronto}
nowToronto: ${nowToronto}
events (${events.length}, with toronto-local date and time):
${JSON.stringify(events, null, 0)}`;

  // Inject context into the most recent user message so the model has it.
  const lastIdx = cleanMessages.map((m) => m.role).lastIndexOf("user");
  if (lastIdx >= 0) {
    cleanMessages[lastIdx] = {
      role: "user",
      content: `[context]\n${contextBlock}\n[/context]\n\n${cleanMessages[lastIdx].content}`,
    };
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: TOOLS,
      messages: cleanMessages,
    });

    let reply = "";
    const mutations = [];
    for (const block of msg.content || []) {
      if (block.type === "text") reply += block.text;
      else if (block.type === "tool_use") {
        if (block.name === "create_event") {
          mutations.push({ type: "create", event: block.input });
        } else if (block.name === "update_event") {
          mutations.push({ type: "update", id: block.input.id, patch: block.input.patch || {} });
        } else if (block.name === "delete_event") {
          mutations.push({ type: "delete", id: block.input.id });
        }
      }
    }
    res.status(200).json({ reply: reply.trim(), mutations });
  } catch (err) {
    console.error("agent error:", err);
    res.status(500).json({ error: err.message || "Internal error" });
  }
}
