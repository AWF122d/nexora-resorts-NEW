"""Discord bot worker for Nexora Resorts.

Runs as a background asyncio task started by FastAPI lifespan. Exposes
helper functions used by API handlers to post embeds and DMs.
"""
from __future__ import annotations
import asyncio, logging, os
from typing import Optional, List, Dict, Any

import discord
from discord.ext import commands

log = logging.getLogger("nexora.bot")

_intents = discord.Intents.default()
_intents.message_content = False
_intents.members = False
_intents.guilds = True

bot = commands.Bot(command_prefix="!", intents=_intents)

GUILD_ID = int(os.environ.get("DISCORD_GUILD_ID") or 0) or None
LOG_CHANNELS = {
    "ranking": int(os.environ.get("LOG_CHANNEL_RANKING") or 0) or None,
    "admin_ingame": int(os.environ.get("LOG_CHANNEL_ADMIN_INGAME") or 0) or None,
    "punishment": int(os.environ.get("LOG_CHANNEL_PUNISHMENT") or 0) or None,
    "authority": int(os.environ.get("LOG_CHANNEL_AUTHORITY") or 0) or None,
    "sessions": int(os.environ.get("LOG_CHANNEL_SESSIONS") or 0) or None,
    "events": int(os.environ.get("LOG_CHANNEL_EVENTS") or 0) or None,
}
EVENT_PING_ROLE = int(os.environ.get("EVENT_PING_ROLE") or 0) or None

_started = False

@bot.event
async def on_ready():
    log.info("Nexora bot ready as %s (guilds=%s)", bot.user, [g.id for g in bot.guilds])
    try:
        if GUILD_ID:
            await bot.tree.sync(guild=discord.Object(id=GUILD_ID))
        else:
            await bot.tree.sync()
        log.info("Slash commands synced")
    except Exception as e:
        log.warning("Slash sync failed: %s", e)


# ---------- helpers ----------
async def _channel(kind: str) -> Optional[discord.TextChannel]:
    cid = LOG_CHANNELS.get(kind)
    if not cid:
        return None
    ch = bot.get_channel(cid)
    if not ch:
        try:
            ch = await bot.fetch_channel(cid)
        except Exception:
            return None
    return ch

def _e(title: str, color: int = 0x2563EB) -> discord.Embed:
    e = discord.Embed(title=title, color=color)
    e.set_footer(text="Nexora Resorts")
    return e

async def send_punishment_log(*, target: str, p_type: str, reason: str, issued_by: str) -> Optional[int]:
    ch = await _channel("punishment")
    if not ch: return None
    e = _e(f"NEXORA · {p_type}", 0x2563EB)
    e.add_field(name="Target", value=target, inline=True)
    e.add_field(name="Issued by", value=issued_by, inline=True)
    e.add_field(name="Reason", value=reason or "—", inline=False)
    m = await ch.send(embed=e)
    return m.id

async def reply_revert(channel_kind: str, message_id: int, *, by: str, note: str = ""):
    ch = await _channel(channel_kind)
    if not ch or not message_id: return
    try:
        msg = await ch.fetch_message(message_id)
        await msg.reply(f"↩️ Reverted by **{by}** {note}")
    except Exception as e:
        log.warning("revert reply failed: %s", e)

async def send_ranking_log(*, target: str, new_rank: str, by: str) -> Optional[int]:
    ch = await _channel("ranking")
    if not ch: return None
    e = _e("NEXORA · Rank change", 0x2563EB)
    e.add_field(name="User", value=target, inline=True)
    e.add_field(name="New rank", value=new_rank, inline=True)
    e.add_field(name="By", value=by, inline=False)
    m = await ch.send(embed=e)
    return m.id

async def send_authority_log(*, roblox_username: str, discord_id: str, rank: str, by: str) -> Optional[int]:
    ch = await _channel("authority")
    if not ch: return None
    from datetime import datetime, timezone
    e = _e("NEXORA · Authority granted", 0x2563EB)
    e.description = f"**{roblox_username}** `{discord_id}` granted authority **{rank}**\n"\
                    f"<t:{int(datetime.now(timezone.utc).timestamp())}:F>\nGranted by **{by}**"
    m = await ch.send(embed=e)
    return m.id

async def send_session_log(*, session_type: str, host: str, attendees_count: int,
                           co_hosts: List[str], support: List[str], supervisors: List[str],
                           phases: List[str], current_phase: int = 0,
                           join_link: Optional[str] = None,
                           subtitle: str = "Nexora Resorts") -> Optional[int]:
    """Posts the session embed. Returns the message id so it can be edited/deleted later."""
    ch = await _channel("sessions")
    if not ch:
        return None
    e = discord.Embed(
        title=f"Starting {session_type}",
        description=(f"**Starting**\n{attendees_count} Attendees\n"
                     f"Click **[here]({join_link})** to join the server." if join_link
                     else f"**Starting**\n{attendees_count} Attendees"),
        color=0x2563EB,  # blue
    )
    e.set_author(name="Nexora Sessions")

    # Build a structured "card" using fields so it visually mimics the requested layout.
    def _column(lines: List[str]) -> str:
        return "\n".join(lines) if lines else "—"

    high_command = []
    if host:        high_command.append("**Host**")
    for _ in supervisors: high_command.append("**Supervisor**")
    co = ["**Co-Host**" for _ in co_hosts]
    helpers = ["**Helper**" for _ in support]

    if any([high_command, co, helpers]):
        e.add_field(name=f"__{session_type}__", value=subtitle, inline=False)
        e.add_field(name="High Command", value=_column(high_command), inline=True)
        e.add_field(name="Co-Hosts",     value=_column(co),           inline=True)
        e.add_field(name="Helpers",      value=_column(helpers),      inline=True)

    if phases:
        chips = []
        for i, p in enumerate(phases):
            if i < current_phase:
                chips.append(f"~~{p}~~")
            elif i == current_phase:
                chips.append(f"**{p}**")
            else:
                chips.append(p)
        e.add_field(name="\u200b", value=" • ".join(chips), inline=False)

    e.set_footer(text="Nexora Resorts")
    m = await ch.send(embed=e)
    return m.id

async def update_session_embed(message_id: int, *, session_type: str, host: str,
                               attendees_count: int, co_hosts: List[str], support: List[str],
                               supervisors: List[str], phases: List[str], current_phase: int,
                               join_link: Optional[str] = None,
                               subtitle: str = "Nexora Resorts") -> bool:
    ch = await _channel("sessions")
    if not ch or not message_id: return False
    try:
        msg = await ch.fetch_message(message_id)
        new_id = await send_session_log(
            session_type=session_type, host=host, attendees_count=attendees_count,
            co_hosts=co_hosts, support=support, supervisors=supervisors,
            phases=phases, current_phase=current_phase, join_link=join_link, subtitle=subtitle,
        )
        # Build the same embed but use msg.edit so we keep the message id
        if new_id:
            # Edit existing using fresh embed
            sent = await ch.fetch_message(new_id)
            await msg.edit(embed=sent.embeds[0])
            await sent.delete()
        return True
    except Exception as e:
        log.warning("update_session_embed failed: %s", e)
        return False

async def delete_session_message(message_id: int):
    ch = await _channel("sessions")
    if not ch or not message_id: return
    try:
        msg = await ch.fetch_message(message_id)
        await msg.delete()
    except Exception as e:
        log.warning("session delete failed: %s", e)

async def send_event_log(*, title: str, when: str, host: str, co_host: Optional[str],
                         supervisor: Optional[str], description: str, game_link: Optional[str]) -> Optional[int]:
    ch = await _channel("events")
    if not ch: return None
    e = _e(f"NEXORA EVENTS · {title}", 0xF59E0B)
    e.description = description or ""
    e.add_field(name="When", value=when, inline=True)
    e.add_field(name="Host", value=host, inline=True)
    if co_host:    e.add_field(name="Co-Host", value=co_host, inline=True)
    if supervisor: e.add_field(name="Supervisor", value=supervisor, inline=True)
    e.add_field(name="Game Link", value=game_link or "Will be posted at time of event.", inline=False)
    m = await ch.send(embed=e)
    return m.id

async def edit_event_with_link(message_id: int, game_link: str):
    ch = await _channel("events")
    if not ch or not message_id: return
    try:
        msg = await ch.fetch_message(message_id)
        if msg.embeds:
            emb = msg.embeds[0]
            new = discord.Embed.from_dict(emb.to_dict())
            # replace last field "Game Link"
            new._fields = []  # rebuild
            for f in emb.fields:
                if f.name == "Game Link":
                    new.add_field(name="Game Link", value=game_link, inline=False)
                else:
                    new.add_field(name=f.name, value=f.value, inline=f.inline)
            await msg.edit(embed=new)
            if EVENT_PING_ROLE:
                await msg.reply(f"<@&{EVENT_PING_ROLE}> game link posted.")
    except Exception as e:
        log.warning("event edit failed: %s", e)

async def dm_user(discord_user_id: str, *, content: Optional[str] = None,
                  embed: Optional[discord.Embed] = None, view: Optional[discord.ui.View] = None) -> bool:
    try:
        user = await bot.fetch_user(int(discord_user_id))
        await user.send(content=content, embed=embed, view=view)
        return True
    except Exception as e:
        log.warning("DM failed for %s: %s", discord_user_id, e)
        return False

class BookingView(discord.ui.View):
    def __init__(self, *, game_link: Optional[str], booking_id: str):
        super().__init__(timeout=None)
        if game_link:
            self.add_item(discord.ui.Button(label="Enter the resort", url=game_link, style=discord.ButtonStyle.link))
        self.add_item(BookingCancelButton(booking_id))

class BookingCancelButton(discord.ui.Button):
    def __init__(self, booking_id: str):
        super().__init__(label="Cancel booking", style=discord.ButtonStyle.danger, custom_id=f"cancel:{booking_id}")
        self.booking_id = booking_id
    async def callback(self, interaction: discord.Interaction):
        confirm = discord.ui.View(timeout=60)
        async def yes(i): await i.response.edit_message(content="Booking cancelled.", view=None)
        async def no(i):  await i.response.edit_message(content="Cancellation aborted.", view=None)
        y = discord.ui.Button(label="Yes, cancel", style=discord.ButtonStyle.danger); y.callback = yes
        n = discord.ui.Button(label="Keep booking", style=discord.ButtonStyle.secondary); n.callback = no
        confirm.add_item(y); confirm.add_item(n)
        await interaction.response.send_message("Are you sure you want to cancel this booking?", view=confirm, ephemeral=True)

async def dm_booking(*, discord_user_id: str, mention: str, room_number: int,
                     game_link: Optional[str], booking_id: str) -> bool:
    e = _e("Your Booking has been successful!", 0x10B981)
    e.description = (f"Hello {mention}, we are here today informing you that your booking of "
                     f"**Room {room_number}** has been successful.\n\nWe hope to see you soon,\nNexora Booking.")
    view = BookingView(game_link=game_link, booking_id=booking_id)
    return await dm_user(discord_user_id, embed=e, view=view)

# ---------- slash commands ----------
@bot.tree.command(name="book", description="Book a Nexora room by type.")
async def book_cmd(interaction: discord.Interaction, room_type: str):
    from server import db, Booking  # late import to avoid circular
    # find a room by name (case-insensitive)
    room = await db.rooms.find_one({"name": {"$regex": f"^{room_type}$", "$options": "i"}}, {"_id": 0})
    if not room:
        await interaction.response.send_message(f"No room type **{room_type}** found.", ephemeral=True)
        return
    count = await db.bookings.count_documents({})
    user = await db.users.find_one({"discord_id": str(interaction.user.id)}, {"_id": 0})
    username = user["username"] if user else interaction.user.display_name
    bk = Booking(
        user_discord_id=str(interaction.user.id), user_username=username,
        room_id=room["id"], room_name=room["name"], room_number=100 + count + 1,
    )
    await db.bookings.insert_one(bk.model_dump())
    await dm_booking(
        discord_user_id=str(interaction.user.id),
        mention=interaction.user.mention,
        room_number=bk.room_number,
        game_link=None, booking_id=bk.id,
    )
    await interaction.response.send_message(f"Booking confirmed — Room {bk.room_number}. Check your DMs.", ephemeral=True)

@bot.tree.command(name="ping", description="Ping the Nexora bot.")
async def ping_cmd(interaction: discord.Interaction):
    await interaction.response.send_message(f"Pong · latency {round(bot.latency*1000)}ms", ephemeral=True)


# ---------- lifecycle ----------
async def start_bot():
    global _started
    if _started: return
    token = os.environ.get("DISCORD_BOT_TOKEN", "")
    if not token:
        log.info("Bot token not set — bot disabled.")
        return
    _started = True
    try:
        await bot.start(token)
    except Exception as e:
        log.exception("Bot crashed: %s", e)
        _started = False

def is_running() -> bool:
    return _started and not bot.is_closed()
