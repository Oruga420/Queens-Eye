// Week view — 7 columns (or 5 weekdays), hour grid like day view
const WEEK_HOURS = Array.from({ length: 24 }, (_, i) => i);

function startOfWeek(d, weekStart) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const day = out.getDay();
  const offset = (day - (weekStart === "mon" ? 1 : 0) + 7) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

const WeekView = ({ date, events, calendars, hourHeight, weekStart, onEventClick }) => {
  const calMap = Object.fromEntries(calendars.map(c => [c.id, c]));
  const start = startOfWeek(date, weekStart);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d;
  });

  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  const today = window.QE_DATA.TODAY;

  const scrollRef = React.useRef(null);
  React.useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, 7 * hourHeight - 20); }, [start.toDateString()]);

  const isSameDay = (a, b) => a.toDateString() === b.toDateString();

  return (
    <div style={wv.wrap}>
      <div style={wv.dowRow}>
        <div style={{ width: 60 }} />
        <div style={wv.dowGrid}>
          {days.map((d, i) => {
            const isToday = isSameDay(d, today);
            return (
              <div key={i} style={{ ...wv.dowCell, ...(isToday ? wv.dowCellToday : {}) }}>
                <div style={wv.dowName}>{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                <div style={{ ...wv.dowNum, ...(isToday ? wv.dowNumToday : {}) }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div ref={scrollRef} style={wv.scroller}>
        <div style={{ ...wv.grid, height: 24 * hourHeight }}>
          <div style={wv.times}>
            {WEEK_HOURS.map(h => (
              <div key={h} style={{ height: hourHeight }} className="mono">
                {h === 0 ? "" : (h === 12 ? "12p" : (h < 12 ? `${h}a` : `${h - 12}p`))}
              </div>
            ))}
          </div>
          <div style={wv.lanes}>
            {WEEK_HOURS.map(h => (
              <div key={`hl-${h}`} style={{ ...wv.hourLine, top: h * hourHeight }} />
            ))}
            <div style={wv.colsWrap}>
              {days.map((d, i) => {
                const dayEvents = events.filter(e => isSameDay(e.start, d) && calMap[e.cal]?.checked);
                const isToday = isSameDay(d, today);
                const nowTop = (now.getHours() + now.getMinutes()/60) * hourHeight;
                return (
                  <div key={i} style={wv.col}>
                    {dayEvents.map(ev => {
                      const startMins = ev.start.getHours() * 60 + ev.start.getMinutes();
                      const endMins = ev.end.getHours() * 60 + ev.end.getMinutes();
                      const top = (startMins / 60) * hourHeight;
                      const height = Math.max(18, ((endMins - startMins) / 60) * hourHeight - 2);
                      const cal = calMap[ev.cal];
                      const isFocus = ev.kind === "focus";
                      return (
                        <button key={ev.id} onClick={(e) => onEventClick(ev, e.currentTarget)} style={{
                          ...wv.event, top, height,
                          background: isFocus ? "transparent" : cal?.color,
                          border: isFocus ? `1px dashed ${cal?.color}` : "1px solid rgba(255,255,255,0.15)",
                          color: isFocus ? cal?.color : "white",
                        }}>
                          <div style={wv.eventTitle}>{ev.title}</div>
                          {height > 32 && <div style={wv.eventMeta} className="mono">{window.qeFmtTime(ev.start)}</div>}
                        </button>
                      );
                    })}
                    {isToday && (
                      <div style={{ ...wv.nowLine, top: nowTop }}>
                        <div style={wv.nowDot} />
                        <div style={wv.nowBar} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const wv = {
  wrap: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  dowRow: { display: "flex", borderBottom: "1px solid var(--line)" },
  dowGrid: { flex: 1, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" },
  dowCell: {
    padding: "16px 12px 12px", borderLeft: "1px solid var(--line)",
    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
  },
  dowCellToday: { background: "var(--accent-soft)" },
  dowName: { fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.8 },
  dowNum: { fontSize: 22, fontWeight: 500, fontFamily: "Instrument Serif, serif", fontStyle: "italic" },
  dowNumToday: { color: "var(--accent)" },
  scroller: { flex: 1, overflowY: "auto", overflowX: "hidden" },
  grid: { position: "relative", display: "grid", gridTemplateColumns: "60px 1fr" },
  times: { fontSize: 10.5, color: "var(--ink-3)" },
  lanes: { position: "relative", borderLeft: "1px solid var(--line)" },
  hourLine: { position: "absolute", left: 0, right: 0, height: 1, background: "var(--line)" },
  colsWrap: { position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" },
  col: { borderLeft: "1px solid var(--line-2)", position: "relative" },
  event: {
    position: "absolute", left: 2, right: 2,
    borderRadius: 6, padding: "3px 6px",
    textAlign: "left", overflow: "hidden",
  },
  eventTitle: { fontSize: 11, fontWeight: 600, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventMeta: { fontSize: 9.5, opacity: 0.9, marginTop: 1 },
  nowLine: { position: "absolute", left: 0, right: 0, height: 0, display: "flex", alignItems: "center", zIndex: 5 },
  nowDot: { width: 7, height: 7, borderRadius: "50%", background: "var(--warn)" },
  nowBar: { flex: 1, height: 1.5, background: "var(--warn)" },
};

window.WeekView = WeekView;
window.qeStartOfWeek = startOfWeek;
