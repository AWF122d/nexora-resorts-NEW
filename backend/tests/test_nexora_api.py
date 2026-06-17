"""Nexora Resorts backend API tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://nexora-admin-1.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def owner_token(session):
    r = session.post(f"{API}/auth/demo", json={"username": "Nexora Owner", "discord_id": "000000000000000000", "as_owner": True})
    assert r.status_code == 200
    data = r.json()
    assert "token" in data and "user" in data
    user = data["user"]
    token = data["token"]
    # In case a previous test run mutated perms, restore full owner perms
    s2 = requests.Session()
    s2.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    perms = s2.get(f"{API}/permissions").json()["permissions"]
    if set(user.get("permissions", [])) != set(perms):
        s2.put(f"{API}/users/{user['id']}/permissions", json={"permissions": perms, "roles": ["owner"]})
        user["permissions"] = perms
        user["roles"] = ["owner"]
    assert "owner" in user["roles"]
    assert len(user["permissions"]) >= 15
    return token, user


@pytest.fixture(scope="module")
def owner_client(session, owner_token):
    token, _ = owner_token
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


# ---------- Health ----------
def test_health(session):
    r = session.get(f"{API}/health")
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    assert d["bot"] == "demo"
    assert d["oauth"] == "demo"
    assert d["guild"] == "1508870679729013027"


# ---------- Auth ----------
def test_auth_me(owner_client, owner_token):
    _, user = owner_token
    r = owner_client.get(f"{API}/auth/me")
    assert r.status_code == 200
    assert r.json()["user"]["discord_id"] == user["discord_id"]


def test_auth_me_unauth(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_discord_oauth_url_demo(session):
    r = session.get(f"{API}/auth/discord/url")
    assert r.status_code == 200
    d = r.json()
    assert d["configured"] is False
    assert d["url"] is None


# ---------- Rooms ----------
def test_rooms_seeded(session):
    r = session.get(f"{API}/rooms")
    assert r.status_code == 200
    rooms = r.json()["rooms"]
    names = {x["name"] for x in rooms}
    assert {"Ocean Suite", "Garden Villa", "Presidential Penthouse"} <= names


# ---------- Bookings ----------
def test_booking_flow(owner_client, session):
    rooms = session.get(f"{API}/rooms").json()["rooms"]
    room_id = rooms[0]["id"]
    # create
    r = owner_client.post(f"{API}/bookings", json={"room_id": room_id})
    assert r.status_code == 200
    bk = r.json()
    assert bk["status"] == "confirmed"
    assert bk["room_id"] == room_id
    assert isinstance(bk["room_number"], int) and bk["room_number"] >= 101
    bid = bk["id"]
    # list
    r = owner_client.get(f"{API}/bookings")
    assert r.status_code == 200
    assert any(b["id"] == bid for b in r.json()["bookings"])
    # cancel
    r = owner_client.post(f"{API}/bookings/{bid}/cancel")
    assert r.status_code == 200
    # verify cancelled
    r = owner_client.get(f"{API}/bookings")
    assert any(b["id"] == bid and b["status"] == "cancelled" for b in r.json()["bookings"])


# ---------- Permissions / Users ----------
def test_permissions_list(owner_client):
    r = owner_client.get(f"{API}/permissions")
    assert r.status_code == 200
    perms = r.json()["permissions"]
    assert len(perms) >= 15
    assert "settings.manage" in perms


def test_users_owner_access_and_update(owner_client, owner_token):
    r = owner_client.get(f"{API}/users")
    assert r.status_code == 200
    users = r.json()["users"]
    assert len(users) >= 1
    # update perms on owner self
    _, me = owner_token
    new_perms = ["dashboard.view", "bookings.create", "settings.manage"]
    r = owner_client.put(f"{API}/users/{me['id']}/permissions", json={"permissions": new_perms, "roles": ["owner"]})
    assert r.status_code == 200
    # verify
    r = owner_client.get(f"{API}/users")
    user = next(u for u in r.json()["users"] if u["id"] == me["id"])
    assert set(user["permissions"]) == set(new_perms)
    # restore full owner perms for downstream tests
    full = owner_client.get(f"{API}/permissions").json()["permissions"]
    owner_client.put(f"{API}/users/{me['id']}/permissions", json={"permissions": full, "roles": ["owner"]})


def test_users_unauth(session):
    r = session.get(f"{API}/users")
    assert r.status_code == 401


# ---------- Settings ----------
def test_settings_get_and_update(owner_client):
    r = owner_client.get(f"{API}/settings")
    assert r.status_code == 200
    s = r.json()["settings"]
    assert "log_channels" in s and "guild_id" in s and "bot_status" in s
    # update
    r = owner_client.put(f"{API}/settings", json={"roblox_group_id": "TEST_12345"})
    assert r.status_code == 200
    r = owner_client.get(f"{API}/settings")
    assert r.json()["settings"]["roblox_group_id"] == "TEST_12345"


# ---------- Collections ----------
@pytest.mark.parametrize("name", ["punishments", "events", "sessions", "authorities", "forum_threads", "hosted_bots"])
def test_collections_crud(owner_client, name):
    # list (initial)
    r = owner_client.get(f"{API}/collections/{name}")
    assert r.status_code == 200
    # create
    payload = {"title": f"TEST_{name}", "note": "auto-test"}
    r = owner_client.post(f"{API}/collections/{name}", json=payload)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["created_by"] == "Nexora Owner"
    assert "id" in doc
    item_id = doc["id"]
    # list contains
    r = owner_client.get(f"{API}/collections/{name}")
    assert any(it["id"] == item_id for it in r.json()["items"])
    # delete
    r = owner_client.delete(f"{API}/collections/{name}/{item_id}")
    assert r.status_code == 200
    assert r.json()["ok"] is True


def test_collections_unknown(owner_client):
    r = owner_client.get(f"{API}/collections/unknown_xyz")
    assert r.status_code == 404


# ---------- Permission gating ----------
def test_non_owner_cannot_access_users(session):
    # Create a non-owner demo user
    r = session.post(f"{API}/auth/demo", json={"username": "TEST_Member", "discord_id": "111111111111111111", "as_owner": False})
    assert r.status_code == 200
    token = r.json()["token"]
    u = r.json()["user"]
    assert "owner" not in u["roles"]
    s2 = requests.Session()
    s2.headers.update({"Authorization": f"Bearer {token}"})
    r = s2.get(f"{API}/users")
    assert r.status_code == 403
