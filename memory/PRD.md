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
