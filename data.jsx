// Seed data for Queens-eye. Calendar starts empty.
// Three calendars: Queen, Oru, House. The user creates events through the
// chat assistant on either page. Each event also has a "company" tag.
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

const CALENDARS = [
  { id: "queen", name: "Queen", color: "oklch(0.55 0.20 25)",  checked: true },  // scarlet
  { id: "oru",   name: "Oru",   color: "oklch(0.62 0.14 35)",  checked: true },  // rust/amber
  { id: "house", name: "House", color: "oklch(0.55 0.13 200)", checked: true },  // muted teal
];

const EVENTS = [];

window.QE_DATA = { TODAY, CALENDARS, EVENTS };
