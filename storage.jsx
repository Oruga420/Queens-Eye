// LocalStorage persistence for Queens-eye.
// Events store ISO date strings; we revive them to Date on load.
const QE_STORAGE_KEY_EVENTS = "qe.events.v1";
const QE_STORAGE_KEY_CALENDARS = "qe.calendars.v1";

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

window.qeLoadEvents = function (fallback) {
  try {
    const raw = localStorage.getItem(QE_STORAGE_KEY_EVENTS);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.map(reviveEvent);
  } catch (err) {
    console.error("qeLoadEvents failed:", err);
    return fallback;
  }
};

window.qeSaveEvents = function (events) {
  try {
    localStorage.setItem(QE_STORAGE_KEY_EVENTS, JSON.stringify(events.map(serializeEvent)));
  } catch (err) {
    console.error("qeSaveEvents failed:", err);
  }
};

window.qeLoadCalendars = function (fallback) {
  try {
    const raw = localStorage.getItem(QE_STORAGE_KEY_CALENDARS);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return fallback;
    return parsed;
  } catch (err) {
    console.error("qeLoadCalendars failed:", err);
    return fallback;
  }
};

window.qeSaveCalendars = function (calendars) {
  try {
    localStorage.setItem(QE_STORAGE_KEY_CALENDARS, JSON.stringify(calendars));
  } catch (err) {
    console.error("qeSaveCalendars failed:", err);
  }
};

window.qeResetStorage = function () {
  localStorage.removeItem(QE_STORAGE_KEY_EVENTS);
  localStorage.removeItem(QE_STORAGE_KEY_CALENDARS);
};
