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
    "ranking.promote",
    "ranking.demote",
    "authorities.grant",
    "authorities.revoke",
    "forum.moderate",
    "hosting.manage",
    "settings.manage",
    "roblox.link",
]

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
class DemoLoginIn(BaseModel):
    username: str = "Nexora Owner"
    discord_id: str = "000000000000000000"
    as_owner: bool = True

@api.post("/auth/demo")
async def auth_demo(body: DemoLoginIn):
    """Demo login when Discord OAuth is not configured. Creates / fetches user."""
    user = await db.users.find_one({"discord_id": body.discord_id}, {"_id": 0})
    if not user:
        u = User(
            discord_id=body.discord_id,
            username=body.username,
            avatar=None,
            roles=["owner"] if body.as_owner else ["member"],
            permissions=DEFAULT_PERMISSIONS if body.as_owner else ["dashboard.view", "bookings.create"],
        )
        await db.users.insert_one(u.model_dump())
        user = u.model_dump()
    token = make_token({"discord_id": user["discord_id"], "username": user["username"]})
    return {"token": token, "user": user}

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
    # gamepass check is MOCKED — always passes for now
    count = await db.bookings.count_documents({})
    bk = Booking(
        user_discord_id=user["discord_id"],
        user_username=user["username"],
        room_id=room["id"],
        room_name=room["name"],
        room_number=100 + count + 1,
    )
    await db.bookings.insert_one(bk.model_dump())
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
    return doc

@api.delete("/collections/{name}/{item_id}")
async def col_delete(name: str, item_id: str, user=Depends(current_user)):
    if name not in COLLECTIONS:
        raise HTTPException(404, "Unknown collection")
    perm = COLLECTIONS[name]
    if perm not in user.get("permissions", []) and "owner" not in user.get("roles", []):
        raise HTTPException(403, f"Missing permission: {perm}")
    res = await db[name].delete_one({"id": item_id})
    return {"ok": res.deleted_count == 1}

# ----- Bot status -----
@api.get("/bot/status")
async def bot_status(user=Depends(current_user)):
    return {
        "configured": bool(DISCORD_BOT_TOKEN),
        "guild_id": DISCORD_GUILD_ID,
        "log_channels": LOG_CHANNELS,
        "owner_id": OWNER_DISCORD_ID,
    }

# ---------- Mount ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await ensure_seed()
    log.info("Nexora API ready. Discord bot: %s | OAuth: %s",
             "configured" if DISCORD_BOT_TOKEN else "demo",
             "configured" if DISCORD_CLIENT_ID else "demo")

@app.on_event("shutdown")
async def on_shutdown():
    client.close()
