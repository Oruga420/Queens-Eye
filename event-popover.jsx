// Event details popover with real Edit / Reschedule / Cancel.
const EventPopover = ({ event, anchor, calendars, onClose, onUpdate, onDelete }) => {
  const ref = React.useRef(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });
  const [mode, setMode] = React.useState("view"); // "view" | "edit" | "reschedule"

  const [title, setTitle] = React.useState(event.title);
  const [where, setWhere] = React.useState(event.where || "");
  const [who, setWho] = React.useState((event.who || []).join(", "));
  const [calId, setCalId] = React.useState(event.cal);

  const toLocalInput = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [startStr, setStartStr] = React.useState(toLocalInput(event.start));
  const [endStr, setEndStr] = React.useState(toLocalInput(event.end));

  React.useEffect(() => {
    setTitle(event.title);
    setWhere(event.where || "");
    setWho((event.who || []).join(", "));
    setCalId(event.cal);
    setStartStr(toLocalInput(event.start));
    setEndStr(toLocalInput(event.end));
  }, [event.id]);

  React.useEffect(() => {
    if (!anchor || !ref.current) return;
    const a = anchor.getBoundingClientRect();
    const p = ref.current.getBoundingClientRect();
    let left = a.right + 12;
    let top = a.top - 4;
    if (left + p.width > window.innerWidth - 16) left = a.left - p.width - 12;
    if (top + p.height > window.innerHeight - 16) top = window.innerHeight - p.height - 16;
    if (top < 16) top = 16;
    setPos({ top, left });
  }, [anchor, mode]);

  React.useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!event) return null;
  const cal = calendars.find((c) => c.id === event.cal);

  const fmtDate = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const fmtT = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  const saveEdit = () => {
    onUpdate(event.id, {
      title: title.trim() || event.title,
      where: where.trim() || undefined,
      who: who.split(",").map((s) => s.trim()).filter(Boolean),
      cal: calId,
    });
    setMode("view");
  };

  const saveReschedule = () => {
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      alert("Invalid date or time.");
      return;
    }
    if (e <= s) {
      alert("End must be after start.");
      return;
    }
    onUpdate(event.id, { start: s, end: e });
    setMode("view");
  };

  const cancelEvent = () => {
    if (confirm(`Cancel "${event.title}"?`)) onDelete(event.id);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
      <div ref={ref} style={{ ...ep.pop, top: pos.top, left: pos.left }}>
        <div style={ep.row}>
          <div style={{ ...ep.calStripe, background: cal?.color }} />
          <div style={ep.calName}>{cal?.name}</div>
          <div style={{ flex: 1 }} />
          <button style={ep.iconBtn} onClick={onClose}><Icon name="x" size={14} /></button>
        </div>

        {mode === "view" && (
          <>
            <div style={ep.title}>{event.title}</div>
            <div style={ep.when}>
              <div style={ep.whenDay}>{fmtDate(event.start)}</div>
              <div className="mono" style={ep.whenTime}>{fmtT(event.start)} to {fmtT(event.end)}</div>
            </div>
            {event.where && (
              <div style={ep.metaRow}><Icon name="pin" size={13} /> <span>{event.where}</span></div>
            )}
            {event.who && event.who.length > 0 && (
              <div style={ep.metaRow}><Icon name="users" size={13} /> <span>{event.who.join(", ")}</span></div>
            )}
            <div style={ep.actions}>
              <button style={ep.actBtn} onClick={() => setMode("edit")}>Edit</button>
              <button style={ep.actBtn} onClick={() => setMode("reschedule")}>Reschedule</button>
              <button style={{ ...ep.actBtn, color: "var(--warn)" }} onClick={cancelEvent}>Cancel</button>
            </div>
          </>
        )}

        {mode === "edit" && (
          <>
            <label style={ep.label}>Title
              <input style={ep.input} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
            </label>
            <label style={ep.label}>Where
              <input style={ep.input} value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Location or link" />
            </label>
            <label style={ep.label}>Who (comma-separated)
              <input style={ep.input} value={who} onChange={(e) => setWho(e.target.value)} placeholder="Maya R., J. Liang" />
            </label>
            <label style={ep.label}>Calendar
              <select style={ep.input} value={calId} onChange={(e) => setCalId(e.target.value)}>
                {calendars.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <div style={ep.actions}>
              <button style={ep.actBtn} onClick={() => setMode("view")}>Back</button>
              <button style={{ ...ep.actBtn, background: "var(--ink)", color: "var(--bg)" }} onClick={saveEdit}>Save</button>
            </div>
          </>
        )}

        {mode === "reschedule" && (
          <>
            <label style={ep.label}>Start
              <input type="datetime-local" style={ep.input} value={startStr} onChange={(e) => setStartStr(e.target.value)} />
            </label>
            <label style={ep.label}>End
              <input type="datetime-local" style={ep.input} value={endStr} onChange={(e) => setEndStr(e.target.value)} />
            </label>
            <div style={ep.actions}>
              <button style={ep.actBtn} onClick={() => setMode("view")}>Back</button>
              <button style={{ ...ep.actBtn, background: "var(--ink)", color: "var(--bg)" }} onClick={saveReschedule}>Save</button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

const ep = {
  pop: {
    position: "fixed", zIndex: 41,
    width: 304,
    background: "var(--panel)", border: "1px solid var(--line)",
    borderRadius: 14, boxShadow: "var(--shadow-lg)",
    padding: "14px 16px",
    display: "flex", flexDirection: "column", gap: 10,
  },
  row: { display: "flex", alignItems: "center", gap: 8 },
  calStripe: { width: 4, height: 14, borderRadius: 2 },
  calName: { fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.6, fontWeight: 600 },
  iconBtn: { width: 24, height: 24, borderRadius: 6, color: "var(--ink-3)", display: "flex", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: 600, lineHeight: 1.3 },
  when: { display: "flex", flexDirection: "column", gap: 2 },
  whenDay: { fontSize: 13, color: "var(--ink)" },
  whenTime: { fontSize: 12, color: "var(--ink-3)" },
  metaRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-2)" },
  actions: { display: "flex", gap: 6, marginTop: 4, paddingTop: 10, borderTop: "1px solid var(--line)" },
  actBtn: {
    flex: 1, padding: "7px 8px", borderRadius: 7,
    background: "var(--line-2)", color: "var(--ink-2)", fontSize: 12, fontWeight: 500,
  },
  label: { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 },
  input: {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1px solid var(--line)", background: "var(--bg)",
    fontSize: 13, color: "var(--ink)", fontFamily: "inherit", outline: "none",
    textTransform: "none", letterSpacing: 0,
  },
};

window.EventPopover = EventPopover;
