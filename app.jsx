// Top toolbar with view switcher + main app
const { useState, useEffect, useMemo } = React;

const Toolbar = ({ cursor, setCursor, view, setView, onToday, onTweaks, search, setSearch }) => {
  const fmt = useMemo(() => {
    const tz = "America/Toronto";
    if (view === "month") return cursor.toLocaleDateString("en-US", { timeZone: tz, month: "long", year: "numeric" });
    if (view === "week") {
      const start = window.qeStartOfWeek(cursor, "mon");
      const end = new Date(start); end.setDate(end.getDate() + 6);
      const sm = start.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric" });
      const em = end.toLocaleDateString("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" });
      return `${sm} to ${em}`;
    }
    return cursor.toLocaleDateString("en-US", { timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [cursor, view]);

  const step = (dir) => {
    const d = new Date(cursor);
    if (view === "day") d.setDate(d.getDate() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCursor(d);
  };

  return (
    <header style={tb.bar}>
      <div style={tb.left}>
        <button style={tb.todayBtn} onClick={onToday}>
          <Icon name="today" size={14} />
          <span>Today</span>
        </button>
        <div style={tb.navGroup}>
          <button style={tb.navBtn} onClick={() => step(-1)} aria-label="Previous"><Icon name="chevron-left" size={14} /></button>
          <button style={tb.navBtn} onClick={() => step(1)} aria-label="Next"><Icon name="chevron-right" size={14} /></button>
        </div>
        <div style={tb.title}>{fmt}</div>
      </div>
      <div style={tb.right}>
        <div style={tb.search}>
          <Icon name="search" size={13} />
          <input
            placeholder="Search events, people…"
            value={search || ""}
            onChange={(e) => setSearch(e.target.value)}
            style={tb.searchInput}
          />
          <span className="mono" style={tb.kbd}>⌘K</span>
        </div>
        <div style={tb.viewSwitch}>
          {[["day","Day"],["week","Week"],["month","Month"]].map(([k, l]) => (
            <button key={k} onClick={() => setView(k)}
              style={{ ...tb.viewBtn, ...(view === k ? tb.viewBtnActive : {}) }}>
              {l}
            </button>
          ))}
        </div>
        <button style={tb.iconBtn} onClick={onTweaks} aria-label="Settings">
          <Icon name="settings" size={15} />
        </button>
        <a href="Queens-eye Assistant.html" target="_blank" style={tb.assistantBtn}>
          <span style={{width:6,height:6,borderRadius:"50%",background:"var(--accent)"}}></span>
          <span>Brief assistant</span>
        </a>
      </div>
    </header>
  );
};

const tb = {
  bar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 24px",
    borderBottom: "1px solid var(--line)",
    background: "var(--bg)", flexShrink: 0,
  },
  left: { display: "flex", alignItems: "center", gap: 14 },
  right: { display: "flex", alignItems: "center", gap: 10 },
  todayBtn: {
    display: "flex", alignItems: "center", gap: 6,
    padding: "7px 12px", borderRadius: 8,
    border: "1px solid var(--line)", background: "var(--panel)",
    fontSize: 12.5, fontWeight: 500, color: "var(--ink)",
  },
  navGroup: { display: "flex", gap: 2 },
  navBtn: {
    width: 28, height: 28, borderRadius: 7,
    color: "var(--ink-2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: 600, fontFamily: "Instrument Serif, serif", fontStyle: "italic", letterSpacing: -0.2 },
  search: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "6px 10px", borderRadius: 8,
    border: "1px solid var(--line)", background: "var(--panel)",
    color: "var(--ink-3)", minWidth: 240,
  },
  searchInput: { border: 0, background: "transparent", outline: "none", flex: 1, fontSize: 12.5, color: "var(--ink)", fontFamily: "inherit" },
  kbd: { fontSize: 10.5, color: "var(--ink-3)" },
  viewSwitch: { display: "flex", padding: 3, borderRadius: 9, background: "var(--panel)", border: "1px solid var(--line)" },
  viewBtn: { padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 500, color: "var(--ink-3)" },
  viewBtnActive: { background: "var(--accent)", color: "#faf3e6" },
  iconBtn: { width: 32, height: 32, borderRadius: 8, color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)", background: "var(--panel)" },
  assistantBtn: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "7px 12px", borderRadius: 8,
    background: "var(--accent)", color: "#faf3e6",
    fontSize: 12.5, fontWeight: 500,
    textDecoration: "none",
  },
};

const ACCENTS = {
  scarlet: "oklch(0.50 0.20 25)",
  gold:    "oklch(0.72 0.13 80)",
  rust:    "oklch(0.55 0.16 40)",
  ink:     "oklch(0.30 0.04 40)",
};
const ACCENT_HEX = {
  scarlet: "#b8332a",
  gold:    "#c89a3a",
  rust:    "#a35a2a",
  ink:     "#3a2a1f",
};

function App() {
  const tweakDefaults = JSON.parse(document.getElementById("__tweak_defaults__").textContent.match(/\{[\s\S]*\}/)[0]);
  const [t, setTweak] = window.useTweaks(tweakDefaults);
  const { TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakSelect, TweakColor } = window;

  // Apply theme + accent + hour height as CSS vars
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", t.theme);
    // accent stored as hex; map back to oklch for richer rendering, fall through if custom
    const oklch = Object.entries(ACCENT_HEX).find(([k, v]) => v.toLowerCase() === String(t.accent).toLowerCase());
    document.documentElement.style.setProperty("--accent", oklch ? ACCENTS[oklch[0]] : t.accent);
    document.documentElement.style.setProperty("--hour-h", `${t.hourHeight}px`);
  }, [t.theme, t.accent, t.hourHeight]);

  const [view, setView] = useState(() => {
    try { return localStorage.getItem("qe.view.v1") || "week"; } catch { return "week"; }
  });
  useEffect(() => {
    try { localStorage.setItem("qe.view.v1", view); } catch {}
  }, [view]);
  const [cursor, setCursor] = useState(new Date(window.QE_DATA.TODAY));
  const [calendars, setCalendars] = useState(() => window.qeLoadCalendars(window.QE_DATA.CALENDARS));
  const [events, setEvents] = useState(() => window.qeLoadEvents(window.QE_DATA.EVENTS));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [popoverAnchor, setPopoverAnchor] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => { window.qeSaveEvents(events); }, [events]);
  useEffect(() => { window.qeSaveCalendars(calendars); }, [calendars]);

  const toggleCal = (id) => setCalendars(cs => cs.map(c => c.id === id ? { ...c, checked: !c.checked } : c));

  const onEventClick = (ev, anchor) => { setSelectedEvent(ev); setPopoverAnchor(anchor); };

  const closePopover = () => { setSelectedEvent(null); setPopoverAnchor(null); };

  const onCreateFromVoice = (draft) => {
    const start = draft.start instanceof Date ? draft.start : new Date(draft.startISO || draft.start);
    let end = draft.end instanceof Date ? draft.end : (draft.endISO || draft.end ? new Date(draft.endISO || draft.end) : null);
    if (!end) end = new Date(start.getTime() + 30 * 60000);
    setEvents(es => [...es, {
      id: "voice-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      cal: draft.cal || "house",
      title: draft.title,
      company: draft.company || "",
      start, end,
      where: draft.where,
      who: draft.who,
    }]);
  };

  const updateEvent = (id, patch) => {
    setEvents(es => es.map(e => e.id === id ? { ...e, ...patch } : e));
    setSelectedEvent(prev => prev && prev.id === id ? { ...prev, ...patch } : prev);
  };

  const deleteEvent = (id) => {
    setEvents(es => es.filter(e => e.id !== id));
    closePopover();
  };

  const visibleEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter(e =>
      e.title?.toLowerCase().includes(q)
      || e.where?.toLowerCase().includes(q)
      || (e.who || []).some(w => w.toLowerCase().includes(q))
    );
  }, [events, search]);

  const density = t.density;
  const hourHeight = t.hourHeight;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <Sidebar
        cursor={cursor} setCursor={setCursor}
        view={view} setView={setView}
        calendars={calendars} toggleCal={toggleCal}
        weekStart={t.weekStart}
        events={events}
      />
      <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0 }}>
        <Toolbar
          cursor={cursor} setCursor={setCursor}
          view={view} setView={setView}
          onToday={() => setCursor(new Date(window.QE_DATA.TODAY))}
          onTweaks={() => {}}
          search={search} setSearch={setSearch}
        />
        {view === "day" && (
          <DayView
            date={cursor} events={visibleEvents} calendars={calendars}
            hourHeight={hourHeight} density={density}
            onEventClick={onEventClick}
            weather={t.showWeather}
          />
        )}
        {view === "week" && (
          <WeekView
            date={cursor} events={visibleEvents} calendars={calendars}
            hourHeight={hourHeight} weekStart={t.weekStart}
            onEventClick={onEventClick}
          />
        )}
        {view === "month" && (
          <MonthView
            date={cursor} events={visibleEvents} calendars={calendars}
            weekStart={t.weekStart}
            onEventClick={onEventClick}
            setCursor={setCursor} setView={setView}
          />
        )}
      </main>

      {selectedEvent && (
        <EventPopover
          event={selectedEvent}
          anchor={popoverAnchor}
          calendars={calendars}
          onClose={closePopover}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
        />
      )}

      <Dictation
        style={t.dictationStyle}
        events={events}
        onCreateEvent={onCreateFromVoice}
        onUpdateEvent={updateEvent}
        onDeleteEvent={deleteEvent}
      />

      <TweaksPanel title="Tweaks">
        <TweakSection label="Appearance">
          <TweakRadio label="Theme" value={t.theme} onChange={(v) => setTweak("theme", v)}
            options={[{value:"light",label:"Light"},{value:"dark",label:"Dark"}]} />
          <TweakColor label="Accent" value={t.accent} onChange={(v) => setTweak("accent", v)}
            options={[ACCENT_HEX.scarlet, ACCENT_HEX.gold, ACCENT_HEX.rust, ACCENT_HEX.ink]} />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakSlider label="Hour height" value={t.hourHeight} onChange={(v) => setTweak("hourHeight", v)} min={36} max={120} step={4} unit="px" />
          <TweakRadio label="Week starts" value={t.weekStart} onChange={(v) => setTweak("weekStart", v)}
            options={[{value:"sun",label:"Sun"},{value:"mon",label:"Mon"}]} />
          <TweakToggle label="Show weather" value={t.showWeather} onChange={(v) => setTweak("showWeather", v)} />
        </TweakSection>
        <TweakSection label="Dictation bot">
          <TweakSelect label="Style" value={t.dictationStyle} onChange={(v) => setTweak("dictationStyle", v)}
            options={[
              {value:"pill",label:"Pill with waveform"},
              {value:"fab",label:"Floating mic button"},
              {value:"orb",label:"Ambient orb"},
              {value:"panel",label:"Quiet text prompt"},
            ]} />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
