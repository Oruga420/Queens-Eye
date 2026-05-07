// Dictation bot. Real Web Speech API + Claude-powered event parsing via /api/parse-event.
const Dictation = ({ style: dictStyle, onCreateEvent }) => {
  const [open, setOpen] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const [draft, setDraft] = React.useState(null);
  const [transcript, setTranscript] = React.useState("");
  const [history, setHistory] = React.useState([
    { role: "bot", text: "Hi Quinn. I can create events on your calendar. Tap the mic and say something like: schedule a 30 minute coffee with Priya tomorrow at 3." },
  ]);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState(null);

  const recRef = React.useRef(null);
  const finalRef = React.useRef("");

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
      if (text) parseAndDraft(text);
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
    if (recRef.current) {
      try { recRef.current.stop(); } catch (_) {}
    }
  };

  const parseAndDraft = async (text) => {
    setHistory((h) => [...h, { role: "user", text }]);
    setThinking(true);
    setError(null);
    try {
      const res = await fetch("/api/parse-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, nowISO: new Date().toISOString() }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`parse-event ${res.status}: ${errText}`);
      }
      const data = await res.json();
      if (!data.title || !data.startISO) throw new Error("Could not extract event details from that.");

      const startD = new Date(data.startISO);
      const endD = new Date(data.endISO || startD.getTime() + 30 * 60000);

      setDraft({
        title: data.title,
        startISO: data.startISO,
        endISO: data.endISO || endD.toISOString(),
        cal: data.cal || "personal",
        where: data.where,
        who: data.who,
        day: startD.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }),
        time: `${startD.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} to ${endD.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
        color: "oklch(0.62 0.14 35)",
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setHistory((h) => [...h, { role: "bot", text: `I couldn't parse that. ${err.message || ""}`.trim() }]);
    } finally {
      setThinking(false);
    }
  };

  const sendText = () => {
    const v = input.trim();
    if (!v) return;
    setInput("");
    parseAndDraft(v);
  };

  const confirmDraft = () => {
    if (!draft) return;
    onCreateEvent && onCreateEvent(draft);
    setHistory((h) => [...h, { role: "bot", text: `Added "${draft.title}". ${draft.day}, ${draft.time}.` }]);
    setDraft(null);
    setTranscript("");
    finalRef.current = "";
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
            <div style={dc.headSub}>Voice or text. Try: schedule coffee with Priya tomorrow at 3.</div>
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
        {draft && (
          <div style={dc.draftCard}>
            <div style={dc.draftHead}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: draft.color }} />
              <span style={dc.draftCal}>{draft.cal}</span>
            </div>
            <div style={dc.draftTitle}>{draft.title}</div>
            <div style={dc.draftMeta}>{draft.day} · {draft.time}</div>
            {draft.where && <div style={dc.draftMeta}>{draft.where}</div>}
            <div style={dc.draftActions}>
              <button style={dc.draftCancel} onClick={() => setDraft(null)}>Cancel</button>
              <button style={dc.draftConfirm} onClick={confirmDraft}>
                <Icon name="check" size={12} /> Add to calendar
              </button>
            </div>
          </div>
        )}
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
          placeholder="Or type an event…"
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
  bubBot: { alignSelf: "flex-start", maxWidth: "85%", background: "var(--line-2)", color: "var(--ink-2)", borderRadius: "12px 12px 12px 4px", padding: "9px 12px", fontSize: 12.5, lineHeight: 1.45 },
  bubUser: { alignSelf: "flex-end", maxWidth: "85%", background: "var(--ink)", color: "var(--bg)", borderRadius: "12px 12px 4px 12px", padding: "9px 12px", fontSize: 12.5, lineHeight: 1.45 },
  errorBox: { background: "rgba(184,51,42,0.1)", color: "var(--accent)", border: "1px solid var(--accent)", borderRadius: 8, padding: "8px 10px", fontSize: 12 },
  dot: { display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: "var(--ink-3)", margin: "0 2px", animation: "qe-dot 1.2s infinite" },
  draftCard: { background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 4 },
  draftHead: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-3)" },
  draftCal: { textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 },
  draftTitle: { fontSize: 14, fontWeight: 600 },
  draftMeta: { fontSize: 12, color: "var(--ink-2)" },
  draftActions: { display: "flex", gap: 8, marginTop: 8 },
  draftCancel: { flex: 1, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", color: "var(--ink-2)", fontSize: 12, fontWeight: 500 },
  draftConfirm: { flex: 2, padding: "8px 10px", borderRadius: 8, background: "var(--ink)", color: "var(--bg)", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 },
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
