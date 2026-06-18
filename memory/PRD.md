# Nexora Resorts — PRD

## Original problem statement (summary)
User asked for a full Roblox-community management platform for "Nexora Resorts" with: Discord OAuth login, dashboard with role-gated pages (Bookings, Player Search, Events, Sessions, Schedule, Ranking, Authorities, Forum, Bot Hosting, Settings, Roblox Linking), a Discord bot for booking confirmations + logging punishments/ranking/authority/event/session messages to specific channels, Roblox group ranking integration, gamepass check on bookings, multi-bot hosting, forum subdomain, privacy/terms. Strong design directive: professional luxury resort feel ("not Roblox-shit"), dark theme default + light + blurple, hero image background with logo, blue gradient Discord sign-in.

## Brand
- Domain: nexoraresorts.cloud
- Logo: provided (palm tree + sun, transparent BG)
- Hero: provided (Royalton St. Lucia aerial)
- Aesthetic: Four Seasons / Aman editorial + Linear/Vercel ops cockpit. Playfair Display (serif headings) + Outfit (UI/body). Gold + Teal accents on near-black surfaces.

## Architecture
- Backend: FastAPI single-file (`/app/backend/server.py`), all routes under `/api`. MongoDB via Motor. JWT auth.
- Frontend: React (CRACO) + Tailwind + shadcn/ui. Theme provider with `data-theme` on `<html>` for dark/light/blurple. Auth context using localStorage token. Sonner for toasts.
- Auth: Discord OAuth (real flow when env keys present) + Demo Owner fallback for development.
- Generic CRUD `/api/collections/{name}` for: players, punishments, events, sessions, authorities, forum_threads, hosted_bots — each gated by a permission.

## Implemented (Feb 17, 2026)
- Landing page (hero with provided resort image + logo, blue gradient Discord CTA, suites preview, ops section, footer)
- Theme toggle (dark/light/blurple) persisted to localStorage
- Login page (real Discord URL when configured, demo login fallback)
- Discord OAuth code-exchange backend endpoint
- Dashboard layout with permission-aware sidebar nav
- Pages: Overview, Bookings (full create/cancel + room cards), Player Search (issue/revert punishments), Events, Sessions, Authorities, Forum, Bot Hosting, Schedule (events+sessions merged), Ranking (list users + mocked promote), Settings (Roblox group + per-user permission toggles), Roblox Linking, Privacy, Terms
- Permissions system with 20+ named permissions; owner role gets all
- Mocked gamepass check on bookings (always passes)
- Auto-incremented room number on each booking
- Discord channel IDs / role IDs from `.env`

## Mocked / deferred (P1/P2 backlog)
- Real Discord bot connection (needs DISCORD_BOT_TOKEN) — Bot in "demo" mode, no actual messages sent.
- Real Discord OAuth (needs DISCORD_CLIENT_ID / SECRET) — UI falls back to demo login.
- Real Roblox Open Cloud ranking (needs Roblox API key) — promote button toasts only.
- Real gamepass ownership check (needs Roblox API + gamepass IDs).
- Multi-bot sandboxed hosting (UI exists, no real container runtime).
- Forum subdomain split, embed posting from sessions/events to specific Discord channels.
- Session lifecycle (phases, attendance checklist, grading tab, summary).
- Roblox auto-link (nickname change + role linking) on server join.
- Cross-server permission inheritance from "other linked servers."

## Next tasks (P0 → P1)
1. Provide Discord credentials (CLIENT_ID, CLIENT_SECRET, BOT_TOKEN, OWNER_ID) and Roblox API + group ID → flip from demo to live.
2. Real Discord bot worker: `/book` slash command, posting embeds to ranking / admin-ingame / punishment / authority / sessions / events channels.
3. Session phases UI (start/end phase buttons, attendee checklist, grading tab, ranking tab, summary).
4. Roblox gamepass verification + Open Cloud ranking call.
5. Forum threads page with proper threading/replies + moderation actions.
6. Real container-backed multi-bot hosting.

## Iteration 2 — Feb 18, 2026 (real data + owner config)
- Live Discord OAuth + bot **configured** (credentials in .env).
- Live Roblox user lookup (users + thumbnails + group-role v2 API).
- Sidebar identity: Roblox avatar + username + group rank with one-click `Link Roblox`.
- Session types catalog (Settings → Session Types). Sessions page is now a dropdown sourced from this catalog with required attendees + phase checklist.
- Room types catalog (Settings → Room Types) with CheckMeIn link field + gamepass ID; Bookings page reads from this catalog and opens CheckMeIn link in new tab.
- Player Search: searches Roblox username → live identity card + tabs (Chat / Admin / Sessions / Punishments). Sessions bucketed by hosted/cohosted/supervised/attended.
- Activity page (`/activity`) from `/api/activity` (unified feed: bookings, sessions, events, punishments, authorities).
- Game ingest: `POST /api/ingest/chatlog` and `POST /api/ingest/adminlog` secured by `INGEST_SECRET` (revealed in Settings).
- New permissions: `sessions.view_active`, `sessions.view_logs`.
- Theme toggle cycles dark → light → blurple (bug fixed).
- 34/34 backend tests pass.

## Still mocked / deferred (P1)
- Real Discord bot worker (slash commands /book, posting to log channels) — bot is online-token-ready but no command handler.
- Roblox Open Cloud ranking call (button currently toast-only).
- Gamepass ownership verification (always passes).
- Multi-bot sandboxed hosting (UI only).
- Session phases full lifecycle: grading tab, ranking tab, marking (Passed / Hardest Associate), final summary.
- Forum threading + replies + moderation.

## Iteration 3 — Feb 18, 2026 (bot + game API + role linking)
- Discord bot worker: discord.py running as background asyncio task; status visible at `/api/bot/health` and Bot Hosting page (Token configured / Bot online / Guild pill). Bot login confirmed (Nexora Operations#5407). Helper functions for booking DMs, punishment/session/event/authority embeds wired into the existing flows. Invite URL surfaced for the owner to add the bot to the guild.
- Roblox OAuth2 (`/api/auth/roblox/url` + `/api/auth/roblox/callback`) — Connect Roblox page replaces the typed-username flow.
- Real dashboard roles (`/api/catalog/dash-roles`) with full permission toggles. `/api/users/{id}/assign-role` applies a role's permissions to a user.
- Role/Authority linking page (`/role-links`): map Roblox group rank ↔ Discord role ↔ Dashboard role + Authority flag.
- Authorities page: `/api/authorities/grant` (auto-embed to authority channel), `/api/authorities/{id}/revoke` (reply-revert in Discord).
- Game-facing API (X-Nexora-Game-Key header): `/api/game/authority`, `/api/game/permissions`, `/api/game/punishment`. Builderman → authority='Manager' verified.
- Owner-only **Game API** page (`/integration`) with GAME_API_KEY, INGEST_SECRET, endpoint reference, drop-in Lua snippets.
- `/privacy` alias of `/privacy-policy`.
- Player Search profile gained inline "Issue punishment" card (qp-type / qp-reason / qp-submit).
- Fix: route renamed from `/api-integration` to `/integration` (the `/api/*` prefix is hijacked by k8s ingress).
- 49/49 backend tests pass.

## Still mocked / next P1
- Forum subdomain `forum.nexoraresorts.cloud`: the page exists at `/forum`. Subdomain routing requires DNS CNAME + ingress rule on your domain (not configurable from inside this preview environment). When you deploy to `nexoraresorts.cloud`, add a CNAME and an ingress rewrite from `forum.nexoraresorts.cloud` → `/forum`.
- Bot is online but **not yet invited** to your guild — click "Invite bot to your server" on `/hosting` once, then sessions/events/punishments/authority embeds will start posting.
- Slash command `/book` is registered but won't sync to guild until invited.
- Roblox Open Cloud ranking promotion call (button is still toast-only).
- Gamepass ownership verification.
