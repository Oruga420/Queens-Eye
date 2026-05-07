// Left sidebar: brand, mini-month, calendars list
const Sidebar = ({ cursor, setCursor, view, setView, calendars, toggleCal, weekStart, events = [] }) => {
  const [miniMonth, setMiniMonth] = React.useState(() => {
    const d = new Date(cursor); d.setDate(1); return d;
  });

  React.useEffect(() => {
    const d = new Date(cursor); d.setDate(1);
    setMiniMonth(d);
  }, [cursor.getMonth(), cursor.getFullYear()]);

  const monthLabel = miniMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const firstWeekday = (miniMonth.getDay() - (weekStart === "mon" ? 1 : 0) + 7) % 7;
  const daysInMonth = new Date(miniMonth.getFullYear(), miniMonth.getMonth() + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);
  while (cells.length % 7 !== 0) cells.push(null);

  const isSameDay = (a, b) => a && b && window.qeTzSameDay(a, b);

  const today = new Date();

  const dayLabels = weekStart === "mon"
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <aside style={sb.aside}>
      <div style={sb.brand}>
        <div style={sb.brandMark}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden>
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="12" r="3.2" fill="currentColor" />
            <circle cx="12" cy="12" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.5" />
          </svg>
        </div>
        <div>
          <div style={sb.brandName}>Queens-eye</div>
          <div style={sb.brandSub}>your day, observed</div>
        </div>
      </div>

      <button style={sb.createBtn} onClick={() => window.dispatchEvent(new CustomEvent("qe:new-event"))}>
        <Icon name="plus" size={14} />
        <span>New event</span>
        <span className="mono" style={sb.kbd}>⌘N</span>
      </button>

      <div style={sb.miniWrap}>
        <div style={sb.miniHead}>
          <div style={sb.miniMonth}>{monthLabel}</div>
          <div style={sb.miniNav}>
            <button style={sb.miniNavBtn} onClick={() => { const d = new Date(miniMonth); d.setMonth(d.getMonth() - 1); setMiniMonth(d); }}>
              <Icon name="chevron-left" size={14} />
            </button>
            <button style={sb.miniNavBtn} onClick={() => { const d = new Date(miniMonth); d.setMonth(d.getMonth() + 1); setMiniMonth(d); }}>
              <Icon name="chevron-right" size={14} />
            </button>
          </div>
        </div>
        <div style={sb.miniGrid}>
          {dayLabels.map((d, i) => <div key={i} style={sb.miniDow}>{d}</div>)}
          {cells.map((n, i) => {
            if (n === null) return <div key={i} />;
            const date = new Date(miniMonth.getFullYear(), miniMonth.getMonth(), n);
            const isToday = isSameDay(date, today);
            const isCursor = isSameDay(date, cursor);
            return (
              <button key={i}
                onClick={() => setCursor(date)}
                style={{
                  ...sb.miniCell,
                  ...(isToday ? sb.miniCellToday : {}),
                  ...(isCursor && !isToday ? sb.miniCellCursor : {}),
                }}>
                {n}
              </button>
            );
          })}
        </div>
      </div>

      <div style={sb.section}>
        <div style={sb.sectionHead}>
          <span>Calendars</span>
          <button style={sb.sectionAdd}><Icon name="plus" size={12} /></button>
        </div>
        <div style={sb.calList}>
          {calendars.map(c => (
            <label key={c.id} style={sb.calRow}>
              <span style={{ ...sb.calCheck, background: c.checked ? c.color : "transparent", borderColor: c.color }}>
                {c.checked && <Icon name="check" size={10} />}
              </span>
              <input type="checkbox" checked={c.checked} onChange={() => toggleCal(c.id)} style={{ display: "none" }} />
              <span style={sb.calName}>{c.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div style={sb.section}>
        <div style={sb.sectionHead}><span>Up next</span></div>
        <div style={sb.upNext}>
          {(() => {
            const now = new Date();
            const upcoming = events
              .filter((e) => (e.start instanceof Date ? e.start : new Date(e.start)) > now)
              .sort((a, b) => new Date(a.start) - new Date(b.start))
              .slice(0, 3);
            if (upcoming.length === 0) {
              return <div style={{ ...sb.upTitle, color: "var(--ink-3)", fontStyle: "italic", fontFamily: "Instrument Serif, serif" }}>Nothing upcoming. Ask the assistant.</div>;
            }
            return upcoming.map((e) => {
              const time = window.qeTzFmtShort(e.start);
              const calName = (calendars.find((c) => c.id === e.cal) || {}).name;
              const label = [calName, e.company, e.title].filter(Boolean).join(", ");
              return (
                <div key={e.id} style={sb.upRow}>
                  <div className="mono" style={sb.upTime}>{time}</div>
                  <div style={sb.upTitle}>{label}</div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={sb.foot}>
        <div style={sb.avatar}>QE</div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={sb.footName}>Quinn Ellery</div>
          <div style={sb.footSub}>quinn@apex.co</div>
        </div>
        <button style={sb.footBtn}><Icon name="settings" size={14} /></button>
      </div>
    </aside>
  );
};

const sb = {
  aside: {
    width: 264, flexShrink: 0,
    background: "var(--panel)",
    borderRight: "1px solid var(--line)",
    padding: "18px 16px 14px",
    display: "flex", flexDirection: "column", gap: 18,
    overflow: "hidden",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  brandMark: { color: "var(--accent)", display: "flex" },
  brandName: { fontWeight: 600, fontSize: 15, letterSpacing: -0.2 },
  brandSub: { fontSize: 11, color: "var(--ink-3)", fontStyle: "italic", fontFamily: "Instrument Serif, serif" },
  createBtn: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "9px 12px",
    background: "var(--ink)", color: "var(--bg)",
    borderRadius: 999, fontSize: 13, fontWeight: 500,
    boxShadow: "var(--shadow-sm)",
  },
  kbd: { marginLeft: "auto", fontSize: 10.5, opacity: 0.55 },
  miniWrap: { },
  miniHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  miniMonth: { fontSize: 13, fontWeight: 600 },
  miniNav: { display: "flex", gap: 2 },
  miniNavBtn: { width: 22, height: 22, borderRadius: 6, color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center" },
  miniGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 },
  miniDow: { fontSize: 10, color: "var(--ink-3)", textAlign: "center", padding: "4px 0", fontWeight: 500 },
  miniCell: {
    aspectRatio: "1 / 1", borderRadius: 6,
    fontSize: 11.5, color: "var(--ink-2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  miniCellToday: { background: "var(--accent)", color: "#faf3e6", fontWeight: 600 },
  miniCellCursor: { outline: "1px solid var(--accent)", color: "var(--accent)" },
  section: { },
  sectionHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    fontSize: 11, fontWeight: 600, color: "var(--ink-3)",
    textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8,
  },
  sectionAdd: { width: 18, height: 18, color: "var(--ink-3)", borderRadius: 4 },
  calList: { display: "flex", flexDirection: "column", gap: 4 },
  calRow: { display: "flex", alignItems: "center", gap: 9, padding: "4px 4px", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  calCheck: {
    width: 14, height: 14, borderRadius: 4,
    border: "1.5px solid", display: "flex", alignItems: "center", justifyContent: "center",
    color: "white", flexShrink: 0,
  },
  calName: { color: "var(--ink-2)" },
  upNext: { display: "flex", flexDirection: "column", gap: 6 },
  upRow: { display: "flex", alignItems: "baseline", gap: 10, fontSize: 12.5 },
  upTime: { color: "var(--ink-3)", fontSize: 11, width: 40, flexShrink: 0 },
  upTitle: { color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  foot: {
    display: "flex", alignItems: "center", gap: 10,
    paddingTop: 12, borderTop: "1px solid var(--line)",
  },
  avatar: {
    width: 30, height: 30, borderRadius: "50%",
    background: "var(--accent)", color: "#faf3e6",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 600, letterSpacing: 0.4,
    flexShrink: 0,
  },
  footName: { fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  footSub: { fontSize: 11, color: "var(--ink-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  footBtn: { color: "var(--ink-3)", padding: 6, borderRadius: 6 },
};

window.Sidebar = Sidebar;
