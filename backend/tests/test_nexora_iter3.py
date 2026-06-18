"""Iteration 3 tests: Roblox OAuth url, bot/health, dash-roles CRUD, assign-role,
role-links CRUD, authorities grant/revoke, game/authority+permissions+punishment,
game/info, /privacy alias."""
import os
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
    token = data["token"]
    user = data["user"]
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    perms = requests.get(f"{API}/permissions", headers=h).json()["permissions"]
    if set(user.get("permissions", [])) != set(perms):
        requests.put(f"{API}/users/{user['id']}/permissions", headers=h,
                     json={"permissions": perms, "roles": ["owner"]})
    return token, user


@pytest.fixture(scope="module")
def owner_client(owner_token):
    token, _ = owner_token
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json", "Authorization": f"Bearer {token}"})
    return s


@pytest.fixture(scope="module")
def game_key(owner_client):
    r = owner_client.get(f"{API}/game/info")
    assert r.status_code == 200, r.text
    d = r.json()
    key = d.get("game_api_key")
    assert isinstance(key, str) and len(key) > 0
    return key


# ---------- Roblox OAuth URL ----------
def test_roblox_oauth_url_configured():
    r = requests.get(f"{API}/auth/roblox/url", params={"redirect": "https://example.com/cb"})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["configured"] is True
    assert isinstance(d["url"], str)
    assert "apis.roblox.com/oauth/v1/authorize" in d["url"]
    assert "client_id=" in d["url"]
    assert "redirect_uri=" in d["url"]


# ---------- Bot health ----------
def test_bot_health(owner_client):
    r = owner_client.get(f"{API}/bot/health")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("running") is True
    assert d.get("token_configured") is True


# ---------- Dash roles CRUD ----------
def test_dash_roles_crud(owner_client):
    payload = {"name": "TEST_DashRole", "permissions": ["players.view"], "color": "#ff00ff"}
    r = owner_client.post(f"{API}/catalog/dash-roles", json=payload)
    assert r.status_code == 200, r.text
    created = r.json()
    rid = created["id"]
    assert created["name"] == payload["name"]
    assert created["permissions"] == payload["permissions"]

    items = owner_client.get(f"{API}/catalog/dash-roles").json()["items"]
    assert any(i["id"] == rid for i in items)

    upd = {"id": rid, "name": "TEST_DashRole_Upd", "permissions": ["players.view", "players.edit"], "color": "#00ffaa"}
    r = owner_client.put(f"{API}/catalog/dash-roles/{rid}", json=upd)
    assert r.status_code == 200
    items = owner_client.get(f"{API}/catalog/dash-roles").json()["items"]
    found = next(i for i in items if i["id"] == rid)
    assert found["name"] == "TEST_DashRole_Upd"
    assert set(found["permissions"]) == {"players.view", "players.edit"}

    r = owner_client.delete(f"{API}/catalog/dash-roles/{rid}")
    assert r.status_code == 200
    items = owner_client.get(f"{API}/catalog/dash-roles").json()["items"]
    assert not any(i["id"] == rid for i in items)


def test_assign_role_to_user(owner_client, owner_token):
    _, user = owner_token
    # Create a role
    payload = {"name": "TEST_AssignRole", "permissions": ["players.view", "settings.manage"], "color": None}
    r = owner_client.post(f"{API}/catalog/dash-roles", json=payload)
    assert r.status_code == 200
    rid = r.json()["id"]

    # Assign role
    r = owner_client.post(f"{API}/users/{user['id']}/assign-role", json={"role_id": rid})
    assert r.status_code == 200, r.text

    # Verify perms were applied (read users list)
    users = owner_client.get(f"{API}/users").json()["users"]
    me = next(u for u in users if u["id"] == user["id"])
    assert me.get("dash_role_id") == rid
    assert me.get("dash_role_name") == "TEST_AssignRole"
    assert set(payload["permissions"]).issubset(set(me.get("permissions", [])))

    # cleanup: clear role assignment and delete role
    owner_client.post(f"{API}/users/{user['id']}/assign-role", json={"role_id": None})
    # restore full owner perms
    perms = owner_client.get(f"{API}/permissions").json()["permissions"]
    owner_client.put(f"{API}/users/{user['id']}/permissions",
                     json={"permissions": perms, "roles": ["owner"]})
    owner_client.delete(f"{API}/catalog/dash-roles/{rid}")


# ---------- Role links CRUD ----------
def test_role_links_crud(owner_client):
    payload = {
        "roblox_rank": 100, "roblox_rank_name": "TEST_Rank",
        "discord_role_id": "1234567890", "dash_role_id": None, "authority": False,
    }
    r = owner_client.post(f"{API}/catalog/role-links", json=payload)
    assert r.status_code == 200, r.text
    created = r.json()
    lid = created["id"]
    assert created["roblox_rank_name"] == "TEST_Rank"
    assert created["discord_role_id"] == "1234567890"

    items = owner_client.get(f"{API}/catalog/role-links").json()["items"]
    assert any(i["id"] == lid for i in items)

    r = owner_client.delete(f"{API}/catalog/role-links/{lid}")
    assert r.status_code == 200
    items = owner_client.get(f"{API}/catalog/role-links").json()["items"]
    assert not any(i["id"] == lid for i in items)


# ---------- Authorities grant/revoke ----------
def test_authorities_grant_builderman(owner_client):
    r = owner_client.post(f"{API}/authorities/grant",
                          json={"roblox_username": "Builderman", "rank": "Manager"})
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["roblox_username"] == "Builderman"
    assert doc["rank"] == "Manager"
    assert doc["roblox_user_id"] == 156
    assert doc["active"] is True
    aid = doc["id"]

    # revoke
    r = owner_client.post(f"{API}/authorities/{aid}/revoke")
    assert r.status_code == 200
    # verify list shows active=false
    items = owner_client.get(f"{API}/authorities").json().get("items", [])
    match = [a for a in items if a.get("id") == aid]
    if match:
        assert match[0].get("active") is False


# ---------- Game-facing API ----------
def test_game_authority_requires_key():
    r = requests.get(f"{API}/game/authority", params={"username": "Builderman"})
    assert r.status_code == 401


def test_game_authority_with_key(owner_client, game_key):
    # Ensure there is an active authority for Builderman
    owner_client.post(f"{API}/authorities/grant",
                      json={"roblox_username": "Builderman", "rank": "Manager"})
    r = requests.get(f"{API}/game/authority",
                     params={"username": "Builderman"},
                     headers={"X-Nexora-Game-Key": game_key})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("authority") == "Manager"
    rec = d.get("record")
    assert rec is not None
    assert rec.get("roblox_user_id") == 156
    assert rec.get("rank") == "Manager"


def test_game_permissions_with_key(owner_client, game_key):
    r = requests.get(f"{API}/game/permissions",
                     params={"username": "Builderman"},
                     headers={"X-Nexora-Game-Key": game_key})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "permissions" in d
    assert isinstance(d["permissions"], list)


def test_game_permissions_requires_key():
    r = requests.get(f"{API}/game/permissions", params={"username": "Builderman"})
    assert r.status_code == 401


def test_game_punishment_create(owner_client, game_key):
    payload = {"target": "TEST_GamePunishTarget", "type": "Warning",
               "reason": "TEST_iter3_reason", "by": "TestSuite"}
    r = requests.post(f"{API}/game/punishment", json=payload,
                      headers={"X-Nexora-Game-Key": game_key})
    assert r.status_code == 200, r.text
    doc = r.json()
    assert doc["target"] == "TEST_GamePunishTarget"
    assert doc["type"] == "Warning"
    assert doc["reason"] == "TEST_iter3_reason"
    assert doc["status"] == "active"
    assert "id" in doc


def test_game_punishment_requires_key():
    r = requests.post(f"{API}/game/punishment", json={"target": "x", "type": "Warning"})
    assert r.status_code == 401


def test_game_info_owner(owner_client):
    r = owner_client.get(f"{API}/game/info")
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d.get("game_api_key"), str) and len(d["game_api_key"]) > 0
    eps = d.get("endpoints") or {}
    for k in ("authority", "permissions", "punishment"):
        assert k in eps


def test_game_info_requires_owner_perm():
    r = requests.get(f"{API}/game/info")
    assert r.status_code == 401


# ---------- /privacy alias ----------
def test_privacy_alias_route():
    # /privacy is a frontend alias for /privacy-policy; just ensure the frontend serves SPA index 200.
    base = BASE_URL
    r = requests.get(f"{base}/privacy", allow_redirects=True)
    # SPA returns 200 with HTML; tolerate 200 or 304
    assert r.status_code in (200, 304), f"expected SPA index, got {r.status_code}"
