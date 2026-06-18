# Nexora Resorts — PRD

## Iteration 4 — Feb 18, 2026 — Real-only mode
- Removed `/api/auth/demo` endpoint and the demo login button. Sign-in is **Discord OAuth only**.
- After Discord callback, if the user has not yet linked Roblox, they are redirected to `/robloxlinking`. If already linked, they go to `/dashboard`. The Roblox page has a "Continue to dashboard →" button.
- Permission gating is strict: a fresh Discord user only gets `dashboard.view + bookings.create`. The owner role (full permissions) is granted exclusively when `discord_id == OWNER_DISCORD_ID` (`909359845872922635`).
- Cleaned MongoDB of demo users + any TEST_-prefixed docs across all collections.
- Removed pytest regression suites (`tests/test_nexora_*.py`) and `/app/memory/test_credentials.md`.
- Discord bot still running 24/7 (Nexora Operations#5407), Roblox OAuth2 still wired, Game API + Authority overlay endpoints unchanged.

## Required redirect URIs for your OAuth apps
- **Discord** (https://discord.com/developers/applications/1516107062738813102/oauth2):
  - `https://nexora-admin-1.preview.emergentagent.com/auth/callback`
  - For your production domain later: `https://nexoraresorts.cloud/auth/callback`
  - Scopes already requested in the URL: `identify guilds`
- **Roblox** (https://create.roblox.com/dashboard/credentials/oauth):
  - `https://nexora-admin-1.preview.emergentagent.com/auth/roblox/callback`
  - Later: `https://nexoraresorts.cloud/auth/roblox/callback`
  - Scopes requested: `openid profile group:read`

## Still mocked / next P1
- Forum subdomain `forum.nexoraresorts.cloud` — page exists at `/forum`. Subdomain routing requires a DNS CNAME + ingress rewrite at deploy time.
- Discord slash command `/book` posting the booking embed + DM with Enter resort/Cancel buttons end-to-end (helpers exist; needs bot to be in the guild).
- Roblox Open Cloud ranking promote (button still toast-only).
- Gamepass ownership check (always passes today).
- Full session lifecycle (grading, ranking-while-running, summary).
