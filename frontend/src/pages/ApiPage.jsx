import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const CodeBlock = ({ children }) => (
  <pre className="bg-[var(--surface-2)] border border-[var(--border)] rounded-md p-4 text-xs overflow-x-auto"><code>{children}</code></pre>
);

const ROBLOX_GROUP_ID_PLACEHOLDER = 606039753;

export default function ApiPage() {
  const [info, setInfo] = useState(null);
  const [ingest, setIngest] = useState(null);
  useEffect(() => {
    Promise.all([api.get("/game/info"), api.get("/ingest/info").catch(() => null)])
      .then(([a, b]) => { setInfo(a.data); setIngest(b?.data); });
  }, []);

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success("Copied"); };
  if (!info) return <div className="text-[var(--text-2)]">Loading…</div>;
  const base = window.location.origin;

  const luaSnippet = `local HttpService = game:GetService("HttpService")
local NEXORA_BASE = "${base}/api"
local NEXORA_KEY  = "${info.game_api_key}"

-- Authority overlay: ask website if this player has an authority rank.
local function getAuthority(robloxId)
  local res = HttpService:RequestAsync({
    Url = NEXORA_BASE.."/game/authority?roblox_id="..tostring(robloxId),
    Method = "GET",
    Headers = { ["X-Nexora-Game-Key"] = NEXORA_KEY },
  })
  if res.Success then return HttpService:JSONDecode(res.Body).authority end
end

-- Punishment ingest: log a punishment in the website + Discord.
local function pushPunishment(target, type_, reason, by)
  HttpService:RequestAsync({
    Url = NEXORA_BASE.."/game/punishment",
    Method = "POST",
    Headers = { ["Content-Type"]="application/json", ["X-Nexora-Game-Key"]=NEXORA_KEY },
    Body = HttpService:JSONEncode({ target=target, type=type_, reason=reason, by=by }),
  })
end`;

  const chatLogSnippet = `-- Chat & admin log ingest (uses INGEST_SECRET, NOT the game key)
local INGEST = "${ingest?.ingest_secret || "<ingest secret>"}"
local function pushChat(name, msg, serverId)
  HttpService:RequestAsync({
    Url = NEXORA_BASE.."/ingest/chatlog", Method = "POST",
    Headers = { ["Content-Type"]="application/json" },
    Body = HttpService:JSONEncode({ secret=INGEST, username=name, message=msg, server_id=serverId }),
  })
end`;

  const serverSnippet = `-- ServerScript: register THIS server's host so the website attaches the join link
-- to session embeds. Place in ServerScriptService.
local HttpService = game:GetService("HttpService")
local Players     = game:GetService("Players")
local NEXORA_BASE = "${base}/api"
local INGEST      = "${ingest?.ingest_secret || "<ingest secret>"}"

local function registerHost(robloxUserId)
  HttpService:RequestAsync({
    Url = NEXORA_BASE.."/game/server-status",
    Method = "POST",
    Headers = { ["Content-Type"]="application/json" },
    Body = HttpService:JSONEncode({
      secret         = INGEST,
      host_roblox_id = robloxUserId,
      place_id       = game.PlaceId,
      job_id         = game.JobId,
      join_link      = "roblox://placeId="..game.PlaceId.."&gameInstanceId="..game.JobId,
    }),
  })
end

-- Treat any staff player whose group rank >= 100 as a potential host.
Players.PlayerAdded:Connect(function(plr)
  local ok, rank = pcall(function() return plr:GetRankInGroup(${ROBLOX_GROUP_ID_PLACEHOLDER}) end)
  if ok and rank and rank >= 100 then
    pcall(function() registerHost(plr.UserId) end)
  end
end)`;

  const ENDPOINTS = [
    ["Authority overlay", "GET /api/game/authority?roblox_id=<id>", "X-Nexora-Game-Key"],
    ["Permissions for user", "GET /api/game/permissions?roblox_id=<id>", "X-Nexora-Game-Key"],
    ["Push punishment", "POST /api/game/punishment", "X-Nexora-Game-Key"],
    ["Chat log", "POST /api/ingest/chatlog", "body.secret = INGEST_SECRET"],
    ["Admin log", "POST /api/ingest/adminlog", "body.secret = INGEST_SECRET"],
    ["Register host server", "POST /api/game/server-status", "body.secret = INGEST_SECRET"],
  ];

  return (
    <div data-testid="api-page" className="space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Owner Only</div>
        <h1 className="font-serif text-4xl mt-2">Game API</h1>
        <p className="text-[var(--text-2)] mt-2 max-w-3xl">Use these endpoints from your Roblox HttpService to connect your game and CheckMeIn to Nexora. Keep both secrets out of public scripts — store them in a server-side ModuleScript only.</p>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-3">Keys</div>
        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-44 text-[var(--text-2)]">GAME_API_KEY</span>
            <code className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-xs truncate" data-testid="game-key">{info.game_api_key}</code>
            <button onClick={() => copy(info.game_api_key)} className="rounded-md border border-white/10 p-1.5 hover:bg-white/5"><Copy className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-44 text-[var(--text-2)]">INGEST_SECRET</span>
            <code className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-xs truncate" data-testid="ingest-key">{ingest?.ingest_secret || "—"}</code>
            <button onClick={() => copy(ingest?.ingest_secret || "")} className="rounded-md border border-white/10 p-1.5 hover:bg-white/5"><Copy className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-44 text-[var(--text-2)]">Base URL</span>
            <code className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1.5 text-xs truncate">{base}/api</code>
            <button onClick={() => copy(`${base}/api`)} className="rounded-md border border-white/10 p-1.5 hover:bg-white/5"><Copy className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-3">Endpoints</div>
        <table className="w-full text-sm">
          <thead><tr className="text-[var(--text-2)] text-[11px] uppercase tracking-[0.18em] text-left"><th className="py-2">Purpose</th><th>Method &amp; path</th><th>Auth</th></tr></thead>
          <tbody className="divide-y divide-[var(--border)]">
            {ENDPOINTS.map(([a, b, c]) => (
              <tr key={b}><td className="py-2 pr-3 text-[var(--text-2)]">{a}</td><td className="font-mono text-xs">{b}</td><td className="text-xs">{c}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-3">Drop-in Lua</div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)] mb-2">1 — Punishments + authority overlay</div>
        <CodeBlock>{luaSnippet}</CodeBlock>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)] mt-5 mb-2">2 — Chat & admin log ingest</div>
        <CodeBlock>{chatLogSnippet}</CodeBlock>
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--text-2)] mt-5 mb-2">3 — Host server registration (separate ServerScript)</div>
        <CodeBlock>{serverSnippet}</CodeBlock>
        <a href="https://create.roblox.com/docs/reference/engine/classes/HttpService" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-nx-gold hover:underline">
          Roblox HttpService docs <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
