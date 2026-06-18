"""Nexora Resorts backend.

Single-file FastAPI app for the MVP. Routes are namespaced under /api.
Discord OAuth + bot are wired through env vars; when not configured a demo
mode is used so the UI is fully usable end-to-end.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, uuid, logging, jwt, httpx, asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Mongo ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# ---------- App ----------
app = FastAPI(title="Nexora Resorts API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("nexora")

# ---------- Config ----------
JWT_SECRET = os.environ.get("JWT_SECRET", "nexora-dev")
JWT_ALG = "HS256"
JWT_TTL = 60 * 60 * 24 * 7  # 7 days

DISCORD_CLIENT_ID = os.environ.get("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.environ.get("DISCORD_CLIENT_SECRET", "")
DISCORD_REDIRECT_URI = os.environ.get("DISCORD_REDIRECT_URI", "")
DISCORD_BOT_TOKEN = os.environ.get("DISCORD_BOT_TOKEN", "")
DISCORD_GUILD_ID = os.environ.get("DISCORD_GUILD_ID", "")
OWNER_DISCORD_ID = os.environ.get("OWNER_DISCORD_ID", "")

LOG_CHANNELS = {
    "ranking": os.environ.get("LOG_CHANNEL_RANKING", ""),
    "admin_ingame": os.environ.get("LOG_CHANNEL_ADMIN_INGAME", ""),
    "punishment": os.environ.get("LOG_CHANNEL_PUNISHMENT", ""),
    "authority": os.environ.get("LOG_CHANNEL_AUTHORITY", ""),
    "sessions": os.environ.get("LOG_CHANNEL_SESSIONS", ""),
    "events": os.environ.get("LOG_CHANNEL_EVENTS", ""),
}

DEFAULT_PERMISSIONS = [
    "dashboard.view",
    "bookings.create",
    "bookings.manage",
    "players.view",
    "players.warn",
    "players.mute",
    "players.blacklist",
    "players.terminate",
    "players.gameban",
    "players.machineban",
    "players.revert",
    "events.create",
    "events.manage",
    "sessions.create",
    "sessions.manage",
    "sessions.view_active",
    "sessions.view_logs",
    "ranking.promote",
    "ranking.demote",
    "authorities.grant",
    "authorities.revoke",
    "forum.moderate",
    "hosting.manage",
    "settings.manage",
    "roblox.link",
]

ROBLOX_GROUP_ID = os.environ.get("ROBLOX_GROUP_ID", "")
ROBLOX_OPEN_CLOUD_API_KEY = os.environ.get("ROBLOX_OPEN_CLOUD_API_KEY", "")
INGEST_SECRET = os.environ.get("INGEST_SECRET", "")
GAME_API_KEY = os.environ.get("GAME_API_KEY", "")
ROBLOX_OAUTH_CLIENT_ID = os.environ.get("ROBLOX_OAUTH_CLIENT_ID", "")
ROBLOX_OAUTH_CLIENT_SECRET = os.environ.get("ROBLOX_OAUTH_CLIENT_SECRET", "")

# ---------- Roblox helpers ----------
async def roblox_user_by_name(username: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post("https://users.roblox.com/v1/usernames/users",
                             json={"usernames": [username], "excludeBannedUsers": False})
            if r.status_code != 200: return None
            data = r.json().get("data") or []
            if not data: return None
            u = data[0]
            # headshot
            h = await c.get(
                "https://thumbnails.roblox.com/v1/users/avatar-headshot",
                params={"userIds": u["id"], "size": "150x150", "format": "Png", "isCircular": "true"},
            )
            avatar = None
            if h.status_code == 200:
                hd = h.json().get("data") or []
                if hd: avatar = hd[0].get("imageUrl")
            return {"id": u["id"], "name": u["name"], "display_name": u.get("displayName"), "avatar": avatar}
    except Exception as e:
        log.warning("roblox lookup failed: %s", e)
        return None

async def roblox_group_role(user_id: int) -> Optional[dict]:
    if not ROBLOX_GROUP_ID: return None
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"https://groups.roblox.com/v2/users/{user_id}/groups/roles")
            if r.status_code != 200: return None
            for g in (r.json().get("data") or []):
                if str(g.get("group", {}).get("id")) == str(ROBLOX_GROUP_ID):
                    return {"name": g["role"]["name"], "rank": g["role"]["rank"]}
            return {"name": "Guest", "rank": 0}
    except Exception:
        return None

async def roblox_group_roles_all() -> List[dict]:
    if not ROBLOX_GROUP_ID: return []
    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.get(f"https://groups.roblox.com/v1/groups/{ROBLOX_GROUP_ID}/roles")
            if r.status_code != 200: return []
            return r.json().get("roles") or []
    except Exception:
        return []

async def roblox_set_rank(user_id: int, role_id: int) -> dict:
    """Set a user's rank in the group via Open Cloud (legacy v1 endpoint accepts API key)."""
    if not (ROBLOX_GROUP_ID and ROBLOX_OPEN_CLOUD_API_KEY):
        raise HTTPException(400, "Roblox group / open cloud not configured")
    url = f"https://groups.roblox.com/v1/groups/{ROBLOX_GROUP_ID}/users/{user_id}"
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.patch(url, json={"roleId": role_id},
                          headers={"x-api-key": ROBLOX_OPEN_CLOUD_API_KEY,
                                   "Content-Type": "application/json"})
        if r.status_code not in (200, 204):
            raise HTTPException(400, f"Roblox rank update failed: {r.status_code} {r.text}")
    return {"ok": True}

# ---------- Models ----------
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    discord_id: str
    username: str
    avatar: Optional[str] = None
    roles: List[str] = []
    permissions: List[str] = []
    roblox_username: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Room(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    image: str
    gamepass_id: Optional[str] = None
    price_robux: int = 0

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_discord_id: str
    user_username: str
    room_id: str
    room_name: str
    room_number: int
    status: str = "confirmed"  # confirmed | cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Settings(BaseModel):
    id: str = "global"
    theme_default: str = "dark"
    roblox_group_id: Optional[str] = None
    linked_servers: List[Dict[str, Any]] = []
    permissions_by_role: Dict[str, List[str]] = {}

# ---------- Auth helpers ----------
def make_token(payload: dict) -> str:
    payload = dict(payload)
    payload["exp"] = datetime.now(timezone.utc) + timedelta(seconds=JWT_TTL)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

async def current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing token")
    token = authorization.split(None, 1)[1]
    data = decode_token(token)
    user = await db.users.find_one({"discord_id": data["discord_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(401, "User not found")
    return user

def require_perm(perm: str):
    async def dep(user=Depends(current_user)):
        if perm not in user.get("permissions", []) and "owner" not in user.get("roles", []):
            raise HTTPException(403, f"Missing permission: {perm}")
        return user
    return dep

# ---------- Routes ----------
@api.get("/")
async def root():
    return {"name": "Nexora Resorts API", "ok": True}

@api.get("/health")
async def health():
    bot_status = "configured" if DISCORD_BOT_TOKEN else "demo"
    oauth_status = "configured" if DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET else "demo"
    return {"ok": True, "bot": bot_status, "oauth": oauth_status, "guild": DISCORD_GUILD_ID}

# ----- Auth -----
@api.get("/auth/discord/url")
async def discord_oauth_url(redirect: Optional[str] = None):
    if not DISCORD_CLIENT_ID:
        return {"configured": False, "url": None}
    redirect_uri = redirect or DISCORD_REDIRECT_URI
    scope = "identify guilds"
    url = (
        f"https://discord.com/oauth2/authorize?client_id={DISCORD_CLIENT_ID}"
        f"&response_type=code&scope={scope.replace(' ', '%20')}"
        f"&redirect_uri={redirect_uri}"
    )
    return {"configured": True, "url": url}

class DiscordCallbackIn(BaseModel):
    code: str
    redirect_uri: str

@api.post("/auth/discord/callback")
async def discord_callback(body: DiscordCallbackIn):
    if not (DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET):
        raise HTTPException(400, "Discord OAuth not configured")
    async with httpx.AsyncClient(timeout=15) as c:
        token_res = await c.post(
            "https://discord.com/api/oauth2/token",
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": body.code,
                "redirect_uri": body.redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise HTTPException(400, f"Discord token exchange failed: {token_res.text}")
        access = token_res.json()["access_token"]
        me = await c.get("https://discord.com/api/users/@me", headers={"Authorization": f"Bearer {access}"})
        if me.status_code != 200:
            raise HTTPException(400, "Failed to fetch Discord profile")
        prof = me.json()
    discord_id = prof["id"]
    is_owner = OWNER_DISCORD_ID and discord_id == OWNER_DISCORD_ID
    user = await db.users.find_one({"discord_id": discord_id}, {"_id": 0})
    if not user:
        u = User(
            discord_id=discord_id,
            username=prof.get("global_name") or prof.get("username", "User"),
            avatar=(
                f"https://cdn.discordapp.com/avatars/{discord_id}/{prof['avatar']}.png"
                if prof.get("avatar") else None
            ),
            roles=["owner"] if is_owner else ["member"],
            permissions=DEFAULT_PERMISSIONS if is_owner else ["dashboard.view", "bookings.create"],
        )
        await db.users.insert_one(u.model_dump())
        user = u.model_dump()
    token = make_token({"discord_id": user["discord_id"], "username": user["username"]})
    return {"token": token, "user": user}

@api.get("/auth/me")
async def auth_me(user=Depends(current_user)):
    return {"user": user}

# ----- Rooms & Bookings -----
DEFAULT_ROOMS = [
    {"name": "Ocean Suite", "description": "Beachfront suite with private balcony and ocean view.",
     "image": "https://images.unsplash.com/photo-1702830499141-a0634d87d6af?crop=entropy&cs=srgb&fm=jpg&q=85", "gamepass_id": None, "price_robux": 0},
    {"name": "Garden Villa", "description": "Lush garden villa surrounded by tropical landscaping.",
     "image": "https://images.unsplash.com/photo-1718942899965-4fc10607d805?crop=entropy&cs=srgb&fm=jpg&q=85", "gamepass_id": None, "price_robux": 0},
    {"name": "Presidential Penthouse", "description": "Top-floor penthouse with panoramic island views.",
     "image": "https://images.unsplash.com/photo-1776763018972-588e27bf6511?crop=entropy&cs=srgb&fm=jpg&q=85", "gamepass_id": None, "price_robux": 0},
]

async def ensure_seed():
    count = await db.rooms.count_documents({})
    if count == 0:
        for r in DEFAULT_ROOMS:
            await db.rooms.insert_one(Room(**r).model_dump())

@api.get("/rooms")
async def list_rooms():
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(100)
    return {"rooms": rooms}

@api.post("/rooms")
async def create_room(body: Room, user=Depends(require_perm("settings.manage"))):
    await db.rooms.insert_one(body.model_dump())
    return body

class BookingIn(BaseModel):
    room_id: str

@api.post("/bookings")
async def create_booking(body: BookingIn, user=Depends(current_user)):
    room = await db.rooms.find_one({"id": body.room_id}, {"_id": 0})
    if not room:
        raise HTTPException(404, "Room not found")
    count = await db.bookings.count_documents({})
    bk = Booking(
        user_discord_id=user["discord_id"],
        user_username=user["username"],
        room_id=room["id"],
        room_name=room["name"],
        room_number=100 + count + 1,
    )
    await db.bookings.insert_one(bk.model_dump())
    try:
        import discord_bot as _b
        if _b.is_running() and user["discord_id"] and user["discord_id"] != "000000000000000000":
            await _b.dm_booking(
                discord_user_id=user["discord_id"],
                mention=f"<@{user['discord_id']}>",
                room_number=bk.room_number, game_link=None, booking_id=bk.id,
            )
    except Exception as e:
        log.warning("DM booking failed: %s", e)
    return bk

@api.get("/bookings")
async def list_bookings(user=Depends(current_user)):
    is_priv = "bookings.manage" in user.get("permissions", []) or "owner" in user.get("roles", [])
    q = {} if is_priv else {"user_discord_id": user["discord_id"]}
    items = await db.bookings.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"bookings": items}

@api.post("/bookings/{bid}/cancel")
async def cancel_booking(bid: str, user=Depends(current_user)):
    bk = await db.bookings.find_one({"id": bid}, {"_id": 0})
    if not bk:
        raise HTTPException(404, "Booking not found")
    if bk["user_discord_id"] != user["discord_id"] and "bookings.manage" not in user.get("permissions", []):
        raise HTTPException(403, "Cannot cancel another user's booking")
    await db.bookings.update_one({"id": bid}, {"$set": {"status": "cancelled"}})
    return {"ok": True}

# ----- Users / Permissions -----
@api.get("/users")
async def list_users(user=Depends(require_perm("settings.manage"))):
    items = await db.users.find({}, {"_id": 0}).to_list(500)
    return {"users": items}

class UpdatePermsIn(BaseModel):
    permissions: List[str]
    roles: Optional[List[str]] = None

@api.put("/users/{uid}/permissions")
async def update_perms(uid: str, body: UpdatePermsIn, user=Depends(require_perm("settings.manage"))):
    update = {"permissions": body.permissions}
    if body.roles is not None:
        update["roles"] = body.roles
    res = await db.users.update_one({"id": uid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "User not found")
    return {"ok": True}

@api.get("/permissions")
async def list_perms(user=Depends(current_user)):
    return {"permissions": DEFAULT_PERMISSIONS}

# ----- Settings -----
@api.get("/settings")
async def get_settings(user=Depends(current_user)):
    s = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not s:
        s = Settings().model_dump()
        await db.settings.insert_one(s)
    s["log_channels"] = LOG_CHANNELS
    s["guild_id"] = DISCORD_GUILD_ID
    s["bot_status"] = "online" if DISCORD_BOT_TOKEN else "offline (no token)"
    return {"settings": s}

class SettingsIn(BaseModel):
    theme_default: Optional[str] = None
    roblox_group_id: Optional[str] = None
    linked_servers: Optional[List[Dict[str, Any]]] = None

@api.put("/settings")
async def update_settings(body: SettingsIn, user=Depends(require_perm("settings.manage"))):
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    await db.settings.update_one({"id": "global"}, {"$set": update}, upsert=True)
    return {"ok": True}

# ----- Generic stub collections (players, events, sessions, authorities, forum, hosting) -----
COLLECTIONS = {
    "players": "players.view",
    "punishments": "players.view",
    "events": "events.create",
    "sessions": "sessions.create",
    "authorities": "authorities.grant",
    "forum_threads": "dashboard.view",
    "hosted_bots": "hosting.manage",
}

@api.get("/collections/{name}")
async def col_list(name: str, user=Depends(current_user)):
    if name not in COLLECTIONS:
        raise HTTPException(404, "Unknown collection")
    items = await db[name].find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"items": items}

@api.post("/collections/{name}")
async def col_create(name: str, body: Dict[str, Any], user=Depends(current_user)):
    if name not in COLLECTIONS:
        raise HTTPException(404, "Unknown collection")
    perm = COLLECTIONS[name]
    if perm not in user.get("permissions", []) and "owner" not in user.get("roles", []):
        raise HTTPException(403, f"Missing permission: {perm}")
    doc = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["username"],
        "created_by_id": user["discord_id"],
        **body,
    }
    await db[name].insert_one(doc)
    doc.pop("_id", None)
    # Side-effects: post embeds to Discord channels for certain collections.
    try:
        import discord_bot as _b
        if name == "punishments":
            mid = await _b.send_punishment_log(
                target=doc.get("target") or "—", p_type=doc.get("type") or "Note",
                reason=doc.get("reason") or "", issued_by=user.get("username") or "—",
            )
            if mid:
                await db.punishments.update_one({"id": doc["id"]}, {"$set": {"discord_message_id": mid}})
        elif name == "sessions":
            # Look up host's registered game server (if recent).
            join_link = None
            host_rb_id = doc.get("host_roblox_user_id") or (
                (await db.users.find_one({"discord_id": user.get("discord_id")}, {"_id": 0}) or {}).get("roblox_user_id")
            )
            if host_rb_id:
                gs = await db.game_servers.find_one({"host_roblox_id": int(host_rb_id)}, {"_id": 0})
                if gs: join_link = gs.get("join_link")
            mid = await _b.send_session_log(
                session_type=doc.get("session_type") or "Session",
                host=doc.get("host") or user.get("username") or "—",
                attendees_count=int(doc.get("required_attendees") or 0),
                co_hosts=list(doc.get("co_hosts") or []),
                support=list(doc.get("support_staff") or []),
                supervisors=list(doc.get("supervisors") or ([doc["supervisor"]] if doc.get("supervisor") else [])),
                phases=list(doc.get("phases") or []),
                current_phase=int(doc.get("phase_progress") or 0),
                join_link=join_link,
            )
            if mid:
                await db.sessions.update_one({"id": doc["id"]}, {"$set": {"discord_message_id": mid, "join_link": join_link}})
        elif name == "events":
            mid = await _b.send_event_log(
                title=doc.get("title") or "Event",
                when=doc.get("timestamp") or doc.get("when") or "TBD",
                host=doc.get("host") or user.get("username") or "—",
                co_host=doc.get("co_host"),
                supervisor=doc.get("supervisor"),
                description=doc.get("description") or "",
                game_link=doc.get("game_link"),
            )
            if mid:
                await db.events.update_one({"id": doc["id"]}, {"$set": {"discord_message_id": mid}})
    except Exception as e:
        log.warning("discord side-effect failed for %s: %s", name, e)
    return doc

@api.delete("/collections/{name}/{item_id}")
async def col_delete(name: str, item_id: str, user=Depends(current_user)):
    if name not in COLLECTIONS:
        raise HTTPException(404, "Unknown collection")
    perm = COLLECTIONS[name]
    if perm not in user.get("permissions", []) and "owner" not in user.get("roles", []):
        raise HTTPException(403, f"Missing permission: {perm}")
    # Side-effect: if this is a session, remove the embed from the channel.
    if name == "sessions":
        s = await db[name].find_one({"id": item_id}, {"_id": 0})
        if s and s.get("discord_message_id"):
            try:
                import discord_bot as _b
                await _b.delete_session_message(int(s["discord_message_id"]))
            except Exception:
                pass
    res = await db[name].delete_one({"id": item_id})
    return {"ok": res.deleted_count == 1}

@api.post("/sessions/{sid}/advance")
async def session_advance(sid: str, user=Depends(require_perm("sessions.create"))):
    s = await db.sessions.find_one({"id": sid}, {"_id": 0})
    if not s: raise HTTPException(404, "Session not found")
    phases = list(s.get("phases") or [])
    cur = int(s.get("phase_progress") or 0) + 1
    if cur > len(phases):
        cur = len(phases)
    await db.sessions.update_one({"id": sid}, {"$set": {"phase_progress": cur}})
    try:
        import discord_bot as _b
        if s.get("discord_message_id"):
            await _b.update_session_embed(
                message_id=int(s["discord_message_id"]),
                session_type=s.get("session_type") or "Session",
                host=s.get("host") or "—",
                attendees_count=int(s.get("required_attendees") or 0),
                co_hosts=list(s.get("co_hosts") or []),
                support=list(s.get("support_staff") or []),
                supervisors=list(s.get("supervisors") or ([s["supervisor"]] if s.get("supervisor") else [])),
                phases=phases, current_phase=cur,
                join_link=s.get("join_link"),
            )
    except Exception as e:
        log.warning("advance embed update failed: %s", e)
    return {"ok": True, "current_phase": cur, "total_phases": len(phases)}

@api.post("/sessions/{sid}/end")
async def session_end(sid: str, user=Depends(require_perm("sessions.create"))):
    s = await db.sessions.find_one({"id": sid}, {"_id": 0})
    if not s: raise HTTPException(404, "Session not found")
    await db.sessions.update_one({"id": sid}, {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc).isoformat(), "ended_by": user["username"]}})
    try:
        import discord_bot as _b
        if s.get("discord_message_id"):
            await _b.delete_session_message(int(s["discord_message_id"]))
    except Exception:
        pass
    return {"ok": True}

# ----- Bot status -----
@api.get("/bot/status")
async def bot_status(user=Depends(current_user)):
    return {
        "configured": bool(DISCORD_BOT_TOKEN),
        "guild_id": DISCORD_GUILD_ID,
        "log_channels": LOG_CHANNELS,
        "owner_id": OWNER_DISCORD_ID,
    }

# ----- Roblox lookups -----
@api.get("/roblox/user")
async def roblox_user(username: str, user=Depends(current_user)):
    u = await roblox_user_by_name(username)
    if not u:
        raise HTTPException(404, "Roblox user not found")
    role = await roblox_group_role(u["id"])
    return {"user": u, "group_role": role, "group_id": ROBLOX_GROUP_ID}

class LinkRobloxIn(BaseModel):
    username: str

@api.post("/me/roblox/link")
async def link_my_roblox(body: LinkRobloxIn, user=Depends(current_user)):
    u = await roblox_user_by_name(body.username)
    if not u:
        raise HTTPException(404, "Roblox user not found")
    role = await roblox_group_role(u["id"]) or {"name": "Guest", "rank": 0}
    await db.users.update_one(
        {"discord_id": user["discord_id"]},
        {"$set": {
            "roblox_username": u["name"],
            "roblox_user_id": u["id"],
            "roblox_avatar": u["avatar"],
            "roblox_group_role": role,
        }},
    )
    return {"ok": True, "roblox": u, "group_role": role}

# ----- Catalogs (session types, room types) -----
class SessionType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    required_attendees: int = 5
    phases: List[str] = ["Phase 1"]

class RoomType(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    image: str = ""
    checkmein_link: str = ""
    gamepass_id: str = ""

@api.get("/catalog/session-types")
async def list_session_types():
    items = await db.session_types.find({}, {"_id": 0}).to_list(200)
    if not items:
        for n, req, ph in [
            ("Training", 5, ["Briefing", "Drills", "Scenario", "Debrief"]),
            ("Shift", 4, ["Open", "Operations", "Close"]),
            ("Tryouts", 6, ["Greeting", "Tests", "Decisions"]),
            ("Inspection", 3, ["Inspection", "Report"]),
            ("Interview", 2, ["Interview", "Outcome"]),
        ]:
            await db.session_types.insert_one(SessionType(name=n, required_attendees=req, phases=ph).model_dump())
        items = await db.session_types.find({}, {"_id": 0}).to_list(200)
    return {"items": items}

@api.post("/catalog/session-types")
async def create_session_type(body: SessionType, user=Depends(require_perm("settings.manage"))):
    await db.session_types.insert_one(body.model_dump())
    return body

@api.put("/catalog/session-types/{sid}")
async def update_session_type(sid: str, body: SessionType, user=Depends(require_perm("settings.manage"))):
    await db.session_types.update_one({"id": sid}, {"$set": body.model_dump(exclude={"id"})})
    return {"ok": True}

@api.delete("/catalog/session-types/{sid}")
async def delete_session_type(sid: str, user=Depends(require_perm("settings.manage"))):
    await db.session_types.delete_one({"id": sid})
    return {"ok": True}

@api.get("/catalog/room-types")
async def list_room_types():
    items = await db.room_types.find({}, {"_id": 0}).to_list(200)
    return {"items": items}

@api.post("/catalog/room-types")
async def create_room_type(body: RoomType, user=Depends(require_perm("settings.manage"))):
    await db.room_types.insert_one(body.model_dump())
    if body.image:
        # mirror to legacy rooms collection so Bookings page also reflects it
        await db.rooms.insert_one(Room(name=body.name, description=body.description, image=body.image,
                                       gamepass_id=body.gamepass_id or None).model_dump())
    return body

@api.put("/catalog/room-types/{rid}")
async def update_room_type(rid: str, body: RoomType, user=Depends(require_perm("settings.manage"))):
    await db.room_types.update_one({"id": rid}, {"$set": body.model_dump(exclude={"id"})})
    return {"ok": True}

@api.delete("/catalog/room-types/{rid}")
async def delete_room_type(rid: str, user=Depends(require_perm("settings.manage"))):
    await db.room_types.delete_one({"id": rid})
    return {"ok": True}

# ----- Player aggregate (search by Roblox username) -----
@api.get("/players/lookup")
async def players_lookup(username: str, user=Depends(require_perm("players.view"))):
    rb = await roblox_user_by_name(username)
    role = await roblox_group_role(rb["id"]) if rb else None
    name_l = username.lower()
    chat_logs = await db.chatlogs.find({"username_l": name_l}, {"_id": 0}).sort("created_at", -1).to_list(500)
    admin_logs = await db.adminlogs.find({"username_l": name_l}, {"_id": 0}).sort("created_at", -1).to_list(500)
    punishments = await db.punishments.find({"target": {"$regex": f"^{username}$", "$options": "i"}}, {"_id": 0}).sort("created_at", -1).to_list(500)
    sessions_hosted = await db.sessions.find({"host": {"$regex": f"^{username}$", "$options": "i"}}, {"_id": 0}).to_list(500)
    sessions_attended = await db.sessions.find({"attendees": name_l}, {"_id": 0}).to_list(500)
    sessions_cohosted = await db.sessions.find({"co_hosts": name_l}, {"_id": 0}).to_list(500)
    sessions_supervised = await db.sessions.find({"supervisor": {"$regex": f"^{username}$", "$options": "i"}}, {"_id": 0}).to_list(500)
    return {
        "roblox": rb,
        "group_role": role,
        "chat_logs": chat_logs,
        "admin_logs": admin_logs,
        "punishments": punishments,
        "sessions": {
            "hosted": sessions_hosted,
            "attended": sessions_attended,
            "cohosted": sessions_cohosted,
            "supervised": sessions_supervised,
        },
    }

# ----- Ingest (game → website) -----
def _check_ingest(secret: Optional[str]):
    if not INGEST_SECRET or secret != INGEST_SECRET:
        raise HTTPException(401, "Invalid ingest secret")

class ChatLogIn(BaseModel):
    secret: str
    username: str
    message: str
    server_id: Optional[str] = None
    place_id: Optional[str] = None
    filtered: Optional[bool] = False

@api.post("/ingest/chatlog")
async def ingest_chatlog(body: ChatLogIn):
    _check_ingest(body.secret)
    doc = {
        "id": str(uuid.uuid4()),
        "username": body.username,
        "username_l": body.username.lower(),
        "message": body.message,
        "server_id": body.server_id,
        "place_id": body.place_id,
        "filtered": bool(body.filtered),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chatlogs.insert_one(doc); doc.pop("_id", None)
    return {"ok": True}

class AdminLogIn(BaseModel):
    secret: str
    username: str
    command: str
    target: Optional[str] = None
    args: Optional[str] = None
    server_id: Optional[str] = None

@api.post("/ingest/adminlog")
async def ingest_adminlog(body: AdminLogIn):
    _check_ingest(body.secret)
    doc = {
        "id": str(uuid.uuid4()),
        "username": body.username,
        "username_l": body.username.lower(),
        "command": body.command,
        "target": body.target,
        "args": body.args,
        "server_id": body.server_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.adminlogs.insert_one(doc); doc.pop("_id", None)
    return {"ok": True}

@api.get("/ingest/info")
async def ingest_info(user=Depends(require_perm("settings.manage"))):
    return {"ingest_secret": INGEST_SECRET, "endpoints": ["/api/ingest/chatlog", "/api/ingest/adminlog"]}

# ----- Activity (API-managed feed of recent system events) -----
@api.get("/activity")
async def activity(user=Depends(current_user)):
    items = []
    cursors = [
        ("booking", db.bookings.find({}, {"_id": 0}).sort("created_at", -1).limit(20)),
        ("punishment", db.punishments.find({}, {"_id": 0}).sort("created_at", -1).limit(20)),
        ("event", db.events.find({}, {"_id": 0}).sort("created_at", -1).limit(20)),
        ("session", db.sessions.find({}, {"_id": 0}).sort("created_at", -1).limit(20)),
        ("authority", db.authorities.find({}, {"_id": 0}).sort("created_at", -1).limit(20)),
    ]
    for kind, cur in cursors:
        async for doc in cur:
            items.append({"kind": kind, **doc})
    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return {"items": items[:80]}

# ----- Roblox OAuth2 -----
@api.get("/auth/roblox/url")
async def roblox_oauth_url(redirect: Optional[str] = None):
    if not ROBLOX_OAUTH_CLIENT_ID:
        return {"configured": False, "url": None}
    redirect_uri = redirect or ""
    state = uuid.uuid4().hex
    url = (
        "https://apis.roblox.com/oauth/v1/authorize"
        f"?client_id={ROBLOX_OAUTH_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=openid%20profile%20group:read"
        f"&response_type=code&state={state}"
    )
    return {"configured": True, "url": url, "state": state}

class RobloxCallbackIn(BaseModel):
    code: str
    redirect_uri: str

@api.post("/auth/roblox/callback")
async def roblox_callback(body: RobloxCallbackIn, user=Depends(current_user)):
    if not (ROBLOX_OAUTH_CLIENT_ID and ROBLOX_OAUTH_CLIENT_SECRET):
        raise HTTPException(400, "Roblox OAuth not configured")
    async with httpx.AsyncClient(timeout=15) as c:
        tok = await c.post(
            "https://apis.roblox.com/oauth/v1/token",
            data={
                "client_id": ROBLOX_OAUTH_CLIENT_ID,
                "client_secret": ROBLOX_OAUTH_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": body.code,
                "redirect_uri": body.redirect_uri,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if tok.status_code != 200:
            raise HTTPException(400, f"Roblox token exchange failed: {tok.text}")
        access = tok.json()["access_token"]
        me = await c.get("https://apis.roblox.com/oauth/v1/userinfo",
                         headers={"Authorization": f"Bearer {access}"})
        if me.status_code != 200:
            raise HTTPException(400, "Roblox userinfo failed")
        ui = me.json()
    rid = int(ui["sub"])
    role = await roblox_group_role(rid) or {"name": "Guest", "rank": 0}
    await db.users.update_one(
        {"discord_id": user["discord_id"]},
        {"$set": {
            "roblox_user_id": rid,
            "roblox_username": ui.get("preferred_username") or ui.get("name"),
            "roblox_avatar": ui.get("picture"),
            "roblox_group_role": role,
        }},
    )
    return {"ok": True, "roblox_id": rid, "group_role": role}

# ----- Dashboard roles (real, not test) -----
class DashRole(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    permissions: List[str] = []
    color: Optional[str] = None

@api.get("/catalog/dash-roles")
async def list_dash_roles():
    items = await db.dash_roles.find({}, {"_id": 0}).to_list(200)
    return {"items": items}

@api.post("/catalog/dash-roles")
async def create_dash_role(body: DashRole, user=Depends(require_perm("settings.manage"))):
    await db.dash_roles.insert_one(body.model_dump()); return body

@api.put("/catalog/dash-roles/{rid}")
async def update_dash_role(rid: str, body: DashRole, user=Depends(require_perm("settings.manage"))):
    await db.dash_roles.update_one({"id": rid}, {"$set": body.model_dump(exclude={"id"})})
    return {"ok": True}

@api.delete("/catalog/dash-roles/{rid}")
async def delete_dash_role(rid: str, user=Depends(require_perm("settings.manage"))):
    await db.dash_roles.delete_one({"id": rid}); return {"ok": True}

class AssignRoleIn(BaseModel):
    role_id: Optional[str] = None
    extra_permissions: Optional[List[str]] = None

@api.post("/users/{uid}/assign-role")
async def assign_role(uid: str, body: AssignRoleIn, user=Depends(require_perm("settings.manage"))):
    update: Dict[str, Any] = {}
    perms: List[str] = []
    if body.role_id:
        role = await db.dash_roles.find_one({"id": body.role_id}, {"_id": 0})
        if not role: raise HTTPException(404, "Role not found")
        update["dash_role_id"] = role["id"]
        update["dash_role_name"] = role["name"]
        perms = list(role.get("permissions") or [])
    else:
        update["dash_role_id"] = None
        update["dash_role_name"] = None
    if body.extra_permissions:
        perms = list(set(perms + body.extra_permissions))
    update["permissions"] = perms
    res = await db.users.update_one({"id": uid}, {"$set": update})
    if res.matched_count == 0: raise HTTPException(404, "User not found")
    return {"ok": True}

# ----- Role / Authority linking -----
class RoleLink(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    roblox_rank: Optional[int] = None
    roblox_rank_name: Optional[str] = None
    discord_role_id: Optional[str] = None
    dash_role_id: Optional[str] = None
    authority: bool = False

@api.get("/catalog/role-links")
async def list_role_links(user=Depends(current_user)):
    items = await db.role_links.find({}, {"_id": 0}).to_list(500)
    return {"items": items}

@api.post("/catalog/role-links")
async def create_role_link(body: RoleLink, user=Depends(require_perm("settings.manage"))):
    await db.role_links.insert_one(body.model_dump()); return body

@api.put("/catalog/role-links/{lid}")
async def update_role_link(lid: str, body: RoleLink, user=Depends(require_perm("settings.manage"))):
    await db.role_links.update_one({"id": lid}, {"$set": body.model_dump(exclude={"id"})})
    return {"ok": True}

@api.delete("/catalog/role-links/{lid}")
async def delete_role_link(lid: str, user=Depends(require_perm("settings.manage"))):
    await db.role_links.delete_one({"id": lid}); return {"ok": True}

# ----- Authorities (grant/revoke) -----
class GrantAuthorityIn(BaseModel):
    roblox_username: str
    roblox_user_id: Optional[int] = None
    discord_id: Optional[str] = None
    rank: str

@api.post("/authorities/grant")
async def grant_authority(body: GrantAuthorityIn, user=Depends(require_perm("authorities.grant"))):
    rid = body.roblox_user_id
    if not rid:
        rb = await roblox_user_by_name(body.roblox_username)
        if rb: rid = rb["id"]
    doc = {
        "id": str(uuid.uuid4()),
        "roblox_username": body.roblox_username,
        "roblox_user_id": rid,
        "discord_id": body.discord_id,
        "rank": body.rank,
        "granted_by": user["username"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "active": True,
    }
    await db.authorities.insert_one(doc); doc.pop("_id", None)
    try:
        import discord_bot
        mid = await discord_bot.send_authority_log(
            roblox_username=body.roblox_username, discord_id=body.discord_id or "—",
            rank=body.rank, by=user["username"],
        )
        if mid:
            await db.authorities.update_one({"id": doc["id"]}, {"$set": {"discord_message_id": mid}})
    except Exception as e:
        log.warning("authority log failed: %s", e)
    return doc

@api.post("/authorities/{aid}/revoke")
async def revoke_authority(aid: str, user=Depends(require_perm("authorities.revoke"))):
    a = await db.authorities.find_one({"id": aid}, {"_id": 0})
    if not a: raise HTTPException(404, "Not found")
    await db.authorities.update_one({"id": aid}, {"$set": {"active": False, "revoked_by": user["username"]}})
    try:
        import discord_bot
        await discord_bot.reply_revert("authority", a.get("discord_message_id"), by=user["username"])
    except Exception:
        pass
    return {"ok": True}

# ----- Game-facing API -----
def _game_auth(x_nexora_game_key: Optional[str] = Header(None)):
    if not GAME_API_KEY or x_nexora_game_key != GAME_API_KEY:
        raise HTTPException(401, "Invalid game API key")
    return True

@api.get("/game/authority")
async def game_authority(roblox_id: Optional[int] = None, username: Optional[str] = None,
                         _=Depends(_game_auth)):
    if not roblox_id and username:
        rb = await roblox_user_by_name(username)
        if rb: roblox_id = rb["id"]
    if not roblox_id:
        return {"authority": None}
    a = await db.authorities.find_one(
        {"roblox_user_id": roblox_id, "active": True},
        {"_id": 0}, sort=[("created_at", -1)],
    )
    return {"authority": a["rank"] if a else None, "record": a}

@api.get("/game/permissions")
async def game_perms(roblox_id: Optional[int] = None, username: Optional[str] = None,
                     _=Depends(_game_auth)):
    if not roblox_id and username:
        rb = await roblox_user_by_name(username)
        if rb: roblox_id = rb["id"]
    if not roblox_id:
        return {"permissions": [], "dash_role": None}
    u = await db.users.find_one({"roblox_user_id": roblox_id}, {"_id": 0})
    return {
        "permissions": (u or {}).get("permissions") or [],
        "dash_role": (u or {}).get("dash_role_name"),
        "roblox_group_role": (u or {}).get("roblox_group_role"),
    }

@api.post("/game/punishment")
async def game_punishment(payload: Dict[str, Any], _=Depends(_game_auth)):
    target = str(payload.get("target") or "").strip()
    if not target:
        raise HTTPException(400, "target required")
    doc = {
        "id": str(uuid.uuid4()),
        "target": target,
        "type": payload.get("type") or "Note",
        "reason": payload.get("reason") or "",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": payload.get("by") or "in-game",
    }
    await db.punishments.insert_one(doc); doc.pop("_id", None)
    try:
        import discord_bot
        await discord_bot.send_punishment_log(
            target=doc["target"], p_type=doc["type"], reason=doc["reason"], issued_by=doc["created_by"],
        )
    except Exception:
        pass
    return doc

@api.get("/game/info")
async def game_info(user=Depends(require_perm("settings.manage"))):
    return {
        "game_api_key": GAME_API_KEY,
        "endpoints": {
            "authority":   "GET  /api/game/authority?roblox_id=<id>",
            "permissions": "GET  /api/game/permissions?roblox_id=<id>",
            "punishment":  "POST /api/game/punishment",
            "chatlog":     "POST /api/ingest/chatlog",
            "adminlog":    "POST /api/ingest/adminlog",
        },
        "headers": {"X-Nexora-Game-Key": "<GAME_API_KEY>"},
    }

# ----- Bot health -----
@api.get("/bot/health")
async def bot_health(user=Depends(current_user)):
    import discord_bot as _b
    return {
        "running": _b.is_running(),
        "guild_id": DISCORD_GUILD_ID,
        "token_configured": bool(DISCORD_BOT_TOKEN),
        "log_channels": LOG_CHANNELS,
    }

@api.post("/ranking/sweep")
async def ranking_sweep(user=Depends(require_perm("ranking.promote"))):
    """Walk every linked user and demote anyone who has left the group to rank 241."""
    roles = await roblox_group_roles_all()
    target = next((r for r in roles if int(r.get("rank", 0)) == DEFAULT_OUT_OF_GROUP_RANK_ID), None)
    if not target:
        raise HTTPException(400, f"No role found at rank {DEFAULT_OUT_OF_GROUP_RANK_ID}")
    changed = []
    skipped = 0
    async for u in db.users.find({"roblox_user_id": {"$exists": True, "$ne": None}}, {"_id": 0}):
        try:
            role = await roblox_group_role(u["roblox_user_id"])
            if role and role.get("rank", 0) == 0:
                await roblox_set_rank(int(u["roblox_user_id"]), int(target["id"]))
                changed.append(u.get("roblox_username") or u["roblox_user_id"])
            else:
                skipped += 1
        except Exception as e:
            log.warning("sweep error for %s: %s", u.get("roblox_user_id"), e)
    return {"changed": changed, "skipped": skipped}

@api.post("/ranking/set")
async def ranking_set(body: Dict[str, Any], user=Depends(require_perm("ranking.promote"))):
    """Set a Roblox group rank for a user. body: {roblox_user_id, role_id} OR {username, role_id}."""
    rid = body.get("roblox_user_id")
    if not rid and body.get("username"):
        rb = await roblox_user_by_name(body["username"])
        if rb: rid = rb["id"]
    role_id = body.get("role_id")
    if not (rid and role_id):
        raise HTTPException(400, "roblox_user_id and role_id required")
    await roblox_set_rank(int(rid), int(role_id))
    # Find the role name for logging
    roles = await roblox_group_roles_all()
    role = next((r for r in roles if int(r["id"]) == int(role_id)), None)
    rname = role["name"] if role else str(role_id)
    try:
        import discord_bot as _b
        await _b.send_ranking_log(target=body.get("username") or str(rid), new_rank=rname, by=user["username"])
    except Exception:
        pass
    return {"ok": True, "role": role}

@api.get("/roblox/group/roles")
async def get_group_roles(user=Depends(current_user)):
    return {"roles": await roblox_group_roles_all()}

# Default Roblox rank fallback for users that have left the group.
DEFAULT_OUT_OF_GROUP_RANK_ID = 241

@api.post("/ranking/normalize")
async def ranking_normalize(body: Dict[str, Any], user=Depends(require_perm("ranking.promote"))):
    """If the user is NOT in the group, set them to the configured fallback role (rank 241 / Recreation Staff)."""
    name = body.get("username")
    rb = await roblox_user_by_name(name) if name else None
    if not rb: raise HTTPException(404, "Roblox user not found")
    role = await roblox_group_role(rb["id"])
    if role and role["rank"] != 0:
        return {"ok": True, "skipped": True, "reason": "User already in group", "current": role}
    # find role id for rank 241 in group
    roles = await roblox_group_roles_all()
    target = next((r for r in roles if int(r.get("rank", 0)) == DEFAULT_OUT_OF_GROUP_RANK_ID), None)
    if not target:
        raise HTTPException(400, f"No role found at rank {DEFAULT_OUT_OF_GROUP_RANK_ID}")
    await roblox_set_rank(rb["id"], int(target["id"]))
    return {"ok": True, "set_to": target}

# ----- In-game server registry (host's current server) -----
class GameServerIn(BaseModel):
    secret: str
    host_roblox_id: int
    place_id: int
    job_id: str
    join_link: Optional[str] = None

@api.post("/game/server-status")
async def register_server(body: GameServerIn):
    _check_ingest(body.secret)
    doc = {
        "id": str(uuid.uuid4()),
        "host_roblox_id": int(body.host_roblox_id),
        "place_id": int(body.place_id),
        "job_id": body.job_id,
        "join_link": body.join_link or f"https://www.roblox.com/games/start?placeId={body.place_id}&launchData={body.job_id}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.game_servers.update_one(
        {"host_roblox_id": int(body.host_roblox_id)},
        {"$set": doc}, upsert=True,
    )
    return {"ok": True}

@api.get("/game/server-status")
async def get_server(host_roblox_id: int, user=Depends(current_user)):
    s = await db.game_servers.find_one({"host_roblox_id": int(host_roblox_id)}, {"_id": 0})
    return {"server": s}

# ----- Mount -----
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----- Discord bot worker -----
import discord_bot

@app.on_event("startup")
async def on_startup():
    await ensure_seed()
    log.info("Nexora API ready. Discord bot: %s | OAuth: %s",
             "configured" if DISCORD_BOT_TOKEN else "demo",
             "configured" if DISCORD_CLIENT_ID else "demo")
    if DISCORD_BOT_TOKEN:
        asyncio.create_task(discord_bot.start_bot())

@app.on_event("shutdown")
async def on_shutdown():
    try:
        if discord_bot.is_running():
            await discord_bot.bot.close()
    except Exception:
        pass
    client.close()
