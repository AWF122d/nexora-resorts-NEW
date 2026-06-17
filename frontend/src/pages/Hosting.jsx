import { makePage } from "./_Generic";
export default makePage("hosted_bots", "Bot Hosting", [
  { key: "name", label: "Bot name" },
  { key: "token_alias", label: "Token alias (we'll store reference only)" },
  { key: "notes", label: "Notes" },
], "hosting-page");
