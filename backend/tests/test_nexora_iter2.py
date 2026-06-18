"""Iteration 2 tests: catalogs (session-types / room-types), Roblox lookup,
players/lookup aggregation, ingest endpoints, /activity, new permissions."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexora-admin-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def owner_token():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{API}/auth/demo", json={"username": "Nexora Owner", "discord_id": "000000000000000000", "as_owner": True})
    assert r.status_code == 200
    data = r.json()
    user = data["user"]
    token = data["token"]
    # restore full perms (in case prior test mutated)
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    perms = requests.get(f"{API}/permissions", headers=h).json()["permissions"]
    if set(user.get("permissions", [])) != set(perms):
        requests.put(f"{API}/users/{user['id']}/permissions", headers=h, json={"permissions": perms, "roles": ["owner"]})
    return token, user


@pytest.fixture(scope="module")
def owner_client(owner_token):
    token, _ = owner_token
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


# ---------- Health configured ----------
def test_health_configured():
    r = requests.get(f"{API}/health")
    assert r.status_code == 200
    d = r.json()
    assert d["bot"] == "configured", f"expected bot configured got {d}"
    assert d["oauth"] == "configured", f"expected oauth configured got {d}"


def test_discord_oauth_url_configured():
    r = requests.get(f"{API}/auth/discord/url")
    assert r.status_code == 200
    d = r.json()
    assert d["configured"] is True
    assert isinstance(d["url"], str) and "discord.com" in d["url"]


# ---------- New permissions ----------
def test_new_permissions_present(owner_client):
    r = owner_client.get(f"{API}/permissions")
    assert r.status_code == 200
    perms = r.json()["permissions"]
    assert "sessions.view_active" in perms
    assert "sessions.view_logs" in perms


# ---------- Session types catalog ----------
def test_session_types_seed_defaults(owner_client):
    r = owner_client.get(f"{API}/catalog/session-types")
    assert r.status_code == 200
    items = r.json()["items"]
    names = {i["name"] for i in items}
    for expected in ["Training", "Shift", "Tryouts", "Inspection", "Interview"]:
        assert expected in names, f"missing default {expected} in {names}"
    # phases/required_attendees structure
    for i in items:
        assert isinstance(i.get("phases"), list)
        assert isinstance(i.get("required_attendees"), int)
        assert "id" in i


def test_session_type_crud(owner_client):
    payload = {"name": "TEST_SessionType", "required_attendees": 3, "phases": ["A", "B"]}
    r = owner_client.post(f"{API}/catalog/session-types", json=payload)
    assert r.status_code == 200, r.text
    created = r.json()
    sid = created["id"]
    assert created["name"] == payload["name"]
    assert created["required_attendees"] == 3
    assert created["phases"] == ["A", "B"]

    # verify via GET list
    items = owner_client.get(f"{API}/catalog/session-types").json()["items"]
    assert any(i["id"] == sid for i in items)

    # update
    update = {"id": sid, "name": "TEST_SessionType_Upd", "required_attendees": 7, "phases": ["X", "Y", "Z"]}
    r = owner_client.put(f"{API}/catalog/session-types/{sid}", json=update)
    assert r.status_code == 200
    items = owner_client.get(f"{API}/catalog/session-types").json()["items"]
    upd = next(i for i in items if i["id"] == sid)
    assert upd["name"] == "TEST_SessionType_Upd"
    assert upd["required_attendees"] == 7
    assert upd["phases"] == ["X", "Y", "Z"]

    # delete
    r = owner_client.delete(f"{API}/catalog/session-types/{sid}")
    assert r.status_code == 200
    items = owner_client.get(f"{API}/catalog/session-types").json()["items"]
    assert not any(i["id"] == sid for i in items)


# ---------- Room types catalog ----------
def test_room_type_create_mirrors_rooms(owner_client):
    payload = {
        "name": "TEST_RoomType",
        "description": "auto-test",
        "image": "https://example.com/image.jpg",
        "checkmein_link": "https://checkmein.gg/test",
        "gamepass_id": "12345",
    }
    r = owner_client.post(f"{API}/catalog/room-types", json=payload)
    assert r.status_code == 200, r.text
    created = r.json()
    rid = created["id"]
    assert created["name"] == "TEST_RoomType"
    assert created["checkmein_link"] == "https://checkmein.gg/test"

    # Confirm in catalog list
    items = owner_client.get(f"{API}/catalog/room-types").json()["items"]
    assert any(i["id"] == rid for i in items)

    # Mirrored into /api/rooms (legacy)
    rooms = owner_client.get(f"{API}/rooms").json()["rooms"]
    assert any(r2["name"] == "TEST_RoomType" for r2 in rooms), "room-type should be mirrored into /api/rooms"

    # cleanup
    r = owner_client.delete(f"{API}/catalog/room-types/{rid}")
    assert r.status_code == 200


# ---------- Roblox lookup ----------
def test_roblox_user_lookup(owner_client):
    r = owner_client.get(f"{API}/roblox/user", params={"username": "Builderman"})
    assert r.status_code == 200, r.text
    d = r.json()
    u = d["user"]
    assert u["id"] == 156, f"expected Builderman id 156, got {u}"
    assert u["name"].lower() == "builderman"
    assert isinstance(u.get("avatar"), str) and u["avatar"].startswith("http")
    # group_role may be None if not in configured group, but key must exist
    assert "group_role" in d


def test_roblox_link_me(owner_client):
    r = owner_client.post(f"{API}/me/roblox/link", json={"username": "Builderman"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True
    assert d["roblox"]["name"].lower() == "builderman"

    # Verify persisted on current user
    me = owner_client.get(f"{API}/auth/me").json()["user"]
    assert me.get("roblox_username", "").lower() == "builderman"
    assert isinstance(me.get("roblox_avatar"), str)
    assert me.get("roblox_group_role") is not None


# ---------- Ingest endpoints ----------
def _ingest_secret(owner_client) -> str:
    r = owner_client.get(f"{API}/ingest/info")
    assert r.status_code == 200
    secret = r.json()["ingest_secret"]
    assert isinstance(secret, str) and len(secret) > 0, "INGEST_SECRET must be non-empty"
    return secret


def test_ingest_info_requires_owner():
    r = requests.get(f"{API}/ingest/info")
    assert r.status_code == 401


def test_ingest_chatlog_without_secret():
    r = requests.post(f"{API}/ingest/chatlog", json={
        "secret": "", "username": "TestPlayer", "message": "hi"
    })
    assert r.status_code == 401


def test_ingest_chatlog_with_secret(owner_client):
    secret = _ingest_secret(owner_client)
    r = requests.post(f"{API}/ingest/chatlog", json={
        "secret": secret, "username": "TestPlayer", "message": "TEST_chat_log_msg",
        "server_id": "srv1", "place_id": "pl1"
    })
    assert r.status_code == 200, r.text
    assert r.json()["ok"] is True


def test_ingest_adminlog_without_secret():
    r = requests.post(f"{API}/ingest/adminlog", json={
        "secret": "wrong", "username": "TestAdmin", "command": "kick"
    })
    assert r.status_code == 401


def test_ingest_adminlog_with_secret(owner_client):
    secret = _ingest_secret(owner_client)
    r = requests.post(f"{API}/ingest/adminlog", json={
        "secret": secret, "username": "TestPlayer", "command": "kick",
        "target": "BadGuy", "args": "spam"
    })
    assert r.status_code == 200
    assert r.json()["ok"] is True


# ---------- Players lookup (aggregation) ----------
def test_players_lookup_aggregation(owner_client):
    # Ensure a chat log exists for TestPlayer
    secret = _ingest_secret(owner_client)
    requests.post(f"{API}/ingest/chatlog", json={
        "secret": secret, "username": "TestPlayer", "message": "TEST_lookup_msg"
    })
    # small delay to ensure insert is visible
    time.sleep(0.3)

    r = owner_client.get(f"{API}/players/lookup", params={"username": "TestPlayer"})
    assert r.status_code == 200, r.text
    d = r.json()
    # Required keys
    for k in ("roblox", "group_role", "chat_logs", "admin_logs", "punishments", "sessions"):
        assert k in d, f"missing key {k}"
    assert isinstance(d["chat_logs"], list)
    messages = [c.get("message") for c in d["chat_logs"]]
    assert any("TEST_lookup_msg" in (m or "") for m in messages), f"ingested chat log missing: {messages[:5]}"

    # sessions buckets
    for bucket in ("hosted", "attended", "cohosted", "supervised"):
        assert bucket in d["sessions"]
        assert isinstance(d["sessions"][bucket], list)


def test_players_lookup_real_roblox_for_builderman(owner_client):
    r = owner_client.get(f"{API}/players/lookup", params={"username": "Builderman"})
    assert r.status_code == 200
    d = r.json()
    assert d["roblox"] is not None
    assert d["roblox"]["id"] == 156


# ---------- Activity ----------
def test_activity_feed(owner_client):
    r = owner_client.get(f"{API}/activity")
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d.get("items"), list)
    # if list non-empty, items should have a 'kind' from the union set
    allowed = {"booking", "punishment", "event", "session", "authority"}
    for it in d["items"][:10]:
        assert it.get("kind") in allowed
        assert "created_at" in it
