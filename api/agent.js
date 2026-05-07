// POST /api/agent
// Body: { messages: [{role, content}], events: [{id,title,start,end,cal,where,who}], nowISO: string }
// Response: { reply: string, mutations: [ {type:"create",event:{...}} | {type:"update",id,patch:{...}} | {type:"delete",id} ] }
//
// Tool-use driven. The model picks one or more tools to mutate the calendar.
// If the request is ambiguous (e.g. "move my 3pm" matches multiple events),
// the model is instructed NOT to call a tool and to ask the user instead.
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are Queens-eye's calendar agent. You manage the user's calendar by calling tools.

Tools available:
- create_event: add a new event to the calendar
- update_event: change fields of an existing event (title, company, start, end, cal, where, who)
- delete_event: remove an event by id

Calendars (the only valid values for the "cal" field): queen, oru, house. The user will tell you which one.

Event input format the user will use (in any order, any language): a calendar (Queen, Oru, House), a company, an event name, a time, and a duration. You must extract all five into the create_event tool call. If a duration is not given, default to 30 minutes.

Rules:
1. When the user describes events to add, extract them and call create_event for each. Multiple events in one message means multiple tool calls.
2. To edit or delete: the user gives the day and time. Match against the provided events list. If exactly ONE event matches, call the tool. If MULTIPLE events match, do NOT call any tool. Reply asking which one (list candidates with their titles, companies, and times).
3. Resolve relative dates ("today", "tomorrow", "next Monday", "manana", "el viernes", "demain", etc.) relative to nowISO.
4. Default duration: 30 minutes if not stated.
5. If the user mentions a calendar name (Queen, Oru, House) anywhere in the request, use that. If they do not mention one, ask which calendar.
6. Always extract a "company" if mentioned. If absent, set company to an empty string.
7. If the user just asks a question (summary, prep, conflicts, focus time) WITHOUT asking to add/edit/delete, do not call tools. Reply concisely.
8. Reply in the SAME LANGUAGE the user wrote in. If they switch languages, switch with them.
9. Never use em dashes or en dashes. Use periods, commas, "to", or parentheses.
10. After calling create_event, your reply (if any) should be a short confirmation. Do not repeat the tool input verbatim.

Output ISO 8601 timestamps with timezone offset for start and end.`;

const TOOLS = [
  {
    name: "create_event",
    description: "Add a new calendar event.",
    input_schema: {
      type: "object",
      properties: {
        title:   { type: "string", description: "Event name." },
        company: { type: "string", description: "Company or org the event is for. Empty string if not given." },
        start:   { type: "string", description: "ISO 8601 with timezone offset, e.g. 2026-05-08T15:00:00-06:00" },
        end:     { type: "string", description: "ISO 8601 with timezone offset. Defaults to start + 30 minutes if not stated." },
        cal:     { type: "string", enum: ["queen", "oru", "house"] },
        where:   { type: "string", description: "Optional location or link." },
        who:     { type: "array", items: { type: "string" }, description: "Optional attendee names." },
      },
      required: ["title", "company", "start", "end", "cal"],
    },
  },
  {
    name: "update_event",
    description: "Change fields on an existing event. Pick the id from the events list provided. Only call when exactly one event matches the user's reference.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "The exact id of the existing event." },
        patch: {
          type: "object",
          properties: {
            title:   { type: "string" },
            company: { type: "string" },
            start:   { type: "string", description: "ISO 8601 with timezone." },
            end:     { type: "string", description: "ISO 8601 with timezone." },
            cal:     { type: "string", enum: ["queen", "oru", "house"] },
            where:   { type: "string" },
            who:     { type: "array", items: { type: "string" } },
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

function compactEvents(events) {
  if (!Array.isArray(events)) return [];
  return events.slice(0, 200).map((e) => ({
    id: e.id,
    title: e.title,
    company: e.company,
    start: e.start instanceof Date ? e.start.toISOString() : e.start,
    end: e.end instanceof Date ? e.end.toISOString() : e.end,
    cal: e.cal,
    where: e.where,
    who: e.who,
  }));
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

  const cleanMessages = messages
    .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
    .slice(-20)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 8000) }));

  const contextBlock = `nowISO: ${nowISO}
events (${events.length}):
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
