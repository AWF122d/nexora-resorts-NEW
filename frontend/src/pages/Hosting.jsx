import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { CheckCircle2, XCircle, ExternalLink, Copy } from "lucide-react";
import { toast } from "sonner";

const INVITE_PERMS = "277025507328"; // Send Messages, Embed Links, Read History, Use App Commands, Add Reactions, Attach Files
const CLIENT_ID = "1516107062738813102";

export default function Hosting() {
  const [health, setHealth] = useState(null);
  const reload = () => api.get("/bot/health").then(({ data }) => setHealth(data));
  useEffect(() => { reload(); const t = setInterval(reload, 10000); return () => clearInterval(t); }, []);

  const invite = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&permissions=${INVITE_PERMS}&scope=bot+applications.commands`;
  const copy = (text, label = "Copied") => { navigator.clipboard.writeText(text); toast.success(label); };

  const Pill = ({ ok, label }) => (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${ok ? "border-emerald-500/40 text-emerald-300" : "border-red-500/40 text-red-300"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />} {label}
    </div>
  );

  return (
    <div data-testid="hosting-page" className="space-y-8">
      <div>
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)]">Infrastructure</div>
        <h1 className="font-serif text-4xl mt-2">Bot Hosting</h1>
        <p className="text-[var(--text-2)] mt-2 max-w-2xl">The Nexora bot runs alongside the website backend 24/7. Invite it to your server and monitor it from here.</p>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Status</div>
        {health === null ? (
          <div className="text-sm text-[var(--text-2)]">Checking…</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Pill ok={!!health?.token_configured} label={health?.token_configured ? "Token configured" : "No token"} />
            <Pill ok={!!health?.running} label={health?.running ? "Bot online" : "Bot offline"} />
            <Pill ok={!!health?.guild_id} label={health?.guild_id ? `Guild ${health.guild_id}` : "No guild"} />
          </div>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <a href={invite} target="_blank" rel="noreferrer" data-testid="invite-bot-btn" className="btn-discord rounded-md px-4 py-2 text-sm inline-flex items-center gap-2">
            <ExternalLink className="h-4 w-4" /> Invite bot to your server
          </a>
          <button onClick={() => copy(invite, "Invite URL copied")} className="rounded-md border border-white/10 px-3 py-2 text-xs hover:bg-white/5 inline-flex items-center gap-2">
            <Copy className="h-3.5 w-3.5" /> Copy invite URL
          </button>
        </div>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">24/7 uptime</div>
        <p className="text-sm text-[var(--text-2)]">The bot keeps itself alive inside the website's backend process (managed by supervisor). To get free external alerting if the host ever goes down, monitor the public health endpoint with UptimeRobot.</p>
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-2)] w-32 shrink-0">Monitor URL</span>
            <code className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs flex-1 truncate">{window.location.origin}/api/health</code>
            <button onClick={() => copy(`${window.location.origin}/api/health`)} className="rounded-md border border-white/10 p-1.5 hover:bg-white/5"><Copy className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-2)] w-32 shrink-0">Bot health</span>
            <code className="bg-[var(--surface-2)] border border-[var(--border)] rounded px-2 py-1 text-xs flex-1 truncate">{window.location.origin}/api/bot/health</code>
            <button onClick={() => copy(`${window.location.origin}/api/bot/health`)} className="rounded-md border border-white/10 p-1.5 hover:bg-white/5"><Copy className="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <a href="https://uptimerobot.com/dashboard" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm text-nx-gold hover:underline">
          Open UptimeRobot dashboard <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="surface p-6">
        <div className="text-[11px] uppercase tracking-[0.3em] text-[var(--text-2)] mb-4">Log channels</div>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {health && Object.entries(health.log_channels || {}).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 surface p-3 bg-[var(--surface-2)]/40">
              <div><div className="text-[var(--text-2)] text-[10px] uppercase tracking-[0.22em]">{k}</div><div className="text-sm">{v || "—"}</div></div>
              {v && <button onClick={() => copy(v)} className="rounded-md border border-white/10 p-1.5 hover:bg-white/5"><Copy className="h-3.5 w-3.5" /></button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
