import { makePage } from "./_Generic";
export default makePage("sessions", "Sessions", [
  { key: "session_type", label: "Session type (e.g. Training)" },
  { key: "required_attendees", label: "Required attendees (number)" },
  { key: "host", label: "Host username" },
], "sessions-page");
