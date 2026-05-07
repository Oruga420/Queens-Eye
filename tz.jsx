// All time logic in Queens-eye is anchored to America/Toronto.
// These helpers extract Toronto-local Y/M/D/h/m from any Date, regardless
// of where the browser thinks "now" is.
const QE_TZ = "America/Toronto";

function _parts(date) {
  const d = date instanceof Date ? date : new Date(date);
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: QE_TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const out = {};
  for (const p of dtf.formatToParts(d)) out[p.type] = p.value;
  return {
    year: +out.year,
    month: +out.month,
    day: +out.day,
    hour: +out.hour % 24,
    minute: +out.minute,
  };
}

window.QE_TZ = QE_TZ;
window.qeTzParts = _parts;

window.qeTzSameDay = (a, b) => {
  const pa = _parts(a); const pb = _parts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
};

// Minutes since Toronto-midnight of that date (0 to 1439).
window.qeTzMinutes = (d) => {
  const p = _parts(d);
  return p.hour * 60 + p.minute;
};

// Day of week 0..6 (Sunday..Saturday) in Toronto.
window.qeTzWeekday = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: QE_TZ, weekday: "short" });
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[dtf.format(d)] ?? d.getUTCDay();
};

// Pretty time formatter in Toronto, e.g. "9:00 AM".
window.qeTzFmtTime = (d, opts = {}) => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleTimeString("en-US", { timeZone: QE_TZ, hour: "numeric", minute: "2-digit", ...opts });
};

// Compact short time like 9a, 12p, 3:30p — used on the hour-rail.
window.qeTzFmtShort = (d) => {
  const p = _parts(d);
  const h = p.hour;
  const ampm = h >= 12 ? "p" : "a";
  const hh = ((h + 11) % 12) + 1;
  return p.minute === 0 ? `${hh}${ampm}` : `${hh}:${String(p.minute).padStart(2, "0")}${ampm}`;
};

// Toronto date formatter.
window.qeTzFmtDate = (d, opts = {}) => {
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString("en-US", { timeZone: QE_TZ, ...opts });
};

// Build a Date that, when displayed in America/Toronto, shows the given
// year-month-day hour:minute. Handles EDT/EST automatically.
window.qeMakeTzDate = function (year, month, day, hour, minute) {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: QE_TZ,
    timeZoneName: "shortOffset",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = dtf.formatToParts(guess);
  const tzn = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-05:00";
  const m = tzn.match(/GMT([+\-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return guess;
  const sign = m[1] === "-" ? -1 : 1;
  const offsetMinutes = sign * (parseInt(m[2], 10) * 60 + parseInt(m[3] || "0", 10));
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60 * 1000);
};

// Toronto-local YYYY-MM-DD for "now" (used to tell the agent "today").
window.qeTodayToronto = function () {
  const p = _parts(new Date());
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};

// "now" Toronto offset string for the agent (e.g. -04:00 in summer, -05:00 in winter).
window.qeTzOffset = () => {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone: QE_TZ, timeZoneName: "shortOffset" });
  const parts = dtf.formatToParts(now);
  const tzn = parts.find((p) => p.type === "timeZoneName")?.value || "GMT-05:00";
  // tzn looks like "GMT-4" or "GMT-04:00". Normalize.
  const m = tzn.match(/GMT([+\-])(\d{1,2})(?::?(\d{2}))?/);
  if (!m) return "-05:00";
  const sign = m[1];
  const h = String(parseInt(m[2], 10)).padStart(2, "0");
  const mm = m[3] || "00";
  return `${sign}${h}:${mm}`;
};
