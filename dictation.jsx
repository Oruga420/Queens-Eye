// Dictation bot. Web Speech API + /api/agent for full create/edit/delete on the calendar.
const Dictation = ({ style: dictStyle, events, onCreateEvent, onUpdateEvent, onDeleteEvent }) => {
  const [open, setOpen] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const [transcript, setTranscript] = React.useState("");
  const [history, setHistory] = React.useState([
    { role: "bot", text: "Hi. Tell me what to add, move, or cancel. For edits, give the day and time and I will find it." },
  ]);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState(null);

  const recRef = React.useRef(null);
  const finalRef = React.useRef("");

  // Keep a live ref to events so async tool calls always reference current state.
  const eventsRef = React.useRef(events);
  React.useEffect(() => { eventsRef.current = events; }, [events]);

  const supportsSpeech = typeof window !== "undefined"
    && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startRecording = () => {
    setError(null);
    setTranscript("");
    finalRef.current = "";
    if (!supportsSpeech) {
      setError("Voice input is not supported in this browser. Type your request below.");
      return;
    }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript((finalRef.current + " " + interim).trim());
    };
    rec.onerror = (ev) => {
      setError(ev.error === "not-allowed" ? "Microphone permission denied." : `Speech error: ${ev.error}`);
      setRecording(false);
    };
    rec.onend = () => {
      setRecording(false);
      const text = (finalRef.current || transcript || "").trim();
      if (text) callAgent(text);
    };

    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch (err) {
      setError(`Could not start microphone: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (recRef.current) { try { recRef.current.stop(); } catch (_) {} }
  };

  const fmtWhen = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  };

  const summarizeMutation = (m) => {
    if (m.type === "create") return `Added "${m.event.title}" on ${fmtWhen(m.event.start)}.`;
    if (m.type === "update") {
      const e = (eventsRef.current || []).find((x) => x.id === m.id);
      const title = e?.title || "event";
      const parts = [];
      if (m.patch?.title) parts.push(`title to "${m.patch.title}"`);
      if (m.patch?.start) parts.push(`start to ${fmtWhen(m.patch.start)}`);
      if (m.patch?.end) parts.push(`end to ${fmtWhen(m.patch.end)}`);
      if (m.patch?.where) parts.push(`location to ${m.patch.where}`);
      if (m.patch?.cal) parts.push(`calendar to ${m.patch.cal}`);
      return `Updated "${title}" (${parts.join(", ") || "no fields"}).`;
    }
    if (m.type === "delete") {
      const e = (eventsRef.current || []).find((x) => x.id === m.id);
      return `Deleted "${e?.title || m.id}".`;
    }
    return null;
  };

  const applyMutation = (m) => {
    if (m.type === "create" && onCreateEvent) {
      onCreateEvent({
        title: m.event.title,
        company: m.event.company || "",
        startISO: m.event.start,
        endISO: m.event.end,
        cal: m.event.cal,
        where: m.event.where,
        who: m.event.who,
      });
    } else if (m.type === "update" && onUpdateEvent) {
      const patch = { ...m.patch };
      if (patch.start) patch.start = new Date(patch.start);
      if (patch.end) patch.end = new Date(patch.end);
      onUpdateEvent(m.id, patch);
    } else if (m.type === "delete" && onDeleteEvent) {
      onDeleteEvent(m.id);
    }
  };

  const callAgent = async (text) => {
    setHistory((h) => [...h, { role: "user", text }]);
    setThinking(true);
    setError(null);
    try {
      const convo = history
        .filter((m) => m.role === "bot" || m.role === "user")
        .concat([{ role: "user", text }])
        .slice(-12)
        .map((m) => ({ role: m.role === "bot" ? "assistant" : "user", content: m.text }));

      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: convo,
          events: (eventsRef.current || []).map((e) => ({
            id: e.id, title: e.title, cal: e.cal, where: e.where, who: e.who,
            start: e.start instanceof Date ? e.start.toISOString() : e.start,
            end: e.end instanceof Date ? e.end.toISOString() : e.end,
          })),
          nowISO: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`agent ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();

      // Apply mutations in order.
      const mutations = Array.isArray(data.mutations) ? data.mutations : [];
      mutations.forEach(applyMutation);

      const lines = [];
      if (data.reply) lines.push(data.reply);
      const summaries = mutations.map(summarizeMutation).filter(Boolean);
      if (summaries.length) lines.push(summaries.join(" "));

      const botText = lines.join("\n").trim() || (mutations.length ? "Done." : "(no response)");
      setHistory((h) => [...h, { role: "bot", text: botText }]);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setHistory((h) => [...h, { role: "bot", text: `Error: ${err.message || "unknown"}` }]);
    } finally {
      setThinking(false);
      setTranscript("");
      finalRef.current = "";
    }
  };

  const sendText = () => {
    const v = input.trim();
    if (!v) return;
    setInput("");
    callAgent(v);
  };

  if (!open) {
    if (dictStyle === "fab") {
      return (
        <button onClick={() => setOpen(true)} style={dc.fab} aria-label="Open dictation">
          <Icon name="mic" size={20} />
        </button>
      );
    }
    if (dictStyle === "orb") {
      return (
        <button onClick={() => setOpen(true)} style={dc.orb} aria-label="Open dictation">
          <span style={dc.orbInner} />
          <span style={dc.orbCore} />
        </button>
      );
    }
    if (dictStyle === "panel") {
      return (
        <button onClick={() => setOpen(true)} style={dc.panelClosed}>
          <Icon name="sparkle" size={14} />
          <span>Ask Queens-eye</span>
        </button>
      );
    }
    return (
      <button onClick={() => setOpen(true)} style={dc.pill}>
        <span style={dc.pillDot} />
        <span style={{ color: "var(--ink-2)", fontSize: 12.5 }}>Tap to speak</span>
        <Icon name="wave" size={20} />
      </button>
    );
  }

  return (
    <div style={dc.panel}>
      <div style={dc.head}>
        <div style={dc.headL}>
          <div style={dc.headOrb}><span style={dc.orbInnerSm} /></div>
          <div>
            <div style={dc.headTitle}>Queens-eye <span className="serif" style={{ color: "var(--ink-3)" }}>· assistant</span></div>
            <div style={dc.headSub}>Voice or text. Add, move, or cancel events.</div>
          </div>
        </div>
        <button style={dc.iconBtn} onClick={() => setOpen(false)} aria-label="Close">
          <Icon name="x" size={14} />
        </button>
      </div>

      <div style={dc.body}>
        {history.map((m, i) => (
          <div key={i} style={m.role === "bot" ? dc.bubBot : dc.bubUser}>{m.text}</div>
        ))}
        {thinking && (
          <div style={dc.bubBot}>
            <span style={dc.dot} /> <span style={{ ...dc.dot, animationDelay: "0.15s" }} /> <span style={{ ...dc.dot, animationDelay: "0.3s" }} />
          </div>
        )}
        {error && <div style={dc.errorBox}>{error}</div>}
      </div>

      {recording && (
        <div style={dc.transcriptBar}>
          <span style={dc.recDot} />
          <span style={dc.transcriptText}>{transcript || "Listening…"}</span>
        </div>
      )}

      <div style={dc.foot}>
        <button
          onClick={() => recording ? stopRecording() : startRecording()}
          style={{ ...dc.micBtn, ...(recording ? dc.micBtnRec : {}) }}
          aria-label={recording ? "Stop" : "Record"}
          title={supportsSpeech ? "" : "Voice input not supported in this browser"}
        >
          {recording ? <Icon name="stop" size={14} /> : <Icon name="mic" size={16} />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          placeholder="Add, move, or cancel an event…"
          style={dc.input}
        />
        <button style={dc.sendBtn} onClick={sendText} aria-label="Send">
          <Icon name="send" size={14} />
        </button>
      </div>

      <style>{`
        @keyframes qe-dot { 0%, 60%, 100% { opacity: 0.3; } 30% { opacity: 1; } }
        @keyframes qe-pulse { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes qe-orb { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
      `}</style>
    </div>
  );
};

const dc = {
  fab: {
    position: "fixed", right: 24, bottom: 24, zIndex: 50,
    width: 52, height: 52, borderRadius: "50%",
    background: "var(--ink)", color: "var(--bg)",
    boxShadow: "var(--shadow-lg)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  orb: {
    position: "fixed", right: 28, bottom: 28, zIndex: 50,
    width: 56, height: 56, borderRadius: "50%",
    background: "radial-gradient(circle at 35% 30%, oklch(0.85 0.1 270), oklch(0.45 0.13 270))",
    boxShadow: "var(--shadow-lg), 0 0 0 4px rgba(255,255,255,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  orbInner: { position: "absolute", inset: 8, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.4)" },
  orbCore: { width: 10, height: 10, borderRadius: "50%", background: "white", animation: "qe-orb 2.4s ease-in-out infinite" },
  orbInnerSm: { width: 8, height: 8, borderRadius: "50%", background: "white" },
  panelClosed: {
    position: "fixed", right: 24, bottom: 24, zIndex: 50,
    display: "flex", alignItems: "center", gap: 8,
    padding: "10px 14px", borderRadius: 10,
    background: "var(--panel)", border: "1px solid var(--line)",
    boxShadow: "var(--shadow-md)", color: "var(--ink-2)", fontSize: 12.5,
  },
  pill: {
    position: "fixed", right: 24, bottom: 24, zIndex: 50,
    display: "flex", alignItems: "center", gap: 10,
    padding: "8px 14px 8px 12px", borderRadius: 999,
    background: "var(--panel)", border: "1px solid var(--line)",
    boxShadow: "var(--shadow-md)",
    color: "var(--ink-2)",
  },
  pillDot: { width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" },
  panel: {
    position: "fixed", right: 24, bottom: 24, zIndex: 50,
    width: 360, maxHeight: "min(620px, calc(100vh - 48px))",
    display: "flex", flexDirection: "column",
    background: "var(--panel)", border: "1px solid var(--line)",
    borderRadius: 16, boxShadow: "var(--shadow-lg)",
    overflow: "hidden",
  },
  head: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid var(--line)" },
  headL: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  headOrb: { width: 26, height: 26, borderRadius: "50%", background: "radial-gradient(circle at 35% 30%, oklch(0.85 0.1 270), oklch(0.45 0.13 270))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headTitle: { fontSize: 13, fontWeight: 600 },
  headSub: { fontSize: 11, color: "var(--ink-3)" },
  iconBtn: { width: 26, height: 26, borderRadius: 6, color: "var(--ink-3)", display: "flex", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 },
  bubBot: { alignSelf: "flex-start", maxWidth: "85%", background: "var(--line-2)", color: "var(--ink-2)", borderRadius: "12px 12px 12px 4px", padding: "9px 12px", fontSize: 12.5, lineHeight: 1.45, whiteSpace: "pre-wrap" },
  bubUser: { alignSelf: "flex-end", maxWidth: "85%", background: "var(--ink)", color: "var(--bg)", borderRadius: "12px 12px 4px 12px", padding: "9px 12px", fontSize: 12.5, lineHeight: 1.45 },
  errorBox: { background: "rgba(184,51,42,0.1)", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 8, padding: "8px 10px", fontSize: 12 },
  dot: { display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "var(--ink-3)", margin: "0 2px", animation: "qe-dot 1.2s infinite" },
  transcriptBar: { display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderTop: "1px solid var(--line)", background: "var(--line-2)" },
  recDot: { width: 8, height: 8, borderRadius: "50%", background: "var(--warn)", boxShadow: "0 0 0 0 var(--warn)", animation: "qe-pulse 1.2s infinite" },
  transcriptText: { fontSize: 12.5, color: "var(--ink)", fontStyle: "italic" },
  foot: { display: "flex", alignItems: "center", gap: 6, padding: 10, borderTop: "1px solid var(--line)" },
  micBtn: { width: 34, height: 34, borderRadius: 10, background: "var(--line-2)", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  micBtnRec: { background: "var(--warn)", color: "white" },
  input: { flex: 1, height: 34, border: 0, background: "transparent", fontSize: 13, color: "var(--ink)", outline: "none", padding: "0 6px", fontFamily: "inherit" },
  sendBtn: { width: 34, height: 34, borderRadius: 10, background: "var(--ink)", color: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};

window.Dictation = Dictation;
