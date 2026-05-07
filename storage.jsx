// Storage for Queens-eye. Cloud (Vercel KV) is source of truth.
// LocalStorage is an offline cache so the UI is instant on load.
const QE_STORAGE_KEY_EVENTS = "qe.events.v2";
const QE_STORAGE_KEY_CALENDARS = "qe.calendars.v2";

function reviveEvent(e) {
  return {
    ...e,
    start: new Date(e.start),
    end: new Date(e.end),
  };
}

function serializeEvent(e) {
  return {
    ...e,
    start: e.start instanceof Date ? e.start.toISOString() : e.start,
    end: e.end instanceof Date ? e.end.toISOString() : e.end,
  };
}

// ---- Local cache (synchronous, used for first paint) ----
window.qeLoadEvents = function (fallback) {
  try {
    const raw = localStorage.getItem(QE_STORAGE_KEY_EVENTS);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map(reviveEvent);
  } catch (err) {
    console.error("qeLoadEvents (local):", err);
    return fallback;
  }
};

window.qeSaveEvents = function (events) {
  const serialized = events.map(serializeEvent);
  try { localStorage.setItem(QE_STORAGE_KEY_EVENTS, JSON.stringify(serialized)); } catch (err) { console.error("qeSaveEvents local:", err); }
  // Fire and forget remote PUT.
  fetch("/api/events", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: serialized }),
  }).catch((err) => console.error("qeSaveEvents remote:", err));
};

window.qeLoadCalendars = function (fallback) {
  try {
    const raw = localStorage.getItem(QE_STORAGE_KEY_CALENDARS);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed;
  } catch (err) {
    console.error("qeLoadCalendars (local):", err);
    return fallback;
  }
};

window.qeSaveCalendars = function (calendars) {
  try { localStorage.setItem(QE_STORAGE_KEY_CALENDARS, JSON.stringify(calendars)); } catch (err) { console.error("qeSaveCalendars local:", err); }
  fetch("/api/calendars", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ calendars }),
  }).catch((err) => console.error("qeSaveCalendars remote:", err));
};

// ---- Remote fetch (async, called once on mount to hydrate from cloud) ----
window.qeFetchRemoteEvents = async function () {
  try {
    const res = await fetch("/api/events");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.events)) return null;
    // Update local cache from server.
    try { localStorage.setItem(QE_STORAGE_KEY_EVENTS, JSON.stringify(data.events)); } catch {}
    return data.events.map(reviveEvent);
  } catch (err) {
    console.error("qeFetchRemoteEvents:", err);
    return null;
  }
};

window.qeFetchRemoteCalendars = async function () {
  try {
    const res = await fetch("/api/calendars");
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data?.calendars)) return null;
    try { localStorage.setItem(QE_STORAGE_KEY_CALENDARS, JSON.stringify(data.calendars)); } catch {}
    return data.calendars;
  } catch (err) {
    console.error("qeFetchRemoteCalendars:", err);
    return null;
  }
};

window.qeResetStorage = function () {
  localStorage.removeItem(QE_STORAGE_KEY_EVENTS);
  localStorage.removeItem(QE_STORAGE_KEY_CALENDARS);
  // Also clear the cloud copy.
  fetch("/api/events", {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events: [] }),
  }).catch(() => {});
};
