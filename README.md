# Queens-eye

Calendar app with day / week / month views, a mini-month picker, multi-calendar color coding, current-time line, real CRUD on events, search, voice dictation (Web Speech API), and a Claude-powered briefing assistant.

## Stack

- React 18 via `@babel/standalone` (no build step on the client)
- Vercel serverless functions (`api/*.js`) using `@anthropic-ai/sdk`
- LocalStorage for event/calendar persistence
- Web Speech API for in-browser dictation

## Setup

```bash
cd "Queens-Eye"
npm install
cp .env.example .env.local
# edit .env.local and set ANTHROPIC_API_KEY=sk-ant-...
npm run dev
# opens on http://localhost:5173
```

`npm run dev` uses `vercel dev`, which serves the static files and runs the `/api/*` functions locally with the env vars from `.env.local`.

If you only want the static UI without the assistant or voice parsing, run:

```bash
npm run static
```

## Pages

- `Queens-eye Calendar.html` (default route) main calendar with toolbar, sidebar, day/week/month views, search, dictation bot, tweaks panel.
- `Queens-eye Assistant.html` chat UI. Paste a meeting list. Claude returns a summary, prep notes, focus blocks, and conflict detection.

## API

- `POST /api/parse-event` body `{ text, nowISO }` returns `{ title, startISO, endISO?, cal?, where?, who? }`. Used by the dictation bot to convert speech into a calendar draft.
- `POST /api/assistant` body `{ messages }` returns `{ reply }`. Used by the Assistant page for streaming-free, history-aware briefings.

Both use Claude Sonnet 4.6 with prompt caching on the system prompt.

## Persistence

Events and calendars are stored in `localStorage` under keys `qe.events.v1` and `qe.calendars.v1`. To reset, run `qeResetStorage()` in the browser console and reload.

## Deploy to Vercel

```bash
npx vercel
# follow prompts to link the project
npx vercel env add ANTHROPIC_API_KEY production
npx vercel --prod
```

The `vercel.json` rewrite maps `/` to `Queens-eye Calendar.html`.

## Module map

| File | Purpose |
| --- | --- |
| `app.jsx` | Root, toolbar, view routing, state, search filter, CRUD wiring |
| `storage.jsx` | LocalStorage load/save with Date revival |
| `sidebar.jsx` | Brand mark, mini-month, calendars list, up-next |
| `day-view.jsx` | Hourly grid with column-packed overlapping events + now-line |
| `week-view.jsx` | 7-column week grid, today highlight, now-line |
| `month-view.jsx` | 6 by 7 month grid, click day to drill into day view |
| `dictation.jsx` | Web Speech recording + POST /api/parse-event |
| `event-popover.jsx` | View / Edit / Reschedule / Cancel modes |
| `data.jsx` | Seed calendars and events on `window.QE_DATA` |
| `icons.jsx` | Inline SVG icon set |
| `tweaks-panel.jsx` | Runtime theme, accent, hour height, week start, dictation style |
| `api/parse-event.js` | Claude call to parse spoken text into structured event JSON |
| `api/assistant.js` | Claude call for the Assistant chat page |

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
--hour-h: 56px;
```

Fonts: Inter Tight (UI), Instrument Serif italic (display headings, dates), JetBrains Mono (time labels, agenda paste).

## Notes

- Voice input requires Chrome/Edge (webkitSpeechRecognition). Firefox/Safari users can type instead.
- The Assistant page sends the full conversation history to Claude on each turn (capped at 20 messages of 8 KB each).
- `_design/` holds the original handoff bundle. Safe to delete.
