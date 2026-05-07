# Queens-eye

Calendar app where the user creates, edits, and cancels events through a Claude-powered chat agent. Voice or text. Two surfaces share the same data:

- **Calendar page** with a floating dictation/chat bot.
- **Brief Assistant page** (separate tab) with a wider chat box.

Both write to the same `localStorage`, so anything created in one surface appears in the other on reload.

## Calendars

Three fixed calendars: **Queen**, **Oru**, **House**. Each event also has a **Company** tag. Event cards always show calendar + company + title (time is implicit from the card position).

## Event input format

Tell either bot, in any language: which calendar (Queen/Oru/House), the company, the event name, the time, and the duration. Example:

> "Queen, Promise, kickoff with Mark, mañana 9am, 1 hora"

The agent extracts all fields and adds the event. For edits, give the day and time. If multiple events match, the agent asks which one.

## Stack

- React 18 via `@babel/standalone` (no client build).
- Vercel serverless function `api/agent.js` using `@anthropic-ai/sdk` (Claude Sonnet 4.6) with tool use.
- LocalStorage for persistence.
- Web Speech API for in-browser dictation.

## Setup

```bash
cd "Queens-Eye"
npm install
cp .env.example .env.local
# edit .env.local:
#   ANTHROPIC_API_KEY=sk-ant-...
#   QE_PASSCODE=let-me-in       (or any string you want)
npm run dev
# http://localhost:5173
```

`npm run dev` runs `vercel dev`, serving static files and the `/api/*` functions with env vars from `.env.local`.

## Auth

The whole app is gated by a passcode. The default is `let-me-in`. Wrong password redirects to `https://www.eloruga.com`. Change it via the `QE_PASSCODE` env var.

## Storage

Events and calendars sync to **Neon Postgres** so they appear in any browser you log into.
A single table `qe_kv (key TEXT PRIMARY KEY, value JSONB, updated_at TIMESTAMPTZ)` is
auto-created on first request. The browser keeps a localStorage cache so first paint
is instant; on mount the app hydrates from Neon.

To enable Neon after first deploy:

1. Vercel Dashboard -> your project -> Storage -> Create Database -> **Neon**.
2. Connect it to the project. Vercel auto-injects `DATABASE_URL` (and a few aliases).
3. Redeploy.

The driver is `@neondatabase/serverless`, which uses HTTPS and works from any
serverless function with no connection pool to manage.

## Deploy

```bash
npx vercel
npx vercel env add ANTHROPIC_API_KEY production
npx vercel env add QE_PASSCODE production
npx vercel --prod
```

`vercel.json` rewrites `/` to `Queens-eye Calendar.html`.

## API

`POST /api/agent`

Body:

```json
{
  "messages": [{ "role": "user", "content": "..." }],
  "events":   [{ "id": "...", "title": "...", "company": "...", "start": "ISO", "end": "ISO", "cal": "queen|oru|house", "where": "...", "who": ["..."] }],
  "nowISO":   "2026-05-07T..."
}
```

Returns:

```json
{
  "reply":     "natural-language reply or empty",
  "mutations": [
    { "type": "create", "event": { "title": "...", "company": "...", "start": "ISO", "end": "ISO", "cal": "queen", "where": "...", "who": [] } },
    { "type": "update", "id": "...", "patch": { "start": "ISO" } },
    { "type": "delete", "id": "..." }
  ]
}
```

The agent has three tools: `create_event`, `update_event`, `delete_event`. For ambiguous edit/delete requests (multiple events match the day+time given), the agent skips tool calls and asks the user to disambiguate.

## Module map

| File | Purpose |
| --- | --- |
| `app.jsx` | Root, toolbar, view routing, state, search filter, CRUD wiring |
| `storage.jsx` | LocalStorage load/save with Date revival (`qe.events.v2`) |
| `sidebar.jsx` | Brand mark, mini-month, calendars list, real Up Next |
| `day-view.jsx` | Hourly grid with column-packed overlapping events + now-line |
| `week-view.jsx` | 7-column week grid, today highlight, now-line |
| `month-view.jsx` | 6 by 7 month grid, click day to drill into day view |
| `dictation.jsx` | Web Speech recording + chat panel + POST /api/agent |
| `event-popover.jsx` | View / Edit / Reschedule / Cancel modes |
| `data.jsx` | Calendars (Queen/Oru/House) and empty event seed |
| `icons.jsx` | Inline SVG icons |
| `tweaks-panel.jsx` | Runtime theme, accent, hour height, week start, dictation style |
| `Queens-eye Assistant.html` | Standalone Brief Assistant chat (same agent, same storage) |
| `api/agent.js` | Single Claude tool-use endpoint for create/update/delete + Q&A |

## Design tokens

```css
--bg:     #f4ede0;   /* warm beige */
--panel:  #faf3e6;
--ink:    #2a1a10;
--ink-2:  #5a3e2a;
--ink-3:  #9a7e62;
--line:   #e6d8be;
--line-2: #efe4cd;
--accent: oklch(0.50 0.20 25);  /* scarlet */
--gold:   oklch(0.72 0.13 80);
```

Fonts: Inter Tight (UI), Instrument Serif italic (display dates), JetBrains Mono (time labels).

## Notes

- Voice input requires Chrome/Edge (`webkitSpeechRecognition`). Other browsers can type.
- Conversation history is capped at 12-20 turns per request, 8 KB per message.
- The agent prompt instructs the model never to use em dashes or en dashes.
- To reset local data, run `qeResetStorage()` in the console and reload.
