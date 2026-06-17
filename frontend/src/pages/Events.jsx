import { makePage } from "./_Generic";
export default makePage("events", "Events", [
  { key: "title", label: "Event title" },
  { key: "timestamp", label: "When (e.g. 2026-03-01 18:00 UTC)" },
  { key: "game_link", label: "Game link (optional)" },
], "events-page");
