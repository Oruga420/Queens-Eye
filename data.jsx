// Sample data for Queens-eye calendar
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function dayOffset(n, h, m = 0) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + n);
  d.setHours(h, m, 0, 0);
  return d;
}

const CALENDARS = [
  { id: "work",     name: "Work",        color: "oklch(0.55 0.13 270)", checked: true },
  { id: "personal", name: "Personal",    color: "oklch(0.62 0.14 35)",  checked: true },
  { id: "team",     name: "Team — Apex", color: "oklch(0.62 0.10 150)", checked: true },
  { id: "focus",    name: "Focus",       color: "oklch(0.55 0.02 270)", checked: true },
  { id: "ext",      name: "External",    color: "oklch(0.65 0.12 200)", checked: false },
];

// Each event: { id, cal, title, start, end, where?, who?[], notes?, kind? }
const EVENTS = [
  // Yesterday
  { id: "e-y1", cal: "work", title: "Q3 Planning Review", start: dayOffset(-1, 10, 0), end: dayOffset(-1, 11, 30), where: "Boardroom" },
  { id: "e-y2", cal: "team", title: "Design crit", start: dayOffset(-1, 14, 0), end: dayOffset(-1, 15, 0) },

  // Today (rich)
  { id: "e1", cal: "focus", title: "Morning pages", start: dayOffset(0, 7, 30), end: dayOffset(0, 8, 0), kind: "focus" },
  { id: "e2", cal: "work",  title: "1:1 with Maya",   start: dayOffset(0, 9, 0),  end: dayOffset(0, 9, 30),  where: "Huddle 2", who: ["Maya R."] },
  { id: "e3", cal: "team",  title: "Standup",          start: dayOffset(0, 9, 30), end: dayOffset(0, 9, 45),  who: ["Apex squad"] },
  { id: "e4", cal: "work",  title: "Investor sync — Northwind", start: dayOffset(0, 10, 0),  end: dayOffset(0, 11, 0), where: "Zoom", who: ["J. Liang", "P. Okafor"] },
  { id: "e5", cal: "focus", title: "Deep work — narrative deck", start: dayOffset(0, 11, 15), end: dayOffset(0, 12, 30), kind: "focus" },
  { id: "e6", cal: "personal", title: "Lunch w/ Daniel", start: dayOffset(0, 12, 45), end: dayOffset(0, 13, 45), where: "Yu Kitchen" },
  { id: "e7", cal: "team",  title: "Product review",   start: dayOffset(0, 14, 0),  end: dayOffset(0, 15, 0),  where: "Atrium", who: ["Eng + Design"] },
  { id: "e8", cal: "work",  title: "Hiring panel — Staff PM", start: dayOffset(0, 15, 15), end: dayOffset(0, 16, 0), who: ["Reza K."] },
  { id: "e9", cal: "work",  title: "Board prep",       start: dayOffset(0, 15, 30), end: dayOffset(0, 16, 30), where: "Office" },
  { id: "e10", cal: "personal", title: "School pickup", start: dayOffset(0, 16, 30), end: dayOffset(0, 17, 0) },
  { id: "e11", cal: "focus", title: "Inbox zero",       start: dayOffset(0, 17, 30), end: dayOffset(0, 18, 0), kind: "focus" },

  // Tomorrow
  { id: "e-t1", cal: "work",  title: "All-hands",       start: dayOffset(1, 9, 0),  end: dayOffset(1, 10, 0), where: "Atrium" },
  { id: "e-t2", cal: "work",  title: "Customer — Halcyon", start: dayOffset(1, 11, 0), end: dayOffset(1, 12, 0), where: "Zoom" },
  { id: "e-t3", cal: "personal", title: "Yoga", start: dayOffset(1, 17, 30), end: dayOffset(1, 18, 30) },

  // Day +2
  { id: "e-d2-1", cal: "work", title: "Roadmap workshop", start: dayOffset(2, 10, 0), end: dayOffset(2, 12, 0) },
  { id: "e-d2-2", cal: "team", title: "Coffee — Lin",     start: dayOffset(2, 14, 30), end: dayOffset(2, 15, 0) },

  // Day +3, 4, 5
  { id: "e-d3-1", cal: "work", title: "Press briefing", start: dayOffset(3, 11, 0), end: dayOffset(3, 11, 45) },
  { id: "e-d4-1", cal: "personal", title: "Dentist",     start: dayOffset(4, 9, 0),  end: dayOffset(4, 10, 0) },
  { id: "e-d5-1", cal: "focus",    title: "Strategy memo", start: dayOffset(5, 9, 0),  end: dayOffset(5, 11, 0), kind: "focus" },

  // A few earlier this week and next
  { id: "e-d-3-1", cal: "work", title: "Offsite kickoff", start: dayOffset(-3, 13, 0), end: dayOffset(-3, 16, 0) },
  { id: "e-d6", cal: "team", title: "Demo Friday", start: dayOffset(6, 15, 0), end: dayOffset(6, 16, 0) },
  { id: "e-d7", cal: "personal", title: "Brunch — A & R", start: dayOffset(7, 11, 0), end: dayOffset(7, 13, 0), where: "Lou's" },
  { id: "e-d8", cal: "work", title: "Quarterly review", start: dayOffset(8, 14, 0), end: dayOffset(8, 16, 0) },
];

window.QE_DATA = { TODAY, CALENDARS, EVENTS };
