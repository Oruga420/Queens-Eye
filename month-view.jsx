// Month view — 6-row grid
const MonthView = ({ date, events, calendars, weekStart, onEventClick, setCursor, setView }) => {
  const calMap = Object.fromEntries(calendars.map(c => [c.id, c]));
  const dp = window.qeTzParts(date);
  const first = new Date(dp.year, dp.month - 1, 1);
  const firstDow = window.qeTzWeekday(first);
  const offset = (firstDow - (weekStart === "mon" ? 1 : 0) + 7) % 7;
  const gridStart = new Date(first); gridStart.setDate(gridStart.getDate() - offset);

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart); d.setDate(d.getDate() + i); return d;
  });

  const today = new Date();
  const isSameDay = (a, b) => window.qeTzSameDay(a, b);

  const dows = weekStart === "mon"
    ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div style={mv.wrap}>
      <div style={mv.dowRow}>
        {dows.map(d => <div key={d} style={mv.dow}>{d}</div>)}
      </div>
      <div style={mv.grid}>
        {cells.map((d, i) => {
          const cellMonth = window.qeTzParts(d).month;
          const inMonth = cellMonth === dp.month;
          const isToday = isSameDay(d, today);
          const dayEvents = events.filter(e => isSameDay(e.start, d) && calMap[e.cal]?.checked)
            .sort((a, b) => new Date(a.start) - new Date(b.start));
          const shown = dayEvents.slice(0, 3);
          const more = dayEvents.length - shown.length;
          return (
            <div key={i} style={{ ...mv.cell, ...(inMonth ? {} : mv.cellMuted), ...(isToday ? mv.cellToday : {}) }}>
              <div style={mv.cellHead}>
                <button
                  onClick={() => { setCursor(d); setView("day"); }}
                  style={{
                    ...mv.dayNum,
                    ...(isToday ? mv.dayNumToday : {}),
                    color: inMonth ? "var(--ink)" : "var(--ink-3)",
                  }}>
                  {window.qeTzParts(d).day}
                </button>
                {window.qeTzParts(d).day === 1 && (
                  <span style={mv.monthMark}>
                    {window.qeTzFmtDate(d, { month: "short" })}
                  </span>
                )}
              </div>
              <div style={mv.events}>
                {shown.map(ev => {
                  const cal = calMap[ev.cal];
                  const label = [cal?.name, ev.company, ev.title].filter(Boolean).join(", ");
                  return (
                    <button key={ev.id} onClick={(e) => onEventClick(ev, e.currentTarget)} style={mv.evRow} title={label}>
                      <span style={{ ...mv.evDot, background: cal?.color }} />
                      <span className="mono" style={mv.evTime}>{window.qeTzFmtShort(ev.start)}</span>
                      <span style={mv.evTitle}>{label}</span>
                    </button>
                  );
                })}
                {more > 0 && (
                  <div style={mv.more}>+{more} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const mv = {
  wrap: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0, padding: "0 0 0 0" },
  dowRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--line)" },
  dow: { padding: "10px 12px", fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, borderLeft: "1px solid var(--line)" },
  grid: {
    flex: 1, display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gridTemplateRows: "repeat(6, 1fr)",
    minHeight: 0,
  },
  cell: {
    borderLeft: "1px solid var(--line)",
    borderTop: "1px solid var(--line)",
    padding: 8, display: "flex", flexDirection: "column", gap: 4,
    overflow: "hidden", minHeight: 0,
  },
  cellMuted: { background: "var(--line-2)" },
  cellToday: { background: "var(--accent-soft)" },
  cellHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  dayNum: {
    fontSize: 13, fontWeight: 500, padding: "2px 6px", borderRadius: 6,
    fontFamily: "Instrument Serif, serif", fontStyle: "italic",
  },
  dayNumToday: { background: "var(--ink)", color: "var(--bg)", fontFamily: "Inter Tight, sans-serif", fontStyle: "normal", fontSize: 12 },
  monthMark: { fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.6 },
  events: { display: "flex", flexDirection: "column", gap: 2, overflow: "hidden" },
  evRow: {
    display: "flex", alignItems: "center", gap: 5,
    fontSize: 11, padding: "2px 4px", borderRadius: 4,
    color: "var(--ink-2)", textAlign: "left", width: "100%",
  },
  evDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  evTime: { color: "var(--ink-3)", fontSize: 10, flexShrink: 0 },
  evTitle: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  more: { fontSize: 10.5, color: "var(--ink-3)", padding: "2px 4px" },
};

window.MonthView = MonthView;
