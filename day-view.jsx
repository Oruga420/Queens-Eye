// Day view — hour-by-hour. Supports overlapping events via column-packing.
const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pack(events) {
  // Returns events with column index + total cols among overlapping cluster.
  const sorted = [...events].sort((a, b) => a.start - b.start);
  const placed = [];
  for (const ev of sorted) {
    let col = 0;
    while (placed.some(p => p.col === col && p.end > ev.start && p.start < ev.end)) col++;
    placed.push({ ...ev, col });
  }
  // Compute totalCols per cluster
  const clusters = [];
  for (const ev of placed) {
    let added = false;
    for (const c of clusters) {
      if (c.some(e => e.end > ev.start && e.start < ev.end)) {
        c.push(ev); added = true; break;
      }
    }
    if (!added) clusters.push([ev]);
  }
  // Merge clusters that share members via transitive overlap
  let merged = true;
  while (merged) {
    merged = false;
    outer:
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        if (clusters[i].some(a => clusters[j].some(b => b.end > a.start && b.start < a.end))) {
          clusters[i] = clusters[i].concat(clusters[j]);
          clusters.splice(j, 1); merged = true; break outer;
        }
      }
    }
  }
  for (const c of clusters) {
    const total = Math.max(...c.map(e => e.col)) + 1;
    c.forEach(e => e.totalCols = total);
  }
  return placed;
}

function fmtTime(d) {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "p" : "a";
  const hh = ((h + 11) % 12) + 1;
  return m === 0 ? `${hh}${ampm}` : `${hh}:${String(m).padStart(2, "0")}${ampm}`;
}

const DayView = ({ date, events, calendars, hourHeight, density, onEventClick, weather }) => {
  const calMap = Object.fromEntries(calendars.map(c => [c.id, c]));
  const todays = events.filter(e =>
    e.start.getFullYear() === date.getFullYear()
    && e.start.getMonth() === date.getMonth()
    && e.start.getDate() === date.getDate()
    && calMap[e.cal]?.checked
  );
  const packed = pack(todays);

  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const today = window.QE_DATA.TODAY;
  const isToday = date.toDateString() === today.toDateString();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMins / 60) * hourHeight;

  const scrollRef = React.useRef(null);
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, (7 * hourHeight) - 20);
    }
  }, [date.toDateString()]);

  const dayLabel = date.toLocaleDateString("en-US", { weekday: "long" });
  const dayNum = date.getDate();
  const dayMonth = date.toLocaleDateString("en-US", { month: "short" });

  return (
    <div style={dv.wrap}>
      <div style={dv.dayHeader}>
        <div style={dv.dayHeaderL}>
          <div style={dv.dayWeek}>{dayLabel}</div>
          <div style={dv.dayDate}>
            <span className="serif" style={{ fontSize: 56, lineHeight: 1, marginRight: 8 }}>{dayNum}</span>
            <span style={{ color: "var(--ink-3)", fontSize: 16 }}>{dayMonth}</span>
          </div>
        </div>
        <div style={dv.dayHeaderR}>
          {weather && (
            <div style={dv.weather}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5"/></svg>
              <span>62° clear</span>
            </div>
          )}
          <div style={dv.allDay}>
            <span style={{ color: "var(--ink-3)", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6 }}>All day</span>
            <div style={dv.allDayChip}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "oklch(0.62 0.14 35)" }} />
              <span>Sprint week — push deploy</span>
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollRef} style={dv.scroller}>
        <div style={{ ...dv.grid, height: 24 * hourHeight }}>
          <div style={dv.times}>
            {HOURS.map(h => (
              <div key={h} style={{ height: hourHeight }} className="mono">
                {h === 0 ? "" : (h === 12 ? "12p" : (h < 12 ? `${h}a` : `${h - 12}p`))}
              </div>
            ))}
          </div>
          <div style={dv.lanes}>
            {HOURS.map(h => (
              <div key={h} style={{ ...dv.hourLine, top: h * hourHeight }} />
            ))}
            {HOURS.map(h => (
              <div key={`h-${h}`} style={{ ...dv.halfHourLine, top: h * hourHeight + hourHeight / 2 }} />
            ))}

            {packed.map(ev => {
              const startMins = ev.start.getHours() * 60 + ev.start.getMinutes();
              const endMins = ev.end.getHours() * 60 + ev.end.getMinutes();
              const top = (startMins / 60) * hourHeight;
              const height = Math.max(20, ((endMins - startMins) / 60) * hourHeight - 2);
              const cal = calMap[ev.cal];
              const widthPct = 100 / ev.totalCols;
              const leftPct = ev.col * widthPct;
              const isFocus = ev.kind === "focus";
              return (
                <button key={ev.id} onClick={(e) => onEventClick(ev, e.currentTarget)} style={{
                  ...dv.event,
                  top, height,
                  left: `calc(${leftPct}% + 4px)`,
                  width: `calc(${widthPct}% - 8px)`,
                  background: isFocus ? "transparent" : (cal?.color || "var(--accent)"),
                  border: isFocus ? `1px dashed ${cal?.color || "var(--ink-3)"}` : "1px solid rgba(255,255,255,0.15)",
                  color: isFocus ? cal?.color : "white",
                }}>
                  <div style={dv.eventCalRow}>
                    <span style={{ ...dv.eventCalChip, background: "rgba(255,255,255,0.22)", color: "white" }}>{cal?.name}</span>
                    {ev.company && <span style={{ ...dv.eventCompany, color: "rgba(255,255,255,0.95)" }}>{ev.company}</span>}
                  </div>
                  <div style={dv.eventTitle}>{ev.title}</div>
                  {height > 56 && (
                    <div style={{ ...dv.eventMeta, color: "rgba(255,255,255,0.85)" }} className="mono">
                      {fmtTime(ev.start)} to {fmtTime(ev.end)}{ev.where ? ` · ${ev.where}` : ""}
                    </div>
                  )}
                </button>
              );
            })}

            {isToday && (
              <div style={{ ...dv.nowLine, top: nowTop }}>
                <div style={dv.nowDot} />
                <div style={dv.nowBar} />
                <div className="mono" style={dv.nowLabel}>{`${((now.getHours()+11)%12)+1}:${String(now.getMinutes()).padStart(2,"0")}`}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const dv = {
  wrap: { flex: 1, display: "flex", flexDirection: "column", minWidth: 0 },
  dayHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-end",
    padding: "20px 28px 16px",
    borderBottom: "1px solid var(--line)",
  },
  dayHeaderL: { display: "flex", flexDirection: "column", gap: 4 },
  dayWeek: { fontSize: 12, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 1.2, fontWeight: 500 },
  dayDate: { display: "flex", alignItems: "baseline", color: "var(--accent)" },
  dayHeaderR: { display: "flex", alignItems: "center", gap: 18 },
  weather: { display: "flex", alignItems: "center", gap: 6, color: "var(--ink-2)", fontSize: 12.5 },
  allDay: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 },
  allDayChip: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "5px 10px", borderRadius: 6,
    background: "var(--line-2)", fontSize: 12, color: "var(--ink-2)",
  },
  scroller: { flex: 1, overflowY: "auto", overflowX: "hidden" },
  grid: { position: "relative", display: "grid", gridTemplateColumns: "60px 1fr" },
  times: {
    paddingTop: 0,
    fontSize: 10.5, color: "var(--ink-3)",
  },
  lanes: { position: "relative", borderLeft: "1px solid var(--line)" },
  hourLine: { position: "absolute", left: 0, right: 0, height: 1, background: "var(--line)" },
  halfHourLine: { position: "absolute", left: 0, right: 0, height: 1, background: "var(--line-2)" },
  event: {
    position: "absolute",
    borderRadius: 8,
    padding: "5px 8px",
    textAlign: "left",
    overflow: "hidden",
    boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
    transition: "transform 120ms ease",
  },
  eventCalRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 2 },
  eventCalChip: { fontSize: 9.5, fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", padding: "1px 6px", borderRadius: 999 },
  eventCompany: { fontSize: 10.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventTitle: { fontSize: 13, fontWeight: 600, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  eventMeta: { fontSize: 10.5, marginTop: 2, opacity: 0.95 },
  nowLine: { position: "absolute", left: -8, right: 0, height: 0, display: "flex", alignItems: "center", pointerEvents: "none", zIndex: 5 },
  nowDot: { width: 10, height: 10, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 },
  nowBar: { flex: 1, height: 1.5, background: "var(--accent)" },
  nowLabel: { position: "absolute", left: -50, top: -6, fontSize: 9.5, color: "var(--accent)", fontWeight: 600 },
};

// "times" first row needs a tiny offset — fix later if needed
dv.times.display = "block";

window.DayView = DayView;
window.qeFmtTime = fmtTime;
